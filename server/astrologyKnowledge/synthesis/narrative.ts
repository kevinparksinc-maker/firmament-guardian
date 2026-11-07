import { createHash } from "node:crypto";
import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
import { buildAstrologyInterpreterSystem } from "../../master-interpreter";
import { formatSynthesisContext } from "./context";
import type { SynthesisResult } from "./types";

const narrativeSchema = z.object({
  answer: z.string().trim().min(60).max(1600),
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().trim().min(3).max(120),
    text: z.string().trim().min(160).max(3500),
    findingIds: z.array(z.string()).min(2),
  })).min(3).max(9),
  methodContributions: z.array(z.object({
    methodId: z.string(),
    sectionIds: z.array(z.string()).min(1),
    findingIds: z.array(z.string()).min(1),
    contribution: z.string().trim().min(60).max(1400),
  })),
  methodsReviewed: z.array(z.string()),
});
export type MasterNarrative = z.infer<typeof narrativeSchema>;

/** Verify narrative lineage separately from the calculation coverage audit. */
export function validateMasterNarrative(raw: unknown, synthesis: SynthesisResult): MasterNarrative {
  const result = narrativeSchema.parse(raw);
  const fail = (reason: string): never => { throw new Error(`MASTER_NARRATIVE_INVALID: ${reason}`); };
  if (!synthesis.qualityAudit.passed || !synthesis.methodOutcomeAudit.complete)
    fail("Calculated method judgments did not pass their publication audit.");
  const outcomes = new Map(synthesis.methodOutcomes.map(o => [o.methodId, o]));
  const active = synthesis.methodOutcomes.filter(o => o.status === "interpreted");
  const findings = new Map(active.flatMap(o => o.findingJudgments.map(f => [f.id, { finding: f, methodId: o.methodId }] as const)));
  const reviewed = new Set(result.methodsReviewed);
  if (reviewed.size !== result.methodsReviewed.length || reviewed.size !== outcomes.size || Array.from(outcomes.keys()).some(id => !reviewed.has(id)))
    fail("Every supplied method status must be reviewed exactly once.");
  const sections = new Map(result.sections.map(s => [s.id, s]));
  if (sections.size !== result.sections.length) fail("Duplicate section IDs.");
  const usedValences = new Set<string>();
  for (const section of result.sections) {
    const witnesses = section.findingIds.map(id => findings.get(id) ?? fail(`Unknown or unavailable finding ${id}.`));
    if (new Set(witnesses.map(w => w.methodId.replace(/^transit:/, ""))).size < 2)
      fail(`Section ${section.id} must connect at least two distinct methods.`);
    witnesses.forEach(w => usedValences.add(w.finding.valence));
  }
  const contributions = new Map(result.methodContributions.map(c => [c.methodId, c]));
  if (contributions.size !== result.methodContributions.length || contributions.size !== active.length || active.some(o => !contributions.has(o.methodId)))
    fail("Every interpreted method requires its own evidence-linked contribution.");
  for (const contribution of result.methodContributions) {
    if (outcomes.get(contribution.methodId)?.status !== "interpreted") fail("Unavailable methods cannot contribute personal judgments.");
    for (const id of contribution.findingIds) {
      if (findings.get(id)?.methodId !== contribution.methodId) fail(`Finding ${id} belongs to a different method or chart scope.`);
      if (!contribution.sectionIds.some(sectionId => sections.get(sectionId)?.findingIds.includes(id)))
        fail(`Contribution ${contribution.methodId} is detached from the visible reading.`);
    }
    for (const id of contribution.sectionIds) {
      const section = sections.get(id) ?? fail(`Unknown section ${id}.`);
      if (!section.findingIds.some(f => contribution.findingIds.includes(f))) fail(`Section ${id} does not use the claimed contribution.`);
    }
  }
  for (const valence of ["supportive", "challenging"])
    if (active.some(o => o.findingJudgments.some(f => f.valence === valence)) && !usedValences.has(valence))
      fail(`The reading omits calculated ${valence} testimony.`);
  return result;
}

async function generate(synthesis: SynthesisResult, question: string) {
  if (!synthesis.qualityAudit.passed || !synthesis.methodOutcomeAudit.complete)
    throw new Error("MASTER_NARRATIVE_BLOCKED: Complete calculated judgments are required before narration.");
  const response = await invokeLLM({
    max_tokens: 8000,
    timeoutMs: 180_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildAstrologyInterpreterSystem(`Write the actual Master Synthesis for the selected mode and question. Read EVERY supplied finding judgment before composing a connected reading. This is the primary reading, not a method inventory or a predetermined life story. Answer first. Then write 3–9 sections, about 700–1200 words across the sections, organized around the question's real themes. Each section must explain WHAT the pattern indicates, WHY the actual Canon assigns that meaning, HOW at least two distinct methods modify each other, a concrete CONSEQUENCE/example, and the MEANING. Preserve support, friction, relative strength, source limitations, natal/event scope and God/Agent frame. Do not call related derivatives independent confirmations or turn geometric star contacts without doctrine into predictions. Respect elemental-family decans. Do not fabricate absent methods or easing windows.
Return JSON {"answer":"direct synthesized answer", "sections":[{"id":"section-1","title":"...","text":"connected prose","findingIds":["exact findingId from the supplied judgment rows"]}],"methodContributions":[{"methodId":"exact method ID","sectionIds":["section-1"],"findingIds":["finding from THIS method, also cited by that section"],"contribution":"Explain the specific finding and exactly how it strengthens, qualifies or conflicts with the section's conclusion. A method name or count is insufficient."}],"methodsReviewed":["every supplied method ID, including unavailable statuses"]}. Every interpreted method, including separate transit: methods, needs exactly one contribution, tied to the sections that actually use it. Every section must cite findings from at least two distinct method families. Reference-only, no-result, failed and inapplicable methods receive no personal contribution. Use original findingId strings, never evidence IDs or numeric table references. Integrate all applicable methods across the sections; do not append disconnected doctrine summaries. The reader's observed history is not supplied by chart symbolism.`) },
      { role: "user", content: `Reading mode: ${synthesis.mode}\nQuestion: ${question}\n${formatSynthesisContext(synthesis)}` },
    ],
  });
  const choice = response.choices?.[0];
  if (!choice || ["length", "max_tokens"].includes(choice.finish_reason ?? ""))
    throw new Error("MASTER_NARRATIVE_INCOMPLETE: The provider did not return a complete synthesis.");
  const content = choice.message.content;
  const text = typeof content === "string" ? content : content.filter(p => p.type === "text").map(p => (p as {text:string}).text).join("");
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "")); }
  catch { throw new Error("MASTER_NARRATIVE_INVALID: The provider returned unreadable synthesis data."); }
  const narrative = validateMasterNarrative(raw, synthesis);
  return {
    ...synthesis,
    calculatedNarrative: synthesis.integratedNarrative,
    dominantConclusion: narrative.answer,
    integratedNarrative: narrative.sections.map(s => `${s.title}\n\n${s.text}`),
    narrative,
    narrativeAudit: {
      passed: true,
      interpretedMethodIds: narrative.methodContributions.map(c => c.methodId),
      citedFindingIds: Array.from(new Set(narrative.sections.flatMap(s => s.findingIds))),
      // Citation validation certifies lineage, not the factual truth of model prose.
      validation: "method-and-finding-lineage" as const,
    },
  };
}

// Concurrent screens reuse one narration. Failed generations are always retryable.
const cache = new Map<string, { expiresAt: number; promise: ReturnType<typeof generate> }>();
export async function narrateMasterSynthesis(synthesis: SynthesisResult, question: string) {
  if (!synthesis.qualityAudit.passed || !synthesis.methodOutcomeAudit.complete)
    throw new Error("MASTER_NARRATIVE_BLOCKED: Complete calculated judgments are required before narration.");
  // Include actual judgments so a changed rule outcome never reuses old prose.
  const key = createHash("sha256").update(JSON.stringify([synthesis.snapshotId, synthesis.mode, question.trim(), synthesis.methodOutcomes])).digest("hex");
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise;
  const promise = generate(synthesis, question);
  cache.set(key, { expiresAt: Date.now() + 10 * 60_000, promise });
  while (cache.size > 16) cache.delete(cache.keys().next().value!);
  try { return await promise; }
  catch (error) { if (cache.get(key)?.promise === promise) cache.delete(key); throw error; }
}
