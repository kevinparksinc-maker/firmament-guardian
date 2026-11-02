import type { ChartResult } from "../../astronomy";
import { buildUnifiedMasterChart } from "../../masterChart/builder";
import { synthesizeMasterReading } from "./synthesizer";
import type { SynthesisResult } from "./types";

/** All ordinary chart readings enter through the same calculated method ledger. */
export async function synthesizeChartForReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined",
  question: string
): Promise<{ synthesis: SynthesisResult; context: string }> {
  const snapshot = await buildUnifiedMasterChart({ ...chart.input, mode });
  // Do not silently interpret a second chart if an earlier client chart differs.
  for (const body of chart.movingBodies) {
    const canonical = snapshot.baseCelestialState.planets.find(row => row.name === body.name);
    if (!canonical) throw new Error(`Master Chart is missing ${body.name}; cannot synthesize a divergent reading.`);
    const difference = Math.abs(((canonical.longitude - body.longitude + 540) % 360) - 180);
    if (difference > 0.01) throw new Error(`Master Chart mismatch for ${body.name}: ${difference.toFixed(4)}°. Refresh the chart before reading.`);
  }
  const synthesis = await synthesizeMasterReading({ snapshot, readingMode: mode, userQuestion: question });
  const context = [
    `UNIFIED MASTER SYNTHESIS — SNAPSHOT ${synthesis.snapshotId}`,
    `Computed methods: ${synthesis.methodLedgerSummary.computedWithResult} / ${synthesis.methodLedgerSummary.totalEvaluated}; quality audit: ${synthesis.qualityAudit.passed ? "passed" : "incomplete"}.`,
    `Dominant conclusion: ${synthesis.dominantConclusion}`,
    ...synthesis.themes.map(theme => `Theme ${theme.humanTheme}: ${theme.primaryConclusion}; evidence ${theme.evidenceIds.join(", ")}`),
    "CALCULATED METHOD FINDINGS (never present reference-only methods as calculated):",
    ...synthesis.methodFindings.map(method => `${method.id} [${method.status}; ${method.frame}; ${method.tradition}]: ${method.findings.map(f => `${f.label}: ${f.details}`).join("; ")}; evidence ${method.evidenceIds.join(", ")}`),
  ].join("\n");
  return { synthesis, context };
}
