import { createHash } from "node:crypto";
import type { ChartResult } from "./astronomy";
import { runInterpretation } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { MINI_SYNTHESIS_STYLE } from "./master-interpreter";
import { scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { packCompactSynthesisForLLM } from "./astrologyKnowledge/synthesis/context";
import type { VedicStrength } from "./astrologyKnowledge/vedic/strength";

type VerifiedSynthesis = Awaited<ReturnType<typeof synthesizeChartForReading>>;

async function executeBuildChartMethodOutcomes(
  snapshot: VerifiedSynthesis["snapshot"],
  synthesis: VerifiedSynthesis["synthesis"],
  mode: "natal" | "transit" | "combined"
) {
  const layers = [
    ...snapshot.methodExecutionLedger,
    ...(snapshot.transit?.framework?.methodExecutionLedger ?? []).map(
      layer => ({ ...layer, id: `transit:${layer.id}` })
    ),
  ];
  const byId = new Map(layers.map(layer => [layer.id, layer]));
  const interpreted = synthesis.methodOutcomes.filter(
    m => m.calculatedFindings.length || m.findingJudgments.length
  );
  const miniReadings: Record<string, string> = {};
  if (interpreted.length) {
    const compactPayload = packCompactSynthesisForLLM(synthesis, {
      maxJudgmentChars: 130,
      maxVargaRows: 4,
      maxTransitRows: 12,
      maxHouseRows: 8,
      maxOtherRows: 5,
    });
    const response = await runInterpretation("METHOD_MINIS", synthesis, {
      max_tokens: 8192,
      timeoutMs: 120_000,
      messages: [
        {
          role: "system",
          content:
            MINI_SYNTHESIS_STYLE +
            "\nWrite a unique, candid second-person mini reading for EACH requested method ID. Read the dossier silently and show what the pattern looks like in ordinary daily life—what you do, what comes naturally that people rely on you for, and what tension or cost shows up alongside it. Keep ALL astrology terminology out of the reading strings (never name planets, zodiac signs, houses, degrees, aspects, lunar mansions, bounds, faces, or Lots). No bullet lists, boilerplate, or generic encouragement. Respond ONLY as a JSON object mapping exact method IDs to finished prose. Do not invent calculations.",
        },
        {
          role: "user",
          content: JSON.stringify({
            ...compactPayload,
            requestedMethodIds: interpreted.map(m => m.methodId),
          }),
        },
      ],
    });
    const content = response.choices?.[0]?.message.content;
    const raw =
      typeof content === "string"
        ? content
        : (content ?? [])
            .filter(p => p.type === "text")
            .map(p => (p as { text: string }).text)
            .join("");
    const parsed = JSON.parse(
      raw.trim().replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "")
    );
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const method of interpreted) {
        const reading = (parsed as Record<string, unknown>)[method.methodId];
        if (typeof reading === "string" && reading.trim().length >= 60) {
          const scrubbed = scrubNonHoraryAstrologyJargon(reading.trim());
          if (scrubbed) miniReadings[method.methodId] = scrubbed;
        }
      }
    }
    if (Object.keys(miniReadings).length !== interpreted.length)
      throw new Error("METHOD_MINIS_INCOMPLETE: The provider did not return every requested reading.");
    if (new Set(Object.values(miniReadings)).size !== interpreted.length)
      throw new Error("METHOD_MINIS_DUPLICATE: The provider repeated a method reading.");
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

type MethodOutcomesResult = Awaited<
  ReturnType<typeof executeBuildChartMethodOutcomes>
>;

const methodOutcomesCache = new Map<
  string,
  { expiresAt: number; promise: Promise<MethodOutcomesResult> }
>();

/** The chart and final narrator consume the same judged methods, with compact cached AI mini readings. */
export async function buildChartMethodOutcomes(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined"
) {
  const { snapshot, synthesis } = await synthesizeChartForReading(
    chart,
    mode,
    "Show each method's own calculated outcome before whole-chart synthesis."
  );

  const cacheKey = createHash("sha256")
    .update(`${synthesis.snapshotId}:${mode}`)
    .digest("hex");
  const cached = methodOutcomesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = executeBuildChartMethodOutcomes(snapshot, synthesis, mode);
  methodOutcomesCache.set(cacheKey, {
    expiresAt: Date.now() + 30 * 60_000,
    promise,
  });
  while (methodOutcomesCache.size > 24) {
    methodOutcomesCache.delete(methodOutcomesCache.keys().next().value!);
  }
  try {
    return await promise;
  } catch (err) {
    if (methodOutcomesCache.get(cacheKey)?.promise === promise) {
      methodOutcomesCache.delete(cacheKey);
    }
    throw err;
  }
}
