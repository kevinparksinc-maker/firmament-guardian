import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import type { ChartResult } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { MINI_SYNTHESIS_STYLE } from "./master-interpreter";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import type { MethodOutcome } from "./astrologyKnowledge/synthesis/types";
import type { VedicStrength } from "./astrologyKnowledge/vedic/strength";

// 180k ASCII-heavy characters stay below the provider's 272k token ceiling even
// at a conservative one-token-per-character upper bound.
const MAX_METHOD_PACKET_CHARS = 180_000;

function compactMethodOutcome(method: MethodOutcome) {
  const { canonApplications, findingJudgments, calculatedFindings, interpretation, judgment, ...metadata } = method;
  return {
    ...metadata,
    // Full calculated values remain in the returned ledger. The model receives
    // their stable IDs plus each specific, evidence-linked interpreted judgment.
    calculatedFindings: calculatedFindings.map(({ evidenceId, label }) => ({ evidenceId, label })),
    findingJudgments: findingJudgments.map(({ rules, ...finding }) => ({
      ...finding,
      canonApplicationIds: rules.map(rule => rule.canonEvidenceId),
    })),
    canonApplicationIds: canonApplications.map(application => application.canonEvidenceId),
  };
}

/** Build lossless, bounded packets from completed judgments, never a raw chart dump. */
export function buildMethodOutcomeBatches(
  snapshotId: string,
  mode: "natal" | "transit" | "combined",
  methods: MethodOutcome[],
  maxChars = MAX_METHOD_PACKET_CHARS
): Array<{ methodIds: string[]; content: string }> {
  if (!Number.isInteger(maxChars) || maxChars < 1)
    throw new Error("METHOD_MINI_READING_INVALID_BUDGET: maxChars must be a positive integer.");
  if (new Set(methods.map(method => method.methodId)).size !== methods.length)
    throw new Error("METHOD_MINI_READING_DUPLICATE_ID: Every method outcome must have a unique methodId.");
  const batches: Array<{ methodIds: string[]; content: string }> = [];
  let current: MethodOutcome[] = [];
  const packetFor = (batch: MethodOutcome[]) => stringifyEvidence({
    snapshotId,
    mode,
    methodOutcomes: batch.map(compactMethodOutcome),
    canonApplications: Array.from(new Map(
      batch.flatMap(method => method.canonApplications).map(application => [application.canonEvidenceId, application])
    ).values()),
  });
  const flush = () => {
    if (!current.length) return;
    batches.push({ methodIds: current.map(method => method.methodId), content: packetFor(current) });
    current = [];
  };
  for (const method of methods) {
    const candidate = [...current, method];
    if (packetFor(candidate).length <= maxChars) {
      current = candidate;
      continue;
    }
    if (!current.length)
      throw new Error(`METHOD_MINI_READING_TOO_LARGE: ${method.methodId} exceeds the ${maxChars}-character packet limit.`);
    flush();
    const single = packetFor([method]);
    if (single.length > maxChars)
      throw new Error(`METHOD_MINI_READING_TOO_LARGE: ${method.methodId} exceeds the ${maxChars}-character packet limit.`);
    current = [method];
  }
  flush();
  return batches;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Generate one evidence-bounded prose contribution per interpreted method. */
export async function generateMethodMiniReadings(
  snapshotId: string,
  mode: "natal" | "transit" | "combined",
  outcomes: MethodOutcome[]
): Promise<Record<string, string>> {
  const interpreted = outcomes.filter(outcome => outcome.status === "interpreted");
  const readings: Record<string, string> = {};
  if (!interpreted.length) return readings;
  const batches = buildMethodOutcomeBatches(snapshotId, mode, interpreted);
  const responses = await mapWithConcurrency(batches, 2, async batch => {
    const response = await invokeLLM({
      max_tokens: 8192,
      timeoutMs: 180_000,
      messages: [
        { role: "system", content: MINI_SYNTHESIS_STYLE + "\nWrite a concise, specific second-person interpretation for EACH supplied method outcome. Explain WHAT, WHY, HOW and CONSEQUENCE using its calculated findings and attached Canon applications. Method judgments and supplied Canon are authoritative. Do not recalculate chart facts, infer or substitute doctrine, replace judgments, or invent missing methods or records. Respect each outcome's status, chart scope, frame, and evidence IDs. Return ONLY a JSON object mapping every exact supplied method ID to finished prose." },
        { role: "user", content: batch.content },
      ],
    });
    const content = response.choices?.[0]?.message.content;
    const raw = typeof content === "string" ? content : (content ?? []).filter(part => part.type === "text").map(part => (part as { text: string }).text).join("");
    let parsed: unknown;
    try { parsed = JSON.parse(raw.trim()); }
    catch { throw new Error("METHOD_MINI_READING_INVALID: AI response was not valid JSON."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("METHOD_MINI_READING_INVALID: Expected per-method prose.");
    const object = parsed as Record<string, unknown>;
    const returnedIds = Object.keys(object);
    if (returnedIds.length !== batch.methodIds.length || returnedIds.some(id => !batch.methodIds.includes(id)))
      throw new Error("METHOD_MINI_READING_INVALID: Response method IDs did not exactly match the supplied batch.");
    const result: Record<string, string> = {};
    for (const methodId of batch.methodIds) {
      const reading = object[methodId];
      if (typeof reading !== "string" || !reading.trim())
        throw new Error("METHOD_MINI_READING_MISSING: " + methodId);
      result[methodId] = reading.trim();
    }
    return result;
  });
  for (const response of responses) Object.assign(readings, response);
  return readings;
}

/** The chart and final narrator consume the same judged methods. */
export async function buildChartMethodOutcomes(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined"
) {
  const { snapshot, synthesis } = await synthesizeChartForReading(
    chart,
    mode,
    "Show each method's own calculated outcome before whole-chart synthesis."
  );
  const layers = [
    ...snapshot.methodExecutionLedger,
    ...(snapshot.transit?.framework?.methodExecutionLedger ?? []).map(
      layer => ({ ...layer, id: `transit:${layer.id}` })
    ),
  ];
  const byId = new Map(layers.map(layer => [layer.id, layer]));
  const miniReadings = await generateMethodMiniReadings(synthesis.snapshotId, mode, synthesis.methodOutcomes);

  return {
    snapshotId: synthesis.snapshotId,
    mode,
    methods: synthesis.methodOutcomes.map(outcome => {
      const layer = byId.get(outcome.methodId);
      if (!layer)
        throw new Error(`METHOD_OUTPUT_MISSING: ${outcome.methodId} has no calculation record.`);
      return {
        ...outcome,
        aiMiniReading: miniReadings[outcome.methodId] ?? null,
        formula: layer.technique,
        calculationVersion: layer.calculationVersion,
        prerequisites: layer.prerequisites,
        sourceIds: layer.sourceIds,
        planetStrength:
          outcome.methodId.replace(/^transit:/, "") === "vedic-shadbala"
            ? (layer.results as VedicStrength["planets"])
            : undefined,
        houseStrength:
          outcome.methodId.replace(/^transit:/, "") === "vedic-bhava-bala"
            ? (layer.results as VedicStrength["houses"])
            : undefined,
      };
    }),
    qualityAudit: synthesis.qualityAudit,
  };
}
