import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
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
  const interpreted = synthesis.methodOutcomes.filter(m => m.calculatedFindings.length || m.findingJudgments.length);
  const miniReadings: Record<string, string> = {};

  // Keep every calculated method outcome regardless of AI availability.
  // Never dispatch the entire snapshot and Canon dossier to one model request.
  // Only the relevant, bounded outcome of each method is sent for language polishing.
  const groupSize = 3;
  for (let offset = 0; offset < interpreted.length; offset += groupSize) {
    const group = interpreted.slice(offset, offset + groupSize);
    try {
      const request = group.map(method => ({
        methodId: method.methodId,
        methodName: method.methodName,
        tradition: method.tradition,
        status: method.status,
        interpretation: method.interpretation,
        findings: method.findingJudgments.map(finding => ({
          subject: finding.subject,
          judgment: finding.judgment,
          strength: finding.strength,
          valence: finding.valence,
          limitation: finding.limitation,
        })),
        calculations: method.calculatedFindings.map(finding => ({
          label: finding.label,
          value: finding.calculatedValue,
        })),
      }));
      const response = await invokeLLM({
        max_tokens: 2400,
        messages: [
          {
            role: "system",
            content: MINI_SYNTHESIS_STYLE + "\\nProduce a grounded, distinct, second-person interpretation for EACH supplied method. Explain the real-life meaning, conditions and practical consequences. Use only the supplied findings and calculations. Keep technical values out of the public prose. Respond with a JSON object mapping every exact methodId to a substantial paragraph; no omissions.",
          },
          { role: "user", content: stringifyEvidence(request) },
        ],
      });
      const content = response.choices?.[0]?.message.content;
      const raw = typeof content === "string" ? content : (content ?? []).filter(p => p.type === "text").map(p => (p as { text: string }).text).join("");
      const cleaned = raw.trim().replace(/^\\x60{3}(?:json)?\\s*/i, "").replace(/\\s*\\x60{3}$/, "");
      const parsed: unknown = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("METHOD_MINI_READING_INVALID: Expected an object keyed by method ID.");
      for (const method of group) {
        const reading = (parsed as Record<string, unknown>)[method.methodId];
        if (typeof reading === "string" && reading.trim())
          miniReadings[method.methodId] = reading.trim();
        // The canonical calculated method interpretation remains in the result.
      }
    } catch (error) {
      console.warn("[MethodOutcomes] AI prose unavailable for one group; calculated methods preserved", {
        firstMethod: group[0]?.methodId,
        category: error instanceof Error ? error.message.slice(0, 100) : "unknown",
      });
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
