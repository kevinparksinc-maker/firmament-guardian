import type { ChartResult } from "../../astronomy";
import { buildUnifiedMasterChart, getMasterNatalChart } from "../../masterChart/builder";
import { synthesizeMasterReading } from "./synthesizer";
import type { SynthesisResult } from "./types";

/** All ordinary chart readings enter through the same calculated method ledger. */
export async function synthesizeChartForReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined",
  question: string
): Promise<{ synthesis: SynthesisResult; context: string }> {
  const snapshot = mode === "natal" && chart.worldview === "agent-vs-god"
    ? await getMasterNatalChart({ ...chart.input, mode })
    : await buildUnifiedMasterChart({ ...chart.input, mode });
  // Do not silently interpret a second chart if an earlier client chart differs.
  for (const body of chart.movingBodies) {
    const canonical = snapshot.baseCelestialState.planets.find(row => row.name === body.name);
    if (!canonical) throw new Error(`Master Chart is missing ${body.name}; cannot synthesize a divergent reading.`);
    const difference = Math.abs(((canonical.longitude - body.longitude + 540) % 360) - 180);
    if (difference > 0.01) throw new Error(`Master Chart mismatch for ${body.name}: ${difference.toFixed(4)}°. Refresh the chart before reading.`);
  }
  const angularDifference = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  if (chart.ascendant && angularDifference(snapshot.baseCelestialState.ascendant.longitude, chart.ascendant.longitude) > 0.01) {
    throw new Error("Master Chart Ascendant mismatch. Refresh the chart before reading.");
  }
  if (chart.houses.length !== snapshot.baseCelestialState.houses.length ||
      chart.houses.some((cusp, index) => angularDifference(cusp, snapshot.baseCelestialState.houses[index].cusp) > 0.01)) {
    throw new Error("Master Chart equal-house cusp mismatch. Refresh the chart before reading.");
  }
  if (mode !== "natal" && (chart.transits.length > 0) !== Boolean(snapshot.transit?.planets.length)) {
    throw new Error("Master Chart transit coverage mismatch. Refresh the chart before reading.");
  }
  if (mode !== "natal" && chart.transits.length) {
    for (const transit of chart.transits) {
      const canonical = snapshot.transit?.planets.find(row => row.name === transit.name);
      if (!canonical || angularDifference(canonical.longitude, transit.longitude) > 0.01) {
        throw new Error(`Master Chart transit mismatch for ${transit.name}. Refresh the chart before reading.`);
      }
    }
  }
  const failedMethods = snapshot.methodExecutionLedger.filter(layer => layer.status === "failed");
  if (failedMethods.length > 0) {
    const failedIds = failedMethods.map(layer => layer.id).join(", ");
    console.error("[MASTER_METHOD_FAILED] Required calculated methods failed:", failedIds);
    throw new Error(`MASTER_METHOD_FAILED: Calculated method(s) failed: ${failedIds}.`);
  }
  const synthesis = await synthesizeMasterReading({ snapshot, readingMode: mode, userQuestion: question });
  if (!synthesis.qualityAudit.passed) {
    console.error("[SYNTHESIS_COVERAGE_FAILED] Uninterpreted calculated evidence:", synthesis.qualityAudit.unsupportedClaims);
    throw new Error("SYNTHESIS_COVERAGE_FAILED: Not all calculated evidence was incorporated into the synthesis.");
  }
  const context = [
    `UNIFIED MASTER SYNTHESIS — SNAPSHOT ${synthesis.snapshotId}`,
    `Computed methods: ${synthesis.methodLedgerSummary.computedWithResult} / ${synthesis.methodLedgerSummary.totalEvaluated}; quality audit: ${synthesis.qualityAudit.passed ? "passed" : "incomplete"}.`,
    `Dominant conclusion: ${synthesis.dominantConclusion}`,
    "PLANETARY PERSONALITY SYNTHESIS CONTRACT: Treat each planet as an individual chart-specific character, not a dictionary entry. For every relevant planet, synthesize its actual placement, house, available dignity/strength, decan, mansions, fixed-star contacts, aspects, receptions, dispositors, timing, and God/Agent frame differences. Do not claim a layer was calculated unless it appears in the method findings. Explain how layers MODIFY one another, including contradictions and limits; describe temperament, motivation, behavioral expression, strength, vulnerability, relational dynamics, and mature expression. Trace each meaningful conclusion to supplied evidence IDs. Present the chain WHAT → WHY → HOW → CONSEQUENCE → MEANING. Prioritize Mars when the question concerns Mars, Scorpio, will, anger, initiative, or courage; distinguish traditional Scorpio rulership by Mars from modern Pluto association. No generic planet-only paragraph may substitute for chart-specific synthesis.",
    "CANONICAL PLANET FACTS FOR CHARACTER PROFILES (do not invent missing traits):",
    ...snapshot.baseCelestialState.planets.map(planet => `Planet ${planet.name}: ${JSON.stringify(planet)}`),
    ...synthesis.themes.map(theme => `Theme ${theme.humanTheme}: ${theme.primaryConclusion}; evidence ${theme.evidenceIds.join(", ")}`),
    "CALCULATED METHOD FINDINGS (never present reference-only methods as calculated):",
    ...synthesis.methodFindings.map(method => `${method.id} [${method.status}; ${method.frame}; ${method.tradition}]: ${method.findings.map(f => `${f.label}: ${f.details}`).join("; ")}; evidence ${method.evidenceIds.join(", ")}`),
  ].join("\n");
  return { synthesis, context };
}
