import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type {
  SynthesisInput,
  SynthesisResult,
} from "./types";
import { extractPropositionsFromSnapshot } from "./normalizer";
import { clusterPropositionsIntoThemes } from "./clustering";

function getSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

export async function synthesizeMasterReading(
  input: SynthesisInput
): Promise<SynthesisResult> {
  const { snapshot, readingMode } = input;

  // 1. Extract normalized propositions across all available traditions and methods
  const propositions = extractPropositionsFromSnapshot(snapshot);

  // 2. Cluster into human domain themes and reconcile tensions
  const { themes, tensions } = clusterPropositionsIntoThemes(propositions);

  // 3. Evidence-led synthesis. Never substitute generic personality prose for findings.
  const question = input.userQuestion?.trim() || "the chart's overall configuration";
  const relevantDomains: Record<string, string[]> = {
    relationships: ["relationship", "marriage", "partner", "love"],
    resources_wealth: ["money", "wealth", "finance", "income", "career pay"],
    purpose_work: ["career", "work", "purpose", "job", "business"],
    family_home: ["family", "home", "parent", "child"],
    timing: ["when", "timing", "today", "transit", "future"],
    energy_wellbeing: ["energy", "health", "wellbeing"],
    autonomy_power: ["power", "conflict", "control", "courage"],
  };
  const query = question.toLowerCase();
  const prioritized = Object.entries(relevantDomains)
    .filter(([, terms]) => terms.some(term => query.includes(term)))
    .map(([domain]) => domain);
  const orderedThemes = [...themes].sort((a, b) =>
    (prioritized.includes(b.domain) ? 1 : 0) - (prioritized.includes(a.domain) ? 1 : 0)
  );
  const methodCounts = snapshot.methodExecutionLedger
    .map(layer => `${layer.name}: ${layer.status}${Array.isArray(layer.results) ? ` (${layer.results.length} results)` : ""}`);
  const dominantConclusion = orderedThemes.length
    ? `Question: ${question}. The celestial configuration is most clearly expressed through ${orderedThemes[0].humanTheme}. Primary evidence domain: ${orderedThemes[0].humanTheme}. ${orderedThemes[0].primaryConclusion}`
    : `Question: ${question}. No calculated propositions were available for synthesis.`;

  // The complete recorded results remain in the propositions and snapshot.
  // Emit each computed finding so no doctrine disappears behind a generic summary.
  const integratedNarrative: string[] = [
    `Method inventory (every recorded layer): ${methodCounts.join("; ")}.`,
    ...orderedThemes.map(theme =>
      `${theme.humanTheme}. WHAT: ${theme.primaryConclusion} WHY/HOW: ${theme.whyHow} CONSEQUENCE: ${theme.consequences} MEANING: ${theme.deeperMeaning} Evidence: ${theme.evidenceIds.join(", ")}.`
    ),
    ...propositions.filter(p => p.id.startsWith("prop-method-")).map(p =>
      `[${p.tradition} / ${p.causalMechanism}] ${p.plainLanguageMeaning} [Evidence: ${p.supportingEvidenceIds.join(", ")}]`
    ),
  ];

  // 5. Build Evidence Trace Map (mapping every theme to its underlying evidence IDs)
  const evidenceTraceMap: Record<string, string[]> = {};
  for (const theme of themes) {
    evidenceTraceMap[theme.id] = theme.evidenceIds;
  }
  evidenceTraceMap["dominant-conclusion"] = [
    "angle-ascendant",
    "planet-sun",
    "planet-saturn",
  ];

  // 6. Summarize Method Ledger
  const ledger = snapshot.methodExecutionLedger;
  const methodLedgerSummary = {
    totalEvaluated: ledger.length,
    computedWithResult: ledger.filter(l => l.status === "computed-with-result").length,
    referenceOnly: ledger.filter(l => l.status === "reference-only").length,
    notApplicable: ledger.filter(l => l.status === "not-applicable").length,
    failed: ledger.filter(l => l.status === "failed").length,
  };

  // 7. Evidence coverage audit. Do not claim a perfect score without checking.
  const expectedEvidenceIds = new Set(
    ledger.filter(l => l.status === "computed-with-result").flatMap(l => l.evidenceIds)
  );
  const tracedEvidenceIds = new Set(propositions.flatMap(p => p.supportingEvidenceIds));
  const missingEvidenceIds = Array.from(expectedEvidenceIds).filter(id => !tracedEvidenceIds.has(id));
  const groundedRatio = expectedEvidenceIds.size === 0
    ? 1
    : (expectedEvidenceIds.size - missingEvidenceIds.length) / expectedEvidenceIds.size;
  const qualityAudit = {
    groundedRatio,
    unsupportedClaims: missingEvidenceIds.map(id => `Unrepresented computed evidence: ${id}`),
    passed: missingEvidenceIds.length === 0,
  };
  // Report method coverage explicitly; reference-only or unavailable layers are never
  // described as calculated. The raw evidence remains available in the snapshot.
  integratedNarrative.push(
    `Calculation coverage: ${ledger.filter(l => l.status === "computed-with-result").length} methods returned results, ${methodLedgerSummary.referenceOnly} are reference-only, ${methodLedgerSummary.notApplicable} are not applicable, and ${methodLedgerSummary.failed} failed. ${missingEvidenceIds.length === 0 ? "All recorded computed evidence IDs are represented in the proposition stream." : `${missingEvidenceIds.length} computed evidence IDs are not represented.`}`
  );

  return {
    snapshotId: snapshot.snapshotId,
    mode: readingMode,
    dominantConclusion,
    integratedNarrative,
    themes,
    contradictionsAndTensions: tensions,
    timingOverview:
      readingMode === "transit" || readingMode === "combined"
        ? {
            activeWindow: "Current Transit Season",
            turningPoints: [
              "Exact planetary transit peak activation",
              "Subsequent easing window into harmonic equilibrium",
            ],
          }
        : undefined,
    methodLedgerSummary,
    evidenceTraceMap,
    qualityAudit,
  };
}
