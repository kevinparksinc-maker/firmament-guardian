import { invokeLLM } from "../../_core/llm";
import { stringifyEvidence } from "./evidenceTransport";
import type { SynthesisResult } from "./types";
import { buildThreeChartTestimony, threeChartJudgmentInstructions } from "../../threeChartSynthesis";

type Request = Parameters<typeof invokeLLM>[0];

export function interpretationEvidence(synthesis: SynthesisResult) {
  const canon = Array.from(
    new Map(
      [
        ...synthesis.canonApplications,
        ...synthesis.methodOutcomes.flatMap(method =>
          method.findingJudgments.flatMap(finding => finding.rules)
        ),
      ].map(rule => [rule.canonEvidenceId, rule])
    ).values()
  );
  const canonIndex = new Map(
    canon.map((rule, index) => [rule.canonEvidenceId, index])
  );
  return {
    snapshotId: synthesis.snapshotId,
    scope: synthesis.mode,
    coverage: {
      methodsTotal: synthesis.methodOutcomes.length,
      methodsIncluded: synthesis.methodOutcomes.length,
      findingsTotal: synthesis.methodOutcomes.reduce((n, method) => n + method.findingJudgments.length, 0),
      findingsIncluded: synthesis.methodOutcomes.reduce((n, method) => n + method.findingJudgments.length, 0),
      omittedFindings: 0,
      truncated: false,
    },
    methodColumns: [
      "id",
      "name",
      "tradition",
      "chartScope",
      "frame",
      "outcomeStatus",
      "limitations",
      "judgmentFailure",
      "findingJudgments",
      "calculatedFindings",
    ],
    findingColumns: [
      "id",
      "subject",
      "domain",
      "judgment",
      "mechanism",
      "valence",
      "strength",
      "evidenceIds",
      "canonRefs",
      "frame",
      "limitation",
    ],
    methods: synthesis.methodOutcomes.map(method => [
      method.methodId,
      method.methodName,
      method.tradition,
      method.chartScope,
      method.frame,
      method.status,
      method.strengthAndLimitations,
      method.status === "failed" ? method.interpretation : null,
      method.findingJudgments.map(finding => [
        finding.id,
        finding.subject,
        finding.domain,
        finding.judgment,
        finding.mechanism,
        finding.valence,
        finding.strength,
        finding.evidenceIds,
        finding.rules.map(rule => canonIndex.get(rule.canonEvidenceId)),
        finding.frame ?? method.frame,
        finding.limitation ?? null,
      ]),
      method.calculatedFindings,
    ]),
    calculationColumns: [
      "id",
      "executionStatus",
      "results",
      "evidenceIds",
      "prerequisites",
      "sourceIds",
      "technique",
      "errorCode",
      "notes",
    ],
    calculations: synthesis.sourceSnapshot.methodExecutionLedger.map(method => [
      method.id,
      method.status,
      method.results,
      method.evidenceIds,
      method.prerequisites,
      method.sourceIds,
      method.technique,
      method.errorCode ?? null,
      method.notes ?? null,
    ]),
    canonColumns: [
      "id",
      "ruleId",
      "sourceId",
      "sourceTitle",
      "technique",
      "subject",
      "statement",
      "calculationEvidenceIds",
      "confidence",
      "implementationStatus",
    ],
    canon: canon.map(rule => [
      rule.canonEvidenceId,
      rule.ruleId,
      rule.sourceId,
      rule.sourceTitle,
      rule.technique,
      rule.subject,
      rule.statement,
      rule.calculationEvidenceIds,
      rule.confidence,
      rule.implementationStatus ?? null,
    ]),
    convergences: synthesis.themes.map(theme => ({
      id: theme.id,
      theme: theme.humanTheme,
      conclusion: theme.primaryConclusion,
      convergence: theme.convergenceAssessment,
      evidenceIds: theme.evidenceIds,
    })),
    tensions: synthesis.contradictionsAndTensions,
    timing: synthesis.timingOverview,
  };
}

function focusedPlacementEvidence(synthesis: SynthesisResult, focus: string) {
  // A contact has two bodies. Keep both sides' method findings while
  // excluding unrelated chart-wide content from the provider payload.
  // The separator is internal and comes from canonical chart body names.
  const bodyPatterns = focus.split("|").map(name => name.trim()).filter(Boolean)
    .map(name => new RegExp(`(?:^|[^a-z])${name.toLowerCase().replaceAll(" ", "[-_ ]")}(?:$|[^a-z])`, "i"));
  const matchesBody = (value: string) => bodyPatterns.some(pattern => pattern.test(value));
  // Complete method coverage is not the same as resending every unrelated
  // paragraph. This is a focused *reading* packet, not a raw chart archive.
  // Keep every method/status and explicit omission counts when a method's
  // selected details exceed its share of the model request budget.
  const perMethodBudget = Math.max(360, Math.floor(16_000 / Math.max(1, synthesis.methodOutcomes.length)));
  const short = (value: unknown, limit: number) => {
    const text = typeof value === "string" ? value : value == null ? "" : String(value);
    return text.length > limit ? text.slice(0, limit) + "…" : text;
  };
  let omittedJudgments = 0;
  let omittedCalculations = 0;
  const methods = synthesis.methodOutcomes.map(method => {
    const namedCalculations = new Set(method.calculatedFindings
      .filter(finding => matchesBody(finding.label) || matchesBody(finding.evidenceId))
      .map(finding => finding.evidenceId));
    const judgments = method.findingJudgments.filter(finding =>
      matchesBody(finding.subject) ||
      finding.evidenceIds.some(id => matchesBody(id) || namedCalculations.has(id))
    );
    const citedIds = new Set(judgments.flatMap(finding => finding.evidenceIds));
    const calculations = method.calculatedFindings.filter(finding =>
      namedCalculations.has(finding.evidenceId) || citedIds.has(finding.evidenceId)
    );
    const selectedJudgments: unknown[] = [];
    const selectedCalculations: unknown[] = [];
    let used = 0;
    const add = (destination: unknown[], value: unknown) => {
      const size = JSON.stringify(value).length;
      if (used + size > perMethodBudget) return false;
      destination.push(value);
      used += size;
      return true;
    };
    // Direct, calculated judgments take precedence over long nested objects.
    for (const finding of judgments) {
      const item = [
        finding.id, finding.subject,
        short(finding.judgment, 240), short(finding.mechanism, 160),
        finding.evidenceIds, finding.limitation ?? null,
      ];
      if (!add(selectedJudgments, item)) omittedJudgments++;
    }
    for (const finding of calculations) {
      const item = [
        finding.evidenceId, finding.label,
        short(finding.calculatedValue, 220),
      ];
      if (!add(selectedCalculations, item)) omittedCalculations++;
    }
    return [
      method.methodId, method.methodName, method.status, method.frame,
      selectedJudgments, selectedCalculations,
      { selected: [selectedJudgments.length, selectedCalculations.length],
        omitted: [judgments.length - selectedJudgments.length, calculations.length - selectedCalculations.length] },
    ];
  });
  return {
    snapshotId: synthesis.snapshotId,
    focus,
    coverage: {
      methodsTotal: synthesis.methodOutcomes.length,
      methodsIncluded: methods.length,
      omittedJudgments,
      omittedCalculations,
      detailsCompacted: true,
      note: "Every method and status is included. Only focus-linked judgments and calculations are summarized. Omitted detail counts are explicit; full calculated evidence remains available in the technical ledger.",
    },
    methodColumns: ["id", "name", "status", "frame", "focusedJudgments", "focusedCalculations", "detailCounts"],
    judgmentColumns: ["id", "subject", "judgment", "mechanism", "evidenceIds", "limitation"],
    focusedCalculationColumns: ["id", "label", "calculatedValue"],
    methods,
    calculationColumns: ["id", "executionStatus"],
    calculations: synthesis.sourceSnapshot.methodExecutionLedger.map(method => [method.id, method.status]),
  };
}

export function interpretationText(
  response: Awaited<ReturnType<typeof invokeLLM>>
) {
  const content = response.choices?.[0]?.message?.content;
  return (
    typeof content === "string"
      ? content
      : (content ?? [])
          .filter(part => part.type === "text")
          .map(part => part.text)
          .join("")
  ).trim();
}

/** A single evidence handoff. Placement retains the original wire format. */
export async function runInterpretation(
  route: string,
  synthesis: SynthesisResult | readonly SynthesisResult[],
  request: Request,
  layout: "complete" | "placement-reference" | { focusedPlacement: string } = "complete"
) {
  const ledgers = (
    Array.isArray(synthesis) ? synthesis : [synthesis]
  ) as readonly SynthesisResult[];
  if (!ledgers.length)
    throw new Error(
      `${route}_EVIDENCE_MISSING: No calculated synthesis was provided.`
    );
  const messages = [...request.messages];
  const threeChartDossiers = ledgers.map(ledger => {
    const natal = ledger.sourceSnapshot.natal;
    if (!natal) {
      throw new Error(`${route}_NATAL_CHART_MISSING: Cannot build three-chart testimony without a canonical birth chart.`);
    }
    return {
      snapshotId: ledger.snapshotId,
      testimony: buildThreeChartTestimony(natal, ledger.mode, ledger.sourceSnapshot),
    };
  });
  const threeChartContext = stringifyEvidence(threeChartDossiers);
  const firstUser = messages.findIndex(message => message.role === "user");
  if (layout === "placement-reference") {
    const placement = messages[firstUser];
    if (
      ledgers.length !== 1 ||
      !placement ||
      typeof placement.content !== "string"
    )
      throw new Error(
        "PLACEMENT_SYNTHESIS_EVIDENCE_MISSING: Expected one placement packet."
      );
    messages[firstUser] = {
      ...placement,
      content:
        placement.content +
        "\n\nFULL CALCULATED CHART AND METHOD OUTCOMES:\n" +
        stringifyEvidence(
          interpretationEvidence(ledgers[0])
        ),
    };
    // Preserve the reference placement's original prompt and evidence content.
    // Supply the cross-view interpretation discipline in a separate message.
    messages.push({
      role: "system",
      content: threeChartJudgmentInstructions(ledgers[0].mode) +
        "\nTHREE-CHART RELATIONSHIP MAP (not independent extra evidence):\n" +
        threeChartContext,
    });
  } else {
    // Universal placement-reference reasoning contract. This is intentionally
    // output-format-neutral: Horary verdicts, JSON plans and energy ledgers keep
    // their specialized schemas. Placement itself is left byte-for-byte intact.
    const sharedContract = {
      role: "system" as const,
      content: [
        "UNIVERSAL EVIDENCE-WEAVING CONTRACT (all chart interpretation routes):",
        "Read every applicable calculated method and its status. Treat unavailable, failed, not-calculated and reference-only methods as gaps, never as facts.",
        "Derive conclusions from actual evidence IDs and method findings. Connect rulerships, occupations, aspects, timing, God/Agent differences, and cross-tradition agreement or contradiction where calculated.",
        "Do not list parallel methods as a substitute for interpretation. Explain what converging and conflicting evidence means together for the question and for recognizable everyday behavior.",
        "Speak directly to the reader in second person, with concrete strengths, costs and difficult truths. Never invent personal events, motives, astronomical placements or missing calculations.",
        "Keep all evidence references in the requested technical/structured fields when the route requires them. Follow the route-specific JSON schema, Horary verdict, chapter plan or other output contract exactly.",
        "Do not claim to have used evidence that was not actually delivered.",
        threeChartJudgmentInstructions(ledgers[0].mode),
      ].join("\n"),
    };
    const evidence = typeof layout === "object"
      ? stringifyEvidence(ledgers.map(ledger => focusedPlacementEvidence(ledger, layout.focusedPlacement)))
      : stringifyEvidence(ledgers.map(interpretationEvidence));
    const dossier = {
      role: "user" as const,
      content:
        (typeof layout === "object"
          ? "FOCUSED PLACEMENT DOSSIER. Read every method row. Apply chart-wide context only when it bears directly on the selected placement. Treat missing findings and method statuses as limits on interpretation.\n"
          : "COMPLETE CALCULATED INTERPRETATION DOSSIER. Consider every applicable method, connecting agreement and tension to the specific question. Read each table using its matching column names. canonRefs index the canon table. Respect frames, evidence IDs and method status. Never fill gaps from inference. Previous prose is conversation context only.\n") +
        evidence + "\n\nTHREE-CHART TESTIMONY (calculated cross-frame relationships; not additional independent methods):\n" + threeChartContext,
    };
    // Preserve the domain packet and keep the current turn last in conversations.
    const index = firstUser < 0 ? messages.length : firstUser + 1;
    // Keep the route-specific system prompt at index 0 and its original input
    // at index 1. Some JSON routes require that stable contract. All providers
    // collect system-role messages independently of their position.
    messages.splice(index, 0, sharedContract, dossier);
  }
  const response = await invokeLLM({ ...request, messages });
  const finish = response.choices?.[0]?.finish_reason;
  if (
    finish &&
    !["stop", "end_turn", "stop_sequence", "completed"].includes(
      finish.toLowerCase()
    )
  )
    throw new Error(
      `${route}_INCOMPLETE: The provider truncated or stopped the interpretation (${finish}).`
    );
  if (!interpretationText(response))
    throw new Error(
      `${route}_EMPTY: The interpretation service returned no reading.`
    );
  return response;
}
