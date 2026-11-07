import {describe,it,expect} from "vitest";
import {buildUnifiedMasterChart} from "./masterChart/builder";
import {synthesizeMasterSnapshot} from "./astrologyKnowledge/synthesis/readingBridge";
import {buildNarrativePacket,restoreNarrativeIds} from "./astrologyKnowledge/synthesis/narrativePacket";
it("keeps every method in the provider overview while preserving the full chart ledger",async()=>{
 const snap=await buildUnifiedMasterChart({location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"natal"});
 const s=(await synthesizeMasterSnapshot(snap,"natal","purpose")).synthesis;
 const before=JSON.stringify(s.methodOutcomes),brief=buildNarrativePacket(s,"purpose and creativity");
 expect(brief.packet.methodOutcomes).toHaveLength(s.methodOutcomes.length);
 expect(brief.packet.methodOutcomes.filter(o=>o.status==="interpreted").every(o=>o.findingJudgments.length>0)).toBe(true);
 expect(JSON.stringify(brief.packet).length).toBeLessThan(15000);
 expect(JSON.stringify(s.methodOutcomes)).toBe(before);
 const first=brief.packet.methodOutcomes.find(o=>o.findingJudgments.length)!;
 const id=first.findingJudgments[0][8] as string;
 const restored=restoreNarrativeIds({sections:[{findingIds:[id]}],methodContributions:[{methodId:first.methodId,findingIds:[id]}],methodsReviewed:[first.methodId]},brief) as any;
 expect(restored.sections[0].findingIds[0]).toBe(brief.findingIds.get(id));
 expect(restored.methodContributions[0].methodId).toBe(first.originalMethodId);
});

it("requires every interpreted method in the provider schema and binds every contribution to its visible section",async()=>{
 const {buildNarrativeContract}=await import("./astrologyKnowledge/synthesis/narrativePacket");
 const snap=await buildUnifiedMasterChart({location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"natal"});
 const s=(await synthesizeMasterSnapshot(snap,"natal","purpose")).synthesis,bindings=buildNarrativePacket(s,"purpose"),contract=buildNarrativeContract(bindings);
 const active=bindings.packet.methodOutcomes.filter(o=>o.status==="interpreted");
 const schema=contract.schema as any;
 expect(schema.properties.contributions.required).toEqual(active.map(o=>o.methodId));
 expect(contract.plan.every(p=>p.methodIds.length>=2)).toBe(true);
 const raw={answer:"A complete answer based on these calculated findings.",contributions:Object.fromEntries(active.map(o=>[o.methodId,"This method contributes its measured finding and condition to the connected interpretation of the assigned section."])),sections:Object.fromEntries(contract.plan.map(p=>[p.id,{title:p.id,text:"A connected section."}]))};
 const decoded=contract.decode(raw) as any;
 expect(decoded.methodContributions).toHaveLength(active.length);
 for(const c of decoded.methodContributions)expect(decoded.sections.find((s:any)=>s.id===c.sectionIds[0]).findingIds).toEqual(expect.arrayContaining(c.findingIds));
});
