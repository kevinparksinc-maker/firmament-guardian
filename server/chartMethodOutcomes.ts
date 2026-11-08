import type { ChartResult } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { MINI_SYNTHESIS_STYLE } from "./master-interpreter";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import type { VedicStrength } from "./astrologyKnowledge/vedic/strength";

/** The chart and final narrator consume the same judged methods, without another AI request. */
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
  const interpreted = synthesis.methodOutcomes.filter(m => m.status === "interpreted");
  const miniReadings: Record<string, string> = {};
  if (interpreted.length) {
    const response = await invokeLLM({
      max_tokens: 8192,
      timeoutMs: 180_000,
      messages: [
        { role: "system", content: MINI_SYNTHESIS_STYLE + "\nWrite a unique, direct second-person mini reading for EACH method. Each must be a substantial paragraph explaining WHAT, WHY, HOW and CONSEQUENCE. Interpret the calculated findings using all relevant chart layers and Canon. No dictionary definitions, copied technical judgments or repeated generic text. Respond ONLY as a JSON object mapping exact method IDs to finished prose. Do not invent calculations." },
        { role: "user", content: JSON.stringify({ snapshot, canon: synthesis.canonApplications, methods: interpreted.map(m => ({ id: m.methodId, name: m.methodName, findings: m.calculatedFindings, judgments: m.findingJudgments })) }) },
      ],
    });
    const content = response.choices?.[0]?.message.content;
    const raw = typeof content === "string" ? content : (content ?? []).filter(p => p.type === "text").map(p => (p as { text: string }).text).join("");
    let parsed: unknown;
    try { parsed = JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g, "")); }
    catch { throw new Error("METHOD_MINI_READING_INVALID: AI response was not valid JSON."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("METHOD_MINI_READING_INVALID: Expected per-method prose.");
    for (const method of interpreted) {
      const reading = (parsed as Record<string, unknown>)[method.methodId];
      if (typeof reading !== "string" || !reading.trim()) throw new Error("METHOD_MINI_READING_MISSING: " + method.methodId);
      miniReadings[method.methodId] = reading.trim();
    }
  }

  return {
    snapshotId: synthesis.snapshotId,
    mode,
    methods: synthesis.methodOutcomes.map(outcome => {
      const layer = byId.get(outcome.methodId);
      if (!layer)
        throw new Error(
          `METHOD_OUTPUT_MISSING: ${outcome.methodId} has no calculation record.`
        );
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
