import { describe, expect, it } from "vitest";
import { agentHouseFor, equalHouseCusps, godHouseFor, guardianHouseAt, guardianHouseCusp, translateHouseLabelBetweenFrameworks, GUARDIAN_HOUSE_SEQUENCE, SIMULATION_LAB_HOUSE_SEQUENCE } from "./astrologyCore";
describe("Guardian natal equal-house contract",()=>{
 it("retains forward natal houses and explicit separate Lab reverse convention",()=>{
  expect(GUARDIAN_HOUSE_SEQUENCE).toBe("forward-equal-30");
  expect(SIMULATION_LAB_HOUSE_SEQUENCE).toBe("reverse-equal-30");
 });
 it.each([0,210,240,277.35,359.5])("maintains twelve forward houses from Ascendant %s",asc=>{
  const cusps=equalHouseCusps(asc);
  expect(cusps).toHaveLength(12);
  cusps.forEach((cusp,i)=>{
   expect(cusp).toBeCloseTo(guardianHouseCusp(i+1,asc),5);
   expect(agentHouseFor((cusp+0.01)%360,asc)).toBe(i+1);
  });
 });
 it("keeps a Scorpio Sun in 11th house with a Capricorn 7°22 Ascendant",()=>{
  expect(agentHouseFor(238.033333,277.366667)).toBe(11);
 });
 it("never applies Lab reversed labels without an explicit conversion",()=>{
  expect(translateHouseLabelBetweenFrameworks(11)).toBe(3);
  expect(agentHouseFor(238.033333,277.366667)).toBe(11);
 });
 it("preserves fixed God numbering and validates house labels",()=>{
  expect(godHouseFor(0)).toBe(1);
  expect(godHouseFor(359.999)).toBe(12);
  expect(()=>guardianHouseCusp(13,0)).toThrow();
 });
});