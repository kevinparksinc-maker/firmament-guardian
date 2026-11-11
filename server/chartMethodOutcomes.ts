import type { ChartResult } from "./astronomy";
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
  // Return all registered methods immediately, without a blocking AI request.
  // The whole-chart synthesizer is responsible for AI interpretation.
  // Per-method calculation records and canonical judgments remain complete.
  const miniReadings: Record<string, string> = {};

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
