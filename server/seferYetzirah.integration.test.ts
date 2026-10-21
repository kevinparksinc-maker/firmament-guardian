import {describe,expect,it} from "vitest";
import {calculateChart} from "./astronomy";
import {MOTHER_LETTERS,DOUBLE_LETTERS,SIMPLE_LETTERS,FOUR_WORLDS,seferYetzirahEvidence} from "./astrologyKnowledge/canon/seferYetzirah";
import {buildAstrologyEvidencePacket} from "./astrologyKnowledge/evidencePacket";
describe("Sefer Yetzirah / Four Worlds evidence integration",()=>{
 it("preserves the textual 3+7+12 letter structure and distinct Four Worlds",()=>{
  expect(MOTHER_LETTERS).toHaveLength(3);expect(DOUBLE_LETTERS).toHaveLength(7);
  expect(SIMPLE_LETTERS).toHaveLength(12);expect(FOUR_WORLDS).toHaveLength(4);
  expect(SIMPLE_LETTERS.map(r=>r.sign)).toEqual(["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]);
 });
 it("maps each actual planet to its signed correspondence with explicit variant labels",async()=>{
  const chart=await calculateChart({location:"Dallas, Texas, USA",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",worldview:"agent",readingScope:"natal"});
  const items=seferYetzirahEvidence(chart);
  expect(items.filter(i=>i.technique==="sefer-yetzirah-simples")).toHaveLength(chart.movingBodies.length);
  expect(items.find(i=>i.id==="sy-natal-double-saturn")?.statement).toContain("symbolic quality");
  expect(items.find(i=>i.id==="sy-four-worlds")?.statement).toContain("distinct from Sefer Yetzirah");
  expect(items.every(i=>i.sourceTrace.sourceUrl?.startsWith("https://"))).toBe(true);
  const transitItems=seferYetzirahEvidence(chart,"transit");
  expect(transitItems.filter(i=>i.technique==="sefer-yetzirah-simples")).toHaveLength(chart.transits.length);
  expect(transitItems.some(i=>i.id==="sy-transit-simple-sun")).toBe(chart.transits.some(r=>r.name==="Sun"));
  expect(transitItems.every(i=>i.id.startsWith("sy-transit-"))).toBe(true);
 });
});
