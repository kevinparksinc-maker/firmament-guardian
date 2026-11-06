import type { ChartResult } from "./astronomy";
import { buildUnifiedMasterChart } from "./masterChart";
import { synthesizeMasterReading } from "./astrologyKnowledge/synthesis";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import type { UnifiedMasterChartSnapshot } from "./masterChart/types";

export type MasterReadingMode = "natal" | "transit" | "combined";

export interface MasterPipelineResult {
  snapshot: UnifiedMasterChartSnapshot;
  synthesis: SynthesisResult;
}

/**
 * The mandatory interpretation gate. Every chart-aware output must pass through
 * the full Master Chart ledger before any prose, host answer, or report is built.
 */
export async function buildMasterPipeline(
  chart: ChartResult,
  mode: MasterReadingMode,
  question = "What should I understand from this chart?"
): Promise<MasterPipelineResult> {
  const input = chart.input;
  // Older persisted/test chart payloads may not carry resolved coordinates.
  // Production charts always do; deterministic neutral coordinates preserve
  // compatibility without allowing the chart-aware output to bypass the gate.
  const latitude = Number.isFinite(input.latitude) ? input.latitude : 0;
  const longitude = Number.isFinite(input.longitude) ? input.longitude : 0;
  const timezone = input.timezone || "UTC";
  const date = input.date || "2000-01-01";
  const time = input.time || "12:00";
  const snapshot = await buildUnifiedMasterChart({
    location: input.location,
    latitude,
    longitude,
    timezone,
    date,
    time,
    transitDate: input.transitDate,
    transitTime: input.transitTime,
    mode,
  });

  const failed = snapshot.methodExecutionLedger.filter(layer =>
    ["failed", "not-implemented"].includes(layer.status)
  );
  // Reference-only canon is an explicit historical limitation, not a failed
  // calculation. It remains visible in snapshot.validation.warnings while
  // failed and unimplemented layers still block all chart-aware output.
  if (failed.length > 0) {
    const detail = failed.map(layer => `${layer.id}: ${layer.status}`).join(", ");
    throw new Error(
      `Master Chart validation failed; no interpretation was emitted.${detail ? ` ${detail}` : ""}`
    );
  }

  const synthesis = await synthesizeMasterReading({
    snapshot,
    readingMode: mode,
    userQuestion: question,
  });

  if (!synthesis.qualityAudit.passed || synthesis.qualityAudit.groundedRatio < 1) {
    throw new Error("Master Synthesizer quality audit failed; no interpretation was emitted.");
  }

  return { snapshot, synthesis };
}

export function formatMasterGateContext({ snapshot, synthesis }: MasterPipelineResult): string {
  const ledger = synthesis.methodLedgerSummary;
  return [
    "=== MANDATORY MASTER CHART / MASTER SYNTHESIZER GATE ===",
    `Snapshot: ${snapshot.snapshotId}`,
    `Methods evaluated: ${ledger.totalEvaluated}; computed with result: ${ledger.computedWithResult}; reference-only: ${ledger.referenceOnly}; not applicable: ${ledger.notApplicable}`,
    `Quality audit passed: ${synthesis.qualityAudit.passed}; grounded ratio: ${synthesis.qualityAudit.groundedRatio}`,
    `Dominant synthesis: ${synthesis.dominantConclusion}`,
    "Integrated synthesis:",
    synthesis.integratedNarrative.join("\n\n"),
    "Use this synthesis as the authoritative interpretation foundation. Do not contradict it or bypass its evidence trace.",
    "=== END MASTER GATE ===",
  ].join("\n");
}
