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
