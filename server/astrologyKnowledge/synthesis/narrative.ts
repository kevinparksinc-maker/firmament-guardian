import { stringifyEvidence } from "./evidenceTransport";
import { invokeLLM } from "../../_core/llm";
import { FULL_SYNTHESIS_STYLE } from "../../master-interpreter";

import { buildNarrativePacket } from "./narrativePacket";
import type { SynthesisResult } from "./types";

export interface MasterNarrative {
  answer: string;
  sections: Array<{ id: string; title: string; text: string; findingIds: string[] }>;
  methodContributions: Array<{ methodId: string; sectionIds: string[]; findingIds: string[]; contribution: string }>;
  methodsReviewed: string[];
}

async function generate(synthesis: SynthesisResult, question: string) {
  // Never block raw calculated outcomes from reaching the provider because an interpretation audit failed.
  // Keep audit status in the supplied evidence instead.
  const bindings = buildNarrativePacket(synthesis, question);
  const response = await invokeLLM({
    max_tokens: 8192,
    timeoutMs: 180_000,
    messages: [
      { role: "system", content: FULL_SYNTHESIS_STYLE + "\n\nTHE ABSOLUTE — MASTER SYNTHESIS. Read every supplied raw calculated outcome, complete method layer, and chart placement. The methodOutcomes contain each method's calculated findings, judgments, mechanisms, and Canon applications. Use them alongside the raw ledger; reconcile them yourself rather than copying their technical wording. The themeCoverage audit describes only the rule-based theme builder, never permission to ignore a calculated result. Preserve natal versus current-event scope and God versus Agent frame. Synthesize all applicable layers directly into a complete, natural second-person reading. Explain WHAT, WHY, HOW, CONSEQUENCES and MEANING through connected prose. Do not omit calculated results based on audit status, method ranking, or prewritten interpretations. OUTPUT DEPTH: This endpoint is the FULL MASTER READING. Give a substantial, connected interpretation of the whole chart and every applicable calculated method. Explain the person's character, motives, strengths, challenges, consequences, and the interaction of all layers in plain second-person language. Address the person directly: for example, explain what you want, how you respond under pressure, what that costs you, and how you can work with it, using the actual findings. Show how different layers modify the same planet and how planets and houses interact. Respond in natural prose without JSON, evidence IDs, method inventory, or canned introductory text. Do not invent missing calculations." },
      { role: "user", content: "<chart_data>\n" + stringifyEvidence(bindings.packet) + "\n</chart_data>" },
    ],
  });
  const choice = response.choices?.[0];
  if (!choice) throw new Error("MASTER_NARRATIVE_EMPTY: AI provider returned no response.");
  if (choice.finish_reason === "length" || choice.finish_reason === "max_tokens") {
    throw new Error("MASTER_NARRATIVE_TRUNCATED: AI reading reached its output limit; do not display as complete.");
  }
  const content = choice.message.content;
  const text = (typeof content === "string" ? content : (content ?? []).filter(p => p.type === "text").map(p => (p as {text:string}).text).join("")).trim();
  if (!text) throw new Error("MASTER_NARRATIVE_EMPTY: AI provider returned no reading text.");
  const narrative: MasterNarrative = {
    answer: text,
    sections: [{ id: "complete-reading", title: "Your Complete Reading", text, findingIds: [] }],
    methodContributions: [],
    // Delivery to the provider is measurable; its internal review is not.
    methodsReviewed: [],
  };
  return {
    ...synthesis,
    calculatedNarrative: synthesis.integratedNarrative,
    dominantConclusion: narrative.answer,
    integratedNarrative: [text],
    narrative,
    narrativeAudit: {
      passed: null,
      interpretedMethodIds: narrative.methodContributions.map(c => c.methodId),
      citedFindingIds: Array.from(new Set(narrative.sections.flatMap(s => s.findingIds))),
      validation: "direct-ai-prose" as const,
      inputCoverage: "complete-calculated-outcomes" as const,
      deliveredMethodIds: synthesis.sourceSnapshot.methodExecutionLedger.map(layer => layer.id),
      deliveredOutcomeIds: synthesis.methodOutcomes.map(outcome => outcome.methodId),
    },
  };
}

export async function narrateMasterSynthesis(synthesis: SynthesisResult, question: string) {
  return generate(synthesis, question);
}
