import type { SynthesisResult } from "./types";

/** Each result and Canon application is sent once, without expanding it into every theme. */
export function packSynthesis(synthesis: SynthesisResult) {
  return {
    snapshotId: synthesis.snapshotId,
    qualityAudit: synthesis.qualityAudit,
    methodLedgerSummary: synthesis.methodLedgerSummary,
    methodFindings: synthesis.methodFindings.map(method => ({
      ...method,
      findings: method.findings.map(finding => {
        try {
          return { label: finding.label, value: JSON.parse(finding.details) };
        } catch {
          return { label: finding.label, value: finding.details };
        }
      }),
    })),
    methodOutcomes: synthesis.methodOutcomes,
    methodOutcomeAudit: synthesis.methodOutcomeAudit,
    canonApplications: synthesis.canonApplications,
    themes: synthesis.themes.map(theme => ({
      id: theme.id,
      humanTheme: theme.humanTheme,
      consequences: theme.consequences,
      deeperMeaning: theme.deeperMeaning,
      evidenceIds: theme.evidenceIds,
    })),
    contradictionsAndTensions: synthesis.contradictionsAndTensions,
  };
}

export function formatSynthesisContext(synthesis: SynthesisResult) {
  return [
    "UNIFIED MASTER SYNTHESIS — CALCULATED METHOD FINDINGS AND CANON RULE APPLICATIONS",
    "Every method must produce or explicitly withhold a method-specific outcome before the final synthesis. Read the full formation before answering; explain how applicable methods modify one another, not just a planet/sign/house dictionary. Follow WHAT → WHY → HOW → CONSEQUENCE → MEANING.",
    "Unprefixed method/evidence IDs belong to the base chart. transit: IDs belong to the separately calculated event sky. Event houses describe the event's local horizon; natal houses describe the birth horizon. Event-origin Dasha/varga results are event-model calculations, never a person's natal lifecycle. God and Agent use the same positions with distinct house frames.",
    "Use actual nakshatra/pada, Arabic manzil, elemental-family decan, dignity, fixed-star activations, rulers, aspects, Lots, Kabbalah, vargas and other available findings in the conclusions they affect. The Chinese overlays carry their explicit custom Firmament boundary model. The separate historical Chinese catalog remains reference-only; do not claim those custom sectors reconstruct ancient equatorial boundaries. Do not invent missing Shadbala/Bhava Bala or unavailable methods. Keep source and evidence IDs inspectable. Inventory is not interpretation.",
    JSON.stringify(packSynthesis(synthesis)),
  ].join("\n");
}
