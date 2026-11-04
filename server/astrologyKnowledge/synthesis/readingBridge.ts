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
    "VEDIC DIVISIONAL CHART READING: D1 is the natal foundation. D2 Hora describes resources, D3 Drekkana siblings and initiative, D9 Navamsha dharma and relational/planetary maturity, and D10 Dashamsha vocation. These charts are derived from natal longitudes, not separate astronomical recalculations. Compare specific planetary sign, divisional house and Ascendant placements against D1, explain convergence and tension, and quote formula evidence. Never invent uncomputed strength scores, Yogas or missing chart data. Do not confuse Guardian fixed-frame divisions with Lahiri-sidereal Jyotish.",
    "AUTHORITATIVE DERIVED DIVISIONAL CHART DATA:",
    ...((snapshot.layers["vedic-vargas-divisional"]?.results as Array<{ division: string; name: string; formula?: string; ascendant?: unknown; houses?: unknown; placements?: unknown }> | undefined) ?? []).map(v => `${v.division} ${v.name}: formula ${v.formula ?? "not supplied"}; ascendant ${JSON.stringify(v.ascendant)}; houses ${JSON.stringify(v.houses)}; placements ${JSON.stringify(v.placements)}`),
    "CANONICAL PLANET FACTS FOR CHARACTER PROFILES (do not invent missing traits):",
    ...snapshot.baseCelestialState.planets.map(planet => `Planet ${planet.name}: ${JSON.stringify(planet)}`),
    "INTERPRETED CROSS-METHOD THEMES (read these connections; do not substitute the inventory for interpretation):",
    ...synthesis.themes.map(theme => [
      `THEME ${theme.humanTheme} [${theme.id}]`,
      `WHAT: ${theme.primaryConclusion}`,
      `WHY/HOW: ${theme.whyHow}`,
      `CONSEQUENCE: ${theme.consequences}`,
      `MEANING: ${theme.deeperMeaning}`,
      `LINKED PROPOSITIONS: ${theme.linkedPropositionIds.join(", ")}`,
      `EVIDENCE: ${theme.evidenceIds.join(", ")}`,
    ].join("\\n")),
    "CONTRADICTIONS AND TENSIONS:",
    ...synthesis.contradictionsAndTensions.map(t => `${t.polarities}; reconciliation: ${t.reconciliation}; evidence: ${t.evidenceIds.join(", ")}`),
    "MANDATORY PER-LAYER OUTPUT CONTRACT: For EACH computed-with-result method below, produce a distinct identifiable layer output with (1) its exact calculated findings, (2) what those findings mean under that method's traditional rules, (3) how they reinforce, modify, or conflict with findings from other layers, (4) its contribution to the answer, and (5) evidence IDs. If a method is unavailable, reference-only, not applicable, or computed without results, report that status instead of inventing an interpretation. Never mistake a raw result inventory for completed interpretation. Keep all method IDs visible, even when related layers are grouped in the final narrative.",
    "COMPLETE MASTER METHOD LEDGER — ONE OUTPUT REQUIRED FOR EVERY LAYER:",
    ...synthesis.methodFindings.map(method => [
      `LAYER ${method.id} | ${method.name} | ${method.status} | frame=${method.frame} | tradition=${method.tradition}`,
      `SOURCE IDS: ${method.sourceIds.join(", ") || "none"}`,
      `EVIDENCE IDS: ${method.evidenceIds.join(", ") || "none"}`,
      `RESULT COUNT: ${method.resultCount}`,
      ...method.findings.map(f => `FINDING ${f.label}: ${f.details}`),
      ...(method.notes ? [`NOTES: ${method.notes}`] : []),
    ].join("\\n")),
  ].join("\n");
  return { synthesis, context };
}
