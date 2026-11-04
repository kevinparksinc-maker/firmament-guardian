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
  const canonApplications = input.canonApplications ?? [];
  const propositions = extractPropositionsFromSnapshot(snapshot, canonApplications);

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
  const methodFindings = snapshot.methodExecutionLedger.map(layer => {
    const raw = layer.results;
    const entries = Array.isArray(raw)
      ? raw.map((value, index) => [String(index + 1), value] as const)
      : raw && typeof raw === "object"
        ? Object.entries(raw)
        : raw == null ? [] : [["result", raw] as const];
    const findings = entries.map(([label, value]) => ({
      label,
      details: typeof value === "string" ? value : JSON.stringify(value) ?? String(value),
    }));
    return {
      id: layer.id,
      name: layer.name,
      tradition: layer.tradition,
      status: layer.status,
      frame: layer.frame,
      evidenceIds: layer.evidenceIds,
      sourceIds: layer.sourceIds,
      resultCount: findings.length,
      findings,
      ...(layer.notes ? { notes: layer.notes } : {}),
    };
  });
  const methodCounts = snapshot.methodExecutionLedger
    .map(layer => `${layer.name}: ${layer.status}${Array.isArray(layer.results) ? ` (${layer.results.length} results)` : ""}`);
  const dominantConclusion = orderedThemes.length
    ? `Question: ${question}. The celestial configuration is most clearly expressed through ${orderedThemes[0].humanTheme}. Primary evidence domain: ${orderedThemes[0].humanTheme}. ${orderedThemes[0].primaryConclusion}`
    : `Question: ${question}. No calculated propositions were available for synthesis.`;

  // The complete recorded results remain in the propositions and snapshot.
  // Emit each computed finding so no doctrine disappears behind a generic summary.
  const integratedNarrative: string[] = [
    `Method inventory (every recorded layer): ${methodCounts.join("; ")}.`,
    ...canonApplications.map(application =>
      `Canon rule applied to ${application.subject}: [${application.ruleId}] ${application.statement} Source: ${application.sourceTitle}. Matched calculation evidence: ${application.calculationEvidenceIds.join(", ")}.`
    ),
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
  evidenceTraceMap["dominant-conclusion"] = orderedThemes[0]?.evidenceIds ?? [];

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
  // Only evidence actually incorporated into a synthesized theme counts as interpreted.
  // Inventory-only ledger entries cannot inflate the interpretation coverage score.
  const tracedEvidenceIds = new Set(themes.flatMap(theme => theme.evidenceIds));
  const missingEvidenceIds = Array.from(expectedEvidenceIds).filter(id => !tracedEvidenceIds.has(id));
  const computedLayers = ledger.filter(l => l.status === "computed-with-result");
  const interpretedMethodIds = new Set(
    themes.flatMap(theme => theme.linkedPropositionIds)
      .filter(id => id.startsWith("prop-method-"))
      .map(id => id.slice("prop-method-".length).replace(/-([0-9]+|remaining)$/, ""))
  );
  const uninterpretedMethods = computedLayers.filter(layer => !interpretedMethodIds.has(layer.id));
  const linkedPropositionIds = new Set(themes.flatMap(theme => theme.linkedPropositionIds));
  const interpretedCanonEvidenceIds = new Set(
    propositions
      .filter(proposition => linkedPropositionIds.has(proposition.id))
      .flatMap(proposition => (proposition.canonApplications ?? []).map(application => application.canonEvidenceId))
  );
  const missingCanonApplications = canonApplications.filter(application =>
    application.confidence !== "reference-only" && !interpretedCanonEvidenceIds.has(application.canonEvidenceId)
  );
  const groundedRatio = expectedEvidenceIds.size === 0
    ? 1
    : (expectedEvidenceIds.size - missingEvidenceIds.length) / expectedEvidenceIds.size;
  const qualityAudit = {
    groundedRatio,
    unsupportedClaims: [
      ...missingEvidenceIds.map(id => `Not incorporated into interpreted themes: ${id}`),
      ...uninterpretedMethods.map(layer => `Computed method missing from interpreted themes: ${layer.id}`),
      ...missingCanonApplications.map(application => `Canon rule not applied to an interpreted proposition: ${application.ruleId} (${application.canonEvidenceId})`),
    ],
    passed: missingEvidenceIds.length === 0 && uninterpretedMethods.length === 0 && missingCanonApplications.length === 0,
  };
  // Report method coverage explicitly; reference-only or unavailable layers are never
  // described as calculated. The raw evidence remains available in the snapshot.
  integratedNarrative.push(
    `Calculation coverage: ${ledger.filter(l => l.status === "computed-with-result").length} methods returned results, ${methodLedgerSummary.referenceOnly} are reference-only, ${methodLedgerSummary.notApplicable} are not applicable, and ${methodLedgerSummary.failed} failed. ${missingEvidenceIds.length === 0 ? "All recorded computed evidence IDs are incorporated into interpreted themes." : `${missingEvidenceIds.length} computed evidence IDs are not incorporated into interpreted themes.`}`
  );
  integratedNarrative.push(
    missingCanonApplications.length === 0
      ? `Canon coverage: ${canonApplications.length} retrieved rule applications are linked to interpreted chart propositions.`
      : `Canon coverage incomplete: ${missingCanonApplications.length} retrieved rule applications are not linked to interpreted chart propositions.`
  );

  return {
    snapshotId: snapshot.snapshotId,
    mode: readingMode,
    dominantConclusion,
    integratedNarrative,
    methodFindings,
    themes,
    contradictionsAndTensions: tensions,
    timingOverview:
      readingMode === "transit" || readingMode === "combined"
        ? {
            activeWindow: snapshot.transit?.transitInstantUtc ?? "Transit moment not supplied",
            turningPoints: snapshot.transit?.aspectsToNatal?.length
              ? snapshot.transit.aspectsToNatal.map(contact => `${contact.transitBody} ${contact.aspect} natal ${contact.natalBody} (orb ${contact.orb}°)`).slice(0, 12)
              : ["No calculated natal transit contacts available; peak and easing times are not established."],
          }
        : undefined,
    methodLedgerSummary,
    evidenceTraceMap,
    canonApplications,
    qualityAudit,
  };
}
