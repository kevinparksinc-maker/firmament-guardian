import type { SynthesisResult } from "./types";

/** Lossless text/source interning keeps ALL judged findings within the interpreter packet. */
export function packSynthesis(synthesis: SynthesisResult) {
  const split = (text: string) => text.split(/(?<=[.!?])(?=\s)/);
  const counts = new Map<string, number>();
  for (const outcome of synthesis.methodOutcomes)
    for (const finding of outcome.findingJudgments)
      for (const part of split(finding.judgment))
        counts.set(part, (counts.get(part) ?? 0) + 1);
  const textTable = Array.from(counts.entries())
    .filter(([part, count]) => part.length >= 80 && count > 1)
    .map(([part]) => part);
  const textIndex = new Map(textTable.map((part, index) => [part, index]));
  const sources = Array.from(
    new Map(
      synthesis.canonApplications.map(rule => [
        `${rule.ruleId}:${rule.sourceTitle}`,
        {
          ruleId: rule.ruleId,
          sourceId: rule.sourceId,
          sourceTitle: rule.sourceTitle,
          confidence: rule.confidence,
        },
      ])
    ).values()
  );
  const sourceIndex = new Map(
    sources.map((rule, index) => [`${rule.ruleId}:${rule.sourceTitle}`, index])
  );
  return {
    snapshotId: synthesis.snapshotId,
    qualityAudit: synthesis.qualityAudit,
    methodLedgerSummary: synthesis.methodLedgerSummary,
    methodOutcomeAudit: synthesis.methodOutcomeAudit,
    methodFindings: synthesis.methodFindings.map(
      ({ findings: _raw, ...metadata }) => metadata
    ),
    judgmentColumns: [
      "subject",
      "judgmentParts",
      "evidenceIds",
      "sourceRefs",
      "valence",
      "strength",
      "frame",
      "limitation",
      "findingId",
    ],
    textTable,
    methodOutcomes: synthesis.methodOutcomes.map(outcome => ({
      methodId: outcome.methodId,
      methodName: outcome.methodName,
      chartScope: outcome.chartScope,
      frame: outcome.frame,
      status: outcome.status,
      findingJudgments:
        outcome.status === "interpreted"
          ? outcome.findingJudgments.map(f => [
              f.subject,
              split(f.judgment).map(part => textIndex.get(part) ?? part),
              f.evidenceIds,
              Array.from(
                new Set(
                  f.rules.map(rule =>
                    sourceIndex.get(`${rule.ruleId}:${rule.sourceTitle}`)
                  )
                )
              ),
              f.valence,
              f.strength,
              f.frame ?? outcome.frame,
              f.limitation ?? null,
              f.id,
            ])
          : [],
      limitations: outcome.strengthAndLimitations,
    })),
    canonApplications: sources,
    themes: synthesis.themes.map(theme => ({
      id: theme.id,
      humanTheme: theme.humanTheme,
    })),
  };
}
export function formatSynthesisContext(synthesis: SynthesisResult) {
  return [
    "UNIFIED MASTER SYNTHESIS — CALCULATED METHOD FINDINGS AND CANON RULE APPLICATIONS",
    "The authoritative input is findingJudgments from interpreted methodOutcomes. Rows use judgmentColumns. In judgmentParts, a number means the exact textTable entry; strings are literal text. Concatenate the parts IN ORDER to read the full judgment. sourceRefs index canonApplications. ALL judgments are retained; these references only avoid repeated text. Cite the original evidence ID strings, never the numeric text/source references.",
    "Each judgment already applies its specific Canon to its actual findings. Reconcile their support, pressure and conditions using WHAT → WHY → HOW → CONSEQUENCE → MEANING. Do not replace them with planet dictionaries or infer an interpretation from failed, no-result, inapplicable or reference-only methods.",
    "Unprefixed evidence belongs to the base chart. transit: identifies the separate event sky. chartScope identifies natal/event independently of God/Agent/shared frame. God House sectors are fixed background fields; Agent houses follow the real local horizon. Divisional and timing results seeded from an event are event-model results, never a person's natal biography.",
    "Every applicable method's judgment must be considered. Preserve disagreements and source limitations. Chinese historical sectors remain reference-only. Unverified star-specific meanings remain withheld even when a conjunction is measured. Use the recorded Shadbala and Bhava Bala component totals, adequacy, house lord delivery and relative rankings to qualify the interpretation. Capacity is distinct from favorable outcome; preserve the supplied fixed-XYZ/Equal-House and motion/calendar variants. Never invent scores when their method status is unavailable.",
    JSON.stringify(packSynthesis(synthesis)),
  ].join("\n");
}
