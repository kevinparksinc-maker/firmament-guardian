import { createHash } from "node:crypto";
import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
import { FULL_SYNTHESIS_STYLE } from "../../master-interpreter";

import { buildNarrativePacket, buildNarrativeContract } from "./narrativePacket";
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
  const bindings = buildNarrativePacket(synthesis, question);
  const contract = buildNarrativeContract(bindings);
  const response = await invokeLLM({
    max_tokens: 3000,
    timeoutMs: 180_000,
    response_format: { type: "json_schema", json_schema: {name:"absolute_master_reading",strict:true,schema:contract.schema} },
    messages: [
      { role: "system", content: `${FULL_SYNTHESIS_STYLE}\n\nTHE ABSOLUTE — MASTER SYNTHESIS. Interpret ALL supplied method outcomes together. Answer the actual question first, then write 3–6 connected sections, roughly 450–650 words total across the sections. Explain WHAT the chart indicates, WHY the supplied formula/Canon gives that meaning, HOW distinct methods modify each other, concrete consequences/examples, and MEANING. Be direct and specific about both strengths and difficulties. Preserve natal/event scope and God/Agent frame. Do not invent biography, missing scores, predictions without timing evidence, or meanings for reference-only methods. Planetary strength is capacity, not automatic benefit. Reconcile conditions and strength rather than listing dictionaries. Full records are on My Chart; these excerpts are the question-focused outcomes for this overview.
Return the required JSON object. FIRST write contributions: one specific 20–35-word sentence for EVERY required method key, explaining how its supplied outcome shapes the assigned section. Each sentence must be at least 60 characters and must use that method's actual findings. Then answer in at least 60 characters. Then write the three sections s1/s2/s3: each has a title and 100–150 words of connected text, explaining the interaction of ALL method contributions assigned to it by sectionPlan. Each section must explain WHAT, WHY, HOW, concrete CONSEQUENCES and MEANING. Reconcile both support and pressure. Do not copy reference IDs into prose. The server binds every method contribution to its exact calculated findings and assigned section; do not return your own ID lists. No method may be omitted or merged out of the contributions object.` },
      { role: "user", content: `<chart_data>\n${JSON.stringify({...bindings.packet,sectionPlan:contract.plan})}\n</chart_data>` },
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
  const restored = contract.decode(raw) as Record<string, unknown>;
  // Status inventory is calculated metadata, not something a language model
  // must copy correctly. Actual interpreted coverage is still enforced through
  // every method's contribution and its citations in the visible sections.
  const narrative = validateMasterNarrative({ ...restored, methodsReviewed: synthesis.methodOutcomes.map(o => o.methodId) }, synthesis);
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
      inputCoverage: "all-methods-focused-findings" as const,
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
