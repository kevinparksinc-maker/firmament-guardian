import { invokeLLM } from "../../_core/llm";
import { READING_BEHAVIOR_DIRECTIVE } from "../../master-interpreter";
import { packCompactSynthesisForLLM } from "./context";
import { stringifyEvidence } from "./evidenceTransport";
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

export function interpretationEvidence(synthesis: SynthesisResult) {
  const selectedFindingsByMethod = new Map<
    string,
    SynthesisResult["methodOutcomes"][number]["findingJudgments"]
  >();

  for (const method of synthesis.methodOutcomes) {
    const findings = method.findingJudgments ?? [];
    const baseId = method.methodId.replace(/^transit:/, "");
    const maxForMethod =
      baseId === "transit-activation-layer"
        ? 14
        : baseId === "vedic-vargas-divisional"
          ? 8
          : 12;
    const picked =
      findings.length <= maxForMethod
        ? findings
        : [...findings]
            .sort((a, b) => findingPriorityScore(b) - findingPriorityScore(a))
            .slice(0, maxForMethod);
    selectedFindingsByMethod.set(`${method.methodId}:${method.frame}`, picked);
  }

  const canonMap = new Map<
    string,
    SynthesisResult["canonApplications"][number]
  >();
  for (const findings of Array.from(selectedFindingsByMethod.values())) {
    for (const finding of findings) {
      for (const rule of (finding.rules ?? []).slice(0, 3)) {
        if (!canonMap.has(rule.canonEvidenceId)) {
          canonMap.set(rule.canonEvidenceId, rule);
        }
      }
    }
  }
  for (const rule of synthesis.canonApplications) {
    if (canonMap.size >= 48) break;
    if (!canonMap.has(rule.canonEvidenceId)) {
      canonMap.set(rule.canonEvidenceId, rule);
    }
  }
  const canon = Array.from(canonMap.values());
  const canonIndex = new Map(
    canon.map((rule, index) => [rule.canonEvidenceId, index])
  );

  const findingsTotal = synthesis.methodOutcomes.reduce(
    (n, method) => n + method.findingJudgments.length,
    0
  );
  const findingsIncluded = synthesis.methodOutcomes.reduce((n, method) => {
    const picked =
      selectedFindingsByMethod.get(`${method.methodId}:${method.frame}`) ??
      method.findingJudgments;
    return n + picked.length;
  }, 0);

  return {
    snapshotId: synthesis.snapshotId,
    scope: synthesis.mode,
    coverage: {
      methodsTotal: synthesis.methodOutcomes.length,
      methodsIncluded: synthesis.methodOutcomes.length,
      findingsTotal,
      findingsIncluded,
      omittedFindings: Math.max(0, findingsTotal - findingsIncluded),
      truncated: findingsIncluded < findingsTotal,
      canonTotal: synthesis.canonApplications.length,
      canonIncluded: canon.length,
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
    methods: synthesis.methodOutcomes.map(method => {
      const picked =
        selectedFindingsByMethod.get(`${method.methodId}:${method.frame}`) ??
        method.findingJudgments;
      const limitations =
        method.status === "failed" || method.status === "reference-only"
          ? Array.isArray(method.strengthAndLimitations)
            ? method.strengthAndLimitations
                .slice(0, 2)
                .map(entry => truncateEvidenceText(entry, 140))
                .filter(Boolean)
            : method.strengthAndLimitations
              ? [truncateEvidenceText(method.strengthAndLimitations, 140)]
              : []
          : [];
      return [
        method.methodId,
        method.methodName,
        method.tradition,
        method.chartScope,
        method.frame,
        method.status,
        limitations,
        method.status === "failed"
          ? truncateEvidenceText(method.interpretation ?? "", 180)
          : null,
        picked.map(finding => [
          finding.id,
          finding.subject,
          finding.domain,
          truncateEvidenceText(finding.judgment ?? "", 320),
          truncateEvidenceText(finding.mechanism ?? "", 240),
          finding.valence,
          finding.strength,
          (finding.evidenceIds ?? []).slice(0, 4),
          (finding.rules ?? [])
            .slice(0, 3)
            .map(rule => canonIndex.get(rule.canonEvidenceId))
            .filter((idx): idx is number => typeof idx === "number"),
          finding.frame ?? method.frame,
          finding.limitation ? truncateEvidenceText(finding.limitation, 120) : null,
        ]),
      ];
    }),
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
      compactCalculationResults(method.results),
      (method.evidenceIds ?? []).slice(0, 4),
      method.prerequisites,
      method.sourceIds,
      method.technique,
      method.errorCode ?? null,
      method.notes ? truncateEvidenceText(method.notes, 140) : null,
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
      truncateEvidenceText(rule.sourceTitle ?? "", 48),
      rule.technique,
      rule.subject,
      truncateEvidenceText(rule.statement ?? "", 260),
      (rule.calculationEvidenceIds ?? []).slice(0, 3),
      rule.confidence,
      rule.implementationStatus ?? null,
    ]),
    convergences: synthesis.themes.slice(0, 10).map(theme => ({
      id: theme.id,
      theme: truncateEvidenceText(theme.humanTheme ?? "", 200),
      conclusion: truncateEvidenceText(theme.primaryConclusion ?? "", 260),
      convergence: theme.convergenceAssessment,
      evidenceIds: (theme.evidenceIds ?? []).slice(0, 6),
    })),
    tensions: synthesis.contradictionsAndTensions.slice(0, 8),
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
        stringifyEvidence(
          packCompactSynthesisForLLM(ledgers[0], {
            maxJudgmentChars: 240,
            maxVargaRows: 4,
            maxTransitRows: 8,
            maxHouseRows: 6,
            maxOtherRows: 8,
            preserveFullMethodRegistry: true,
          })
        ),
    };
  } else {
    const evidence =
      typeof layout === "object"
        ? stringifyEvidence(ledgers.map(ledger => focusedPlacementEvidence(ledger, layout.focusedPlacement)))
        : layout === "horary-compact"
          ? stringifyEvidence(ledgers.map(horaryInterpretationEvidence))
          : stringifyEvidence(ledgers.map(interpretationEvidence));
    const dossier = {
      role: "user" as const,
      content:
        (typeof layout === "object"
          ? "FOCUSED PLACEMENT DOSSIER. Read every method row. Apply chart-wide context only when it bears directly on the selected placement. Treat missing findings and method statuses as limits on interpretation.\n"
          : layout === "horary-compact"
            ? "HORARY CALCULATED METHOD DOSSIER. Every registered method and status is present. The specific Horary judgment testimony is in the preceding user message. Findings are budgeted and exact omitted counts are supplied; never invent evidence omitted for size.\n"
            : "COMPLETE CALCULATED INTERPRETATION DOSSIER. Consider every applicable method, connecting agreement and tension to the specific question. Read each table using its matching column names. canonRefs index the canon table. Respect frames, evidence IDs and method status. Never fill gaps from inference. Previous prose is conversation context only.\n") +
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
  // Apply the behavior contract to every route, including placement-reference,
  // while avoiding duplicate instructions in routes using the Master Interpreter.
  const alreadyUsesReadingBehavior = messages.some(
    message =>
      message.role === "system" &&
      typeof message.content === "string" &&
      message.content.includes("THE ABSOLUTE — AS REAL AS IT GETS: SOUL-DEEP READING-BEHAVIOR CONTRACT")
  );
  if (!alreadyUsesReadingBehavior) {
    const firstNonSystem = messages.findIndex(m => m.role !== "system");
    const insertAt = firstNonSystem < 0 ? messages.length : firstNonSystem;
    messages.splice(insertAt, 0, {
      role: "system",
      content: READING_BEHAVIOR_DIRECTIVE,
    });
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
