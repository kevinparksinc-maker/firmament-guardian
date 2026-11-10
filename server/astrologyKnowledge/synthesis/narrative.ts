import { stringifyEvidence } from "./evidenceTransport";
import { invokeLLM } from "../../_core/llm";
import { FULL_SYNTHESIS_STYLE } from "../../master-interpreter";
import { generateMethodMiniReadings } from "../../chartMethodOutcomes";

import { buildNarrativePacket } from "./narrativePacket";
import type { SynthesisResult } from "./types";

const MAX_FINAL_NARRATIVE_CHARS = 240_000;

export interface MasterNarrative {
  answer: string;
  sections: Array<{ id: string; title: string; text: string; findingIds: string[] }>;
  methodContributions: Array<{ methodId: string; sectionIds: string[]; findingIds: string[]; contribution: string }>;
  methodsReviewed: string[];
}

async function generate(synthesis: SynthesisResult, question: string) {
  // Every interpreted method and its Canon applications are sent through bounded
  // first-stage calls. The final narrator receives all method readings, coverage,
  // deterministic themes, and explicit evidence lineage—not a duplicated raw dump.
  const methodReadings = await generateMethodMiniReadings(
    synthesis.snapshotId,
    synthesis.mode,
    synthesis.methodOutcomes
  );
  const bindings = buildNarrativePacket(synthesis, question, methodReadings);
  const encodedPacket = stringifyEvidence(bindings.packet);
  if (encodedPacket.length > MAX_FINAL_NARRATIVE_CHARS)
    throw new Error(`MASTER_NARRATIVE_PACKET_TOO_LARGE: ${encodedPacket.length} characters exceeds the ${MAX_FINAL_NARRATIVE_CHARS}-character reducer limit.`);
  const response = await invokeLLM({
    max_tokens: 8192,
    timeoutMs: 180_000,
    messages: [
      { role: "system", content: FULL_SYNTHESIS_STYLE + "\n\nTHE ABSOLUTE — MASTER SYNTHESIS. You are the final narrative-delivery layer, not an astrology calculator or doctrine-retrieval system. The bounded method readings were generated from the authoritative completed method findings and their attached Canon applications. Use every supplied method reading, deterministic theme, tension, and coverage status; preserve method identity, evidence lineage, natal/event scope, and God/Agent frame. Do not recalculate chart facts, rediscover doctrine, substitute judgments, or invent methods or records. Reconcile findings and explicit tensions without silently changing a method's judgment. The coverage object reports missing or failed work; never conceal it with generic prose. Explain WHAT, WHY, HOW, CONSEQUENCE, and MEANING only where supported by the supplied ledger and readings. OUTPUT DEPTH: Give a substantial, connected second-person reading. Explain character, motives, strengths, challenges, consequences, and interactions only where supported. Respond in natural prose without JSON, evidence IDs, method inventory, or canned introductory text." },
      { role: "user", content: "<chart_data>\n" + encodedPacket + "\n</chart_data>" },
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
