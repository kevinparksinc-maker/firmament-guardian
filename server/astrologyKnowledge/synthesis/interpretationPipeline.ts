import { invokeLLM } from "../../_core/llm";
import { stringifyEvidence } from "./evidenceTransport";
import type { SynthesisResult } from "./types";

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
  layout: "complete" | "placement-reference" = "complete"
) {
  const ledgers = (
    Array.isArray(synthesis) ? synthesis : [synthesis]
  ) as readonly SynthesisResult[];
  if (!ledgers.length)
    throw new Error(
      `${route}_EVIDENCE_MISSING: No calculated synthesis was provided.`
    );
  const messages = [...request.messages];
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
  } else {
    // Universal placement-reference reasoning contract. This is intentionally
    // output-format-neutral: Horary verdicts, JSON plans and energy ledgers keep
    // their specialized schemas. Placement itself is left byte-for-byte intact.
    messages.unshift({
      role: "system",
      content: [
        "UNIVERSAL EVIDENCE-WEAVING CONTRACT (all chart interpretation routes):",
        "Read every applicable calculated method and its status. Treat unavailable, failed, not-calculated and reference-only methods as gaps, never as facts.",
        "Derive conclusions from actual evidence IDs and method findings. Connect rulerships, occupations, aspects, timing, God/Agent differences, and cross-tradition agreement or contradiction where calculated.",
        "Do not list parallel methods as a substitute for interpretation. Explain what converging and conflicting evidence means together for the question and for recognizable everyday behavior.",
        "Speak directly to the reader in second person, with concrete strengths, costs and difficult truths. Never invent personal events, motives, astronomical placements or missing calculations.",
        "Keep all evidence references in the requested technical/structured fields when the route requires them. Follow the route-specific JSON schema, Horary verdict, chapter plan or other output contract exactly.",
        "Do not claim to have used evidence that was not actually delivered.",
      ].join("\\n"),
    });
    const evidence = stringifyEvidence(ledgers.map(interpretationEvidence));
    const dossier = {
      role: "user" as const,
      content:
        "COMPLETE CALCULATED INTERPRETATION DOSSIER. Consider every applicable method, connecting agreement and tension to the specific question. Read each table using its matching column names. canonRefs index the canon table. Respect frames, evidence IDs and method status. Never fill gaps from inference. Previous prose is conversation context only.\n" +
        evidence,
    };
    // Preserve the domain packet and keep the current turn last in conversations.
    const index =
      firstUser < 0
        ? messages.length
        : firstUser === messages.length - 1
          ? firstUser + 1
          : messages.length - 1;
    messages.splice(index, 0, dossier);
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
