import {describe,it,expect} from "vitest";
import {calculateChart} from "../../astronomy";
import {buildAstrologyEvidencePacket,formatEvidencePacket} from "../evidencePacket";
describe("derived-premise before narrative contract",()=>{
 it("resolves actual chart ruler and numerical distributions from natal facts",async()=>{
  const chart=await calculateChart({location:"Las Vegas",latitude:36.1699,longitude:-115.1398,timezone:"America/Los_Angeles",date:"1999-01-17",time:"01:00",worldview:"agent",readingScope:"natal"});
  const evidence=buildAstrologyEvidencePacket(chart,"What distinguishes this person?","natal");
  const sheet=formatEvidencePacket(evidence);
  expect(sheet).toContain("DETERMINISTIC CHART DERIVATION");
  expect(sheet).toContain("CHART RULER");
  expect(sheet).toContain("PLANET ELEMENT COUNTS");
  expect(sheet).toContain("MODALITY COUNTS");
  expect(sheet).toContain("DISPOSITOR");
  expect(sheet.indexOf("DETERMINISTIC CHART DERIVATION")).toBeLessThan(sheet.indexOf("Western evidence"));
 });
});