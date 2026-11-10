import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { retrieveChartCanonDossier, canonDossierToEvidenceItems } from "./astrologyKnowledge/canon/retriever";
import { CHINESE_MANSIONS } from "./astrologyKnowledge/canon/chineseMansions28";
const input={location:"Las Vegas",latitude:36.1699,longitude:-115.1398,timezone:"America/Los_Angeles",date:"1999-01-17",time:"01:00",worldview:"agent" as const,readingScope:"natal" as const};
describe("Chinese Xiu classical canon integration",()=>{
 it("keeps all 28 traditional mansions with unique determinative stars",()=>{
  expect(CHINESE_MANSIONS).toHaveLength(28);
  expect(new Set(CHINESE_MANSIONS.map(m=>m.determinativeStar)).size).toBe(28);
  expect(new Set(CHINESE_MANSIONS.map(m=>m.quadrant)).size).toBe(4);
 });
 it("includes the full ancient Xiu catalog in Master Interpreter evidence without inventing sky boundaries",async()=>{
  const chart=await calculateChart(input);
  const dossier=retrieveChartCanonDossier(chart);
  const evidence=canonDossierToEvidenceItems(dossier).filter(x=>x.technique==="chinese-28-xiu");
  expect(evidence).toHaveLength(28);
  expect(evidence.some(x=>x.subject.includes("Jiao"))).toBe(true);
  expect(evidence.every(x=>x.statement.includes("NOT a verified natal placement"))).toBe(true);
  expect(dossier.placements.every(p=>p.chineseMansion===undefined)).toBe(true);
 });
});
