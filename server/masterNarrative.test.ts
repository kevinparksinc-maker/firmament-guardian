import { MASTER_METHOD_IDS } from "./masterChart/registry";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart/builder";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import { narrateMasterSynthesis, validateMasterNarrative, type MasterNarrative } from "./astrologyKnowledge/synthesis/narrative";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import { invokeLLM } from "./_core/llm";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
let synthesis: SynthesisResult;
function response(): MasterNarrative {
  const active = synthesis.methodOutcomes.filter(o => o.status === "interpreted");
  const sections = Array.from({length:3}, (_, i) => ({id:`section-${i}`, title:`Connected chart theme ${i}`, text:"The supplied chart findings combine a specific strength with its conditioning pressure. The placement and its mansion describe different facets of the same subject, and their conditions shape how that theme is expressed.", findingIds:[] as string[]}));
  const methodContributions = active.map((o,i) => {
    const section = sections[i % 3];
    section.findingIds.push(o.findingJudgments[0].id);
    return {methodId:o.methodId, sectionIds:[section.id], findingIds:[o.findingJudgments[0].id], contribution:o.findingJudgments[0].judgment};
  });
  for (const valence of ["supportive","challenging"] as const) {
    const f = active.flatMap(o=>o.findingJudgments).find(f=>f.valence===valence);
    if (f) sections[0].findingIds.push(f.id);
  }
  return {answer:"The chart's specific strengths and pressures are interpreted together in this connected reading, preserving their distinct scopes.", sections, methodContributions, methodsReviewed:synthesis.methodOutcomes.map(o=>o.methodId)};
}
function provider(value: unknown, finish_reason = "stop") {
  return {id:"test",created:0,model:"test",choices:[{index:0,finish_reason,message:{role:"assistant" as const,content:JSON.stringify(value)}}]};
}
beforeAll(async()=>{
  const snapshot=await buildUnifiedMasterChart({location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"combined",transitDate:"2026-11-06",transitTime:"16:22",transitLocation:"Las Vegas",transitLatitude:36.1699,transitLongitude:-115.1398,transitTimezone:"America/Los_Angeles"});
  synthesis=(await synthesizeMasterSnapshot(snapshot,"combined","Read the selected moment")).synthesis;
});
beforeEach(()=>vi.mocked(invokeLLM).mockReset());
describe("Visible Master Synthesis publication",()=>{
  it("accepts separately scoped, evidence-linked contributions from every interpreted method",()=>{
    expect(synthesis.methodOutcomes).toHaveLength(MASTER_METHOD_IDS.length * 2);
    expect(validateMasterNarrative(response(),synthesis).methodContributions.length).toBeGreaterThan(20);
  });
  it("rejects a reviewed method list that hides a missing actual contribution",()=>{
    const r=response(); r.methodContributions.pop();
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow("Every interpreted method");
  });
  it("rejects cross-method or natal/event citation swapping",()=>{
    const r=response(); r.methodContributions[0].findingIds=[r.methodContributions[1].findingIds[0]];
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow("different method or chart scope");
  });
  it("rejects a valid method contribution detached from the visible sections",()=>{
    const r=response(); const c=r.methodContributions[0]; r.sections.forEach(s=>s.findingIds=s.findingIds.filter(id=>!c.findingIds.includes(id)));
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow("detached");
  });
  it("rejects invented finding citations and unavailable doctrine",()=>{
    const r=response(); r.sections[0].findingIds.push("chinese-invented-finding");
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow("Unknown or unavailable");
  });
  it("rejects paragraphs that only re-list one method",()=>{
    const r=response(); r.sections[0].findingIds=[r.methodContributions[0].findingIds[0],r.methodContributions[0].findingIds[0]];
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow("two distinct methods");
  });
  it("requires pressure as well as support when the chart contains both",()=>{
    const r=response(); const friction=new Set(synthesis.methodOutcomes.flatMap(o=>o.findingJudgments.filter(f=>f.valence==="challenging").map(f=>f.id)));
    r.sections.forEach(s=>s.findingIds=s.findingIds.filter(id=>!friction.has(id)));
    r.methodContributions=r.methodContributions.map(c=>{
      const o=synthesis.methodOutcomes.find(o=>o.methodId===c.methodId)!;
      const f=o.findingJudgments.find(f=>f.valence!=="challenging");
      if(f){c.findingIds=[f.id];r.sections.find(s=>s.id===c.sectionIds[0])!.findingIds.push(f.id);}
      return c;
    });
    expect(()=>validateMasterNarrative(r,synthesis)).toThrow();
  });
  it("blocks narration before calling a provider if calculation audit failed",async()=>{
    await expect(narrateMasterSynthesis({...synthesis,qualityAudit:{...synthesis.qualityAudit,passed:false}},"blocked")).rejects.toThrow("BLOCKED");
    expect(invokeLLM).not.toHaveBeenCalled();
  });
  it("returns generated prose in the display fields and retains calculation evidence separately",async()=>{
    const r=response(); vi.mocked(invokeLLM).mockResolvedValue(provider(r));
    const [a,b]=await Promise.all([narrateMasterSynthesis(synthesis,"connected display"),narrateMasterSynthesis(synthesis,"connected display")]);
    expect(a).toBe(b); expect(invokeLLM).toHaveBeenCalledTimes(1);
    expect(a.integratedNarrative[0]).toContain(r.sections[0].text);
    expect(a.dominantConclusion).toBe(r.answer);
    expect(a.calculatedNarrative).toEqual(synthesis.integratedNarrative);
    const request=vi.mocked(invokeLLM).mock.calls[0][0];
    for(const o of synthesis.methodOutcomes) expect(request.messages[1].content).toContain(o.methodId);
    expect(request.messages[1].content).toContain("findingId");
  });
  it("does not cache provider failures or publish truncated output",async()=>{
    vi.mocked(invokeLLM).mockResolvedValueOnce(provider(response(),"length")).mockResolvedValueOnce(provider(response()));
    await expect(narrateMasterSynthesis(synthesis,"retry narrative")).rejects.toThrow("INCOMPLETE");
    await expect(narrateMasterSynthesis(synthesis,"retry narrative")).resolves.toHaveProperty("narrativeAudit.passed",true);
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });
});
