import { describe, expect, it } from "vitest";
import {agentHouseFor, equalHouseCusps, godHouseFor, guardianHouseAt, guardianHouseCusp, translateHouseLabelBetweenFrameworks, GUARDIAN_HOUSE_SEQUENCE, SIMULATION_LAB_HOUSE_SEQUENCE} from "./astrologyCore";
describe("Guardian reverse-numbered Agent houses", () => {
 it("uses the reverse numbering intended by 12 Gates and Simulation Lab", () => {
  expect(GUARDIAN_HOUSE_SEQUENCE).toBe("reverse-equal-30");
  expect(SIMULATION_LAB_HOUSE_SEQUENCE).toBe("reverse-equal-30");
 });
 it.each([0,210,240,359.5])("covers twelve 30° sectors at Ascendant %s", asc=>{
  const cusps=equalHouseCusps(asc);
  expect(cusps).toHaveLength(12);
  cusps.forEach((cusp,i)=>{
   expect(cusp).toBeCloseTo(guardianHouseCusp(i+1,asc),5);
   expect(agentHouseFor((cusp+0.01)%360,asc)).toBe(i+1);
  });
 });
 it("puts Sagittarius behind Scorpio, followed by Capricorn and Aquarius",()=>{
  expect(agentHouseFor(220,210)).toBe(1);
  expect(agentHouseFor(250,210)).toBe(12);
  expect(agentHouseFor(280,210)).toBe(11);
  expect(agentHouseFor(310,210)).toBe(10);
  expect(agentHouseFor(190,210)).toBe(2);
  expect(agentHouseFor(30,210)).toBe(7);
 });
 it("preserves the same absolute longitude while converting older forward labels",()=>{
  for(let segment=0;segment<12;segment++){
   const longitude=(210+segment*30+10)%360;
   const forward=segment+1;
   const reverse=guardianHouseAt(longitude,210);
   expect(translateHouseLabelBetweenFrameworks(forward)).toBe(reverse);
  }
 });
 it("keeps God View Aries-zero mapping unchanged",()=>{
  expect(godHouseFor(0)).toBe(1);
  expect(godHouseFor(359.999)).toBe(12);
  expect(()=>guardianHouseCusp(13,210)).toThrow();
 });
});