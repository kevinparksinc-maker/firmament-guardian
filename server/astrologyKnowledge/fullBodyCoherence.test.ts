import {describe,it,expect} from "vitest";
import {calculateChart} from "../astronomy";
import {buildAstrologyEvidencePacket} from "./evidencePacket";
import {FIXED_STARS} from "../../shared/hybrid";
import {CHINESE_MANSIONS} from "./canon/chineseMansions28";
const profile={location:"Las Vegas",latitude:36.1699,longitude:-115.1398,timezone:"America/Los_Angeles",date:"1999-01-17",time:"01:00",worldview:"agent" as const,readingScope:"natal" as const};
describe("end-to-end universal natal coverage",()=>{
 it("evaluates every supplied planet in the Western Vedic and Arabic first-pass outputs regardless of question",async()=>{
   const chart=await calculateChart(profile);
   const packet=buildAstrologyEvidencePacket(chart,"Tell me about relationships","natal");
   for(const row of chart.movingBodies){
     expect(packet.westernEvidence.some(e=>e.technique==="calculation"&&e.subject===row.name),row.name+" western").toBe(true);
     expect(packet.vedicEvidence.some(e=>e.technique==="nakshatra"&&e.subject===row.name),row.name+" vedic").toBe(true);
     expect(packet.arabicEvidence.some(e=>e.technique==="manzil"&&e.subject===row.name),row.name+" arabic").toBe(true);
   }
   expect(packet.canonEvidence.filter(e=>e.technique==="chinese-28-xiu")).toHaveLength(CHINESE_MANSIONS.length);
   expect(packet.vedicEvidence.some(e=>e.technique==="dasha")).toBe(true);
   expect(packet.vedicEvidence.some(e=>e.technique==="ashtakavarga")).toBe(true);
 });
 it("retains fixed-star oppositions to permanent canon anchors in evidence",async()=>{
   const chart=await calculateChart(profile);
   chart.movingBodies[0]={...chart.movingBodies[0],longitude:(FIXED_STARS[2][1]+180)%360,display:"Scorpio 15°00′"};
   const packet=buildAstrologyEvidencePacket(chart,"What are my gifts?","natal");
   expect(packet.fixedStarEvidence.some(e=>e.subject==="Sun"&&e.statement.includes("opposition")&&e.statement.includes("Aldebaran"))).toBe(true);
 });
});