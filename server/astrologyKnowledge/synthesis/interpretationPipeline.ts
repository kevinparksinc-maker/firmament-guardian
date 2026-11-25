import { invokeLLM } from "../../_core/llm";
import { READING_BEHAVIOR_DIRECTIVE } from "../../master-interpreter";
import { COMBINATION_INTELLIGENCE_CANON } from "../canon/combinationIntelligence";
import { stringifyEvidence } from "./evidenceTransport";
import { buildWholeChartPlacementIndex } from "../../placementEvidence";
import type { SynthesisResult } from "./types";

type Request = Parameters<typeof invokeLLM>[0];

function truncateEvidenceText(text: unknown, maxChars: number): string {
  const raw = typeof text === "string" ? text : text == null ? "" : String(text);
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars - 1);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(" "));
  return (stop > maxChars * 0.55 ? slice.slice(0, stop) : slice).trim() + "…";
}

function compactCalculationResults(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return truncateEvidenceText(value, 180);
  if (Array.isArray(value)) {
    if (depth >= 2) return `[${value.length} items]`;
    const limit = depth === 0 ? 16 : 8;
    const head = value.slice(0, limit).map(item => compactCalculationResults(item, depth + 1));
    return value.length > limit ? [...head, `…(+${value.length - limit})`] : head;
  }
  if (typeof value === "object") {
    if (depth >= 3) return "[summary]";
    const entries = Object.entries(value as Record<string, unknown>);
    const limit = depth === 0 ? 18 : 12;
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries.slice(0, limit)) {
      out[k] = compactCalculationResults(v, depth + 1);
    }
    if (entries.length > limit) {
      out._more = entries.length - limit;
    }
    return out;
  }
  return value;
}

function findingPriorityScore(finding: { subject?: string; strength?: string | number }): number {
  const subj = finding.subject ?? "";
  const primaryMatch = /\b(Sun|Moon|Ascendant|Descendant|Midheaven|North Node|South Node|Mercury|Venus|Mars|Jupiter|Saturn|D9|D10|Lagna|Shadbala|Bhava Bala|Mansion|Manzil|Nakshatra|Decan)\b/i.test(subj) ? 10 : 0;
  const s = finding.strength;
  const strScore =
    typeof s === "number"
      ? s
      : s === "dominant"
        ? 4
        : s === "strong"
          ? 3
          : s === "moderate"
            ? 2
            : 1;
  return primaryMatch + strScore;
}

export function interpretationEvidence(synthesis: SynthesisResult, includePlacementIndex = false) {
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
    ...(includePlacementIndex ? {
      placementIndex: synthesis.sourceSnapshot.natal
        ? buildWholeChartPlacementIndex(synthesis.sourceSnapshot.natal, synthesis)
        : { status: "not_calculated", reason: "Canonical natal chart unavailable" },
    } : {}),
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

export function horaryInterpretationEvidence(synthesis: SynthesisResult) {
  const methods = synthesis.methodOutcomes;
  const perMethod = Math.max(700, Math.floor(12_000 / Math.max(1, methods.length)));
  let findingsIncluded = 0, findingsTotal = 0, calculationsIncluded = 0, calculationsTotal = 0;
  const compactMethods = methods.map(method => {
    let left = perMethod;
    const judgments: unknown[] = [], calculations: unknown[] = [];
    findingsTotal += method.findingJudgments.length;
    calculationsTotal += method.calculatedFindings.length;
    for (const finding of method.findingJudgments) {
      const item = [finding.id, finding.subject, String(finding.judgment ?? "").slice(0, 175),
        String(finding.mechanism ?? "").slice(0, 110), finding.valence, finding.strength,
        finding.evidenceIds.slice(0, 4)];
      const size = JSON.stringify(item).length;
      if (size > left) break;
      judgments.push(item); left -= size; findingsIncluded++;
    }
    for (const finding of method.calculatedFindings) {
      const item = [finding.evidenceId, String(finding.label ?? "").slice(0, 95),
        JSON.stringify(finding.calculatedValue ?? null).slice(0, 140)];
      const size = JSON.stringify(item).length;
      if (size > left) break;
      calculations.push(item); left -= size; calculationsIncluded++;
    }
    return { id: method.methodId, name: method.methodName, tradition: method.tradition,
      scope: method.chartScope, frame: method.frame, status: method.status,
      limitation: String(method.strengthAndLimitations ?? "").slice(0, 220),
      findingsTotal: method.findingJudgments.length, findingsIncluded: judgments.length,
      calculationsTotal: method.calculatedFindings.length, calculationsIncluded: calculations.length,
      judgments, calculations };
  });
  return { snapshotId: synthesis.snapshotId, scope: synthesis.mode,
    coverage: { methodsTotal: methods.length, methodsIncluded: compactMethods.length,
      findingsTotal, findingsIncluded, omittedFindings: findingsTotal - findingsIncluded,
      calculationsTotal, calculationsIncluded, omittedCalculations: calculationsTotal - calculationsIncluded,
      detailsCompacted: true,
      note: "Every method and status is included; individual findings are budgeted with explicit omissions. Full evidence remains in the chart ledger." },
    methodExecution: synthesis.sourceSnapshot.methodExecutionLedger.map(entry => [
      entry.id, entry.status, entry.errorCode ?? null,
    ]),
    judgmentColumns: ["findingId","subject","judgment","mechanism","valence","strength","evidenceIds"],
    calculationColumns: ["evidenceId","label","calculatedValue"],
    methods: compactMethods,
    convergences: synthesis.themes.slice(0, 8).map(theme => ({
      theme: theme.humanTheme, conclusion: theme.primaryConclusion,
    })),
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
  const perMethodBudget = Math.max(210, Math.floor(10_000 / Math.max(1, synthesis.methodOutcomes.length)));
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

export function parseLlmJsonObject(
  rawText: string,
  errorCode = "INTERPRETATION_INVALID_JSON"
): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (!cleaned) {
    throw new Error(`${errorCode}: Provider returned empty structured output.`);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through to contextual error below
      }
    }
    throw new Error(
      `${errorCode}: Provider returned unreadable structured output.`
    );
  }
}

/** A single evidence handoff. Placement retains the original wire format. */
export async function runInterpretation(
  route: string,
  synthesis: SynthesisResult | readonly SynthesisResult[],
  request: Request,
  layout: "complete" | "placement-reference" | "horary-compact" | { focusedPlacement: string } = "complete"
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
        stringifyEvidence(interpretationEvidence(ledgers[0]))
    };
  } else {
    const sharedContract = {
      role: "system" as const,
      content: "UNIVERSAL EVIDENCE-WEAVING CONTRACT: Read all applicable calculated methods and their statuses. Do not list parallel methods as a substitute for interpretation. Explain their convergence, contradictions and implications without invented facts. Preserve route-specific Horary verdicts, JSON schemas and evidence IDs.",
    };
    const wholeChart = route === "MASTER_READING" || route === "LIFE_STORY";
    const evidence =
      typeof layout === "object"
        ? stringifyEvidence(ledgers.map(ledger => focusedPlacementEvidence(ledger, layout.focusedPlacement)))
        : layout === "horary-compact"
          ? stringifyEvidence(ledgers.map(horaryInterpretationEvidence))
          : stringifyEvidence(ledgers.map(ledger => interpretationEvidence(ledger, wholeChart)));
    const dossier = {
      role: "user" as const,
      content:
        (typeof layout === "object"
          ? "FOCUSED PLACEMENT DOSSIER. Read every method row. Apply chart-wide context only when it bears directly on the selected placement. Treat missing findings and method statuses as limits on interpretation.\n"
          : layout === "horary-compact"
            ? "HORARY CALCULATED METHOD DOSSIER. Every registered method and status is present. The specific Horary judgment testimony is in the preceding user message. Findings are budgeted and exact omitted counts are supplied; never invent evidence omitted for size.\n"
            : "COMPLETE CALCULATED INTERPRETATION DOSSIER. Consider every applicable method, connecting agreement and tension to the specific question. Read each table using its matching column names. canonRefs index the canon table. Respect frames, evidence IDs and method status. Never fill gaps from inference. Previous prose is conversation context only.\n") +
        (wholeChart ? "\nSHARED PLANETARY EVIDENCE INDEX: Use placementIndex to follow each planet into the exact finding IDs in the full method tables. Connect different planets, occupied and ruled houses, dignities, aspects, mansions and other methods into one configuration-level conclusion. A planet may participate in multiple distinct configurations. Examine chartWideOrUnlinkedFindingIds too: every finding remains in the full dossier. Do not write a series of isolated placement readings or simply paraphrase a domain label.\n" : "") +
        evidence,
    };
    // Preserve the domain packet and keep the current turn last in conversations.
    const index =
      firstUser < 0
        ? messages.length
        : firstUser === messages.length - 1
          ? firstUser + 1
          : messages.length - 1;
    messages.splice(index, 0, sharedContract, dossier);
  }
  // Apply the behavior contract to every route, including placement-reference,
  // while avoiding duplicate instructions in routes using the Master Interpreter.
  const alreadyUsesReadingBehavior = messages.some(
    message =>
      message.role === "system" &&
      typeof message.content === "string" &&
      message.content.includes("THE ABSOLUTE — AS REAL AS IT GETS: SOUL-DEEP READING-BEHAVIOR CONTRACT")
  );
  // Life Story is a distinct chronological biography, not the Who Are You
  // identity portrait. Share knowledge, not conflicting reading instructions.
  const isLifeStory = route === "LIFE_STORY";
  if (isLifeStory || !alreadyUsesReadingBehavior) {
    const firstNonSystem = messages.findIndex(m => m.role !== "system");
    const insertAt = firstNonSystem < 0 ? messages.length : firstNonSystem;
    messages.splice(insertAt, 0, {
      role: "system",
      content: isLifeStory
        ? [
            COMBINATION_INTELLIGENCE_CANON,
            "LIFE STORY — CHRONOLOGICAL BIOGRAPHY AND DEPTH CONTRACT",
            "The dedicated Life Historian instructions control this route. Use the Genesis inquiry, complete supplied chart testimony and stage-specific timing to construct a distinct life chapter, not a psychological portrait. The Canon is shared with Who Are You, but its application here is to changing worldly circumstances across time.",
            "Aim for 6–9 substantial, connected paragraphs (roughly 600–1000 words where the evidence supports that depth). Establish the stage's opening circumstances, develop the strongest connected life domains, show turning points and their consequences, and close on the transition to the next era. Do not stretch weak evidence or repeat a central personality label just to meet length.",
            "Give supported achievements, opportunities, relationships, family responsibilities, education, work, material conditions, setbacks, recoveries and contribution their rightful place. Select the domains from the chart rather than forcing a fixed life script. Use distinct configurations and cross-method testimony to explain each development; do not manufacture dates, events, diagnoses or actual biographical knowledge.",
            "Write in direct second person with profound, accessible, literary human language. Avoid clinical terminology, generic motivational advice, repetitive abstractions, and canned moral endings. Keep technical evidence in the evidence view. Preserve uncertainty for unverified past events and future possibilities, and distinguish supplied timing from symbolic inference.",
          ].join("\n\n")
        : READING_BEHAVIOR_DIRECTIVE,
    });
  }
  const response = await invokeLLM({
    ...request,
    ...(isLifeStory && request.max_tokens == null && request.maxTokens == null
      ? { max_tokens: 6000 }
      : {}),
    messages,
  });
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
