import { createHash } from "node:crypto";
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
      { role: "system", content: FULL_SYNTHESIS_STYLE + "\n\nTHE ABSOLUTE — MASTER SYNTHESIS. Read every supplied raw calculated outcome, complete method layer, and chart placement. Synthesize them directly into a complete, natural second-person reading. Explain WHAT, WHY, HOW, CONSEQUENCES and MEANING. Do not omit calculated results based on audit status, method ranking, or prewritten interpretations. OUTPUT DEPTH: This endpoint is the FULL MASTER READING, not a small placement card. Give a substantial, complete, connected interpretation of the whole chart and every applicable calculated method. Explain the person's character, motives, strengths, challenges, consequences, and the interaction of all layers in plain second-person language. For individual placement cards or small boxes elsewhere in the app, give a focused MINI READING: a self-contained meaningful paragraph describing that placement's WHAT, WHY, HOW, and consequence, not a fragment or keyword list. A mini reading is still a complete thought; the Master Reading is the full synthesis. Respond in natural prose without JSON or evidence IDs. Do not invent missing calculations." },
      { role: "user", content: "<chart_data>\n" + JSON.stringify(bindings.packet) + "\n</chart_data>" },
    ],
  });
  const choice = response.choices?.[0];
  if (!choice) throw new Error("MASTER_NARRATIVE_EMPTY: AI provider returned no response.");
  const content = choice.message.content;
  const text = (typeof content === "string" ? content : (content ?? []).filter(p => p.type === "text").map(p => (p as {text:string}).text).join("")).trim();
  if (!text) throw new Error("MASTER_NARRATIVE_EMPTY: AI provider returned no reading text.");
  const narrative: MasterNarrative = {
    answer: text,
    sections: [{ id: "complete-reading", title: "Your Complete Reading", text, findingIds: [] }],
    methodContributions: [],
    methodsReviewed: synthesis.sourceSnapshot.methodExecutionLedger.map(layer => layer.id),
  };
  return {
    ...synthesis,
    calculatedNarrative: synthesis.integratedNarrative,
    dominantConclusion: narrative.answer,
    integratedNarrative: [text],
    narrative,
    narrativeAudit: {
      passed: true,
      interpretedMethodIds: narrative.methodContributions.map(c => c.methodId),
      citedFindingIds: Array.from(new Set(narrative.sections.flatMap(s => s.findingIds))),
      validation: "direct-ai-prose" as const,
      inputCoverage: "complete-calculated-outcomes" as const,
    },
  };
}

// Concurrent screens reuse one narration. Failed generations are always retryable.
const cache = new Map<string, { expiresAt: number; promise: ReturnType<typeof generate> }>();
export async function narrateMasterSynthesis(synthesis: SynthesisResult, question: string) {
  // Never block raw calculated outcomes from reaching the provider because an interpretation audit failed.
  // Keep audit status in the supplied evidence instead.
  // Include actual judgments so a changed rule outcome never reuses old prose.
  const key = createHash("sha256").update(JSON.stringify([synthesis.sourceSnapshot, synthesis.mode, question.trim(), synthesis.methodOutcomes])).digest("hex");
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise;
  const promise = generate(synthesis, question);
  cache.set(key, { expiresAt: Date.now() + 10 * 60_000, promise });
  while (cache.size > 16) cache.delete(cache.keys().next().value!);
  try { return await promise; }
  catch (error) { if (cache.get(key)?.promise === promise) cache.delete(key); throw error; }
}
