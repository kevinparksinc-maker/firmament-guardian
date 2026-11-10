import {describe,it,expect} from "vitest";
import {computeFixedChart} from "./fixed-chart-pipeline";
const calibration={
  planeNormal:{x:0,y:0,z:1},
  referenceDirection:{x:1,y:0,z:0},
  aldebaranDirection:{x:0,y:1,z:0},
  provenance:"Synthetic coordinate fixture; not historical calibration",
};
describe("unified fixed chart pipeline",()=>{
  const input={
    calibration,
    natal:{Sun:{x:1,y:0,z:0},Moon:{x:0,y:1,z:0}},
    transits:{Sun:{x:1,y:0,z:0},Moon:{x:0,y:1,z:0}},
    natalLocalHourAngleDegrees:270,
    transitLocalHourAngleDegrees:270,
  };
  it("anchors the calibration star",()=>{
    expect(computeFixedChart(input).aldebaranLongitude).toBeCloseTo(45,9);
  });
  it("calculates twelve 30-degree equal houses",()=>{
    const result=computeFixedChart(input);
    expect(result.natalAscendant).toBe(0);
    expect(result.natalHouses).toHaveLength(12);
    expect(result.natalHouses[11]).toBe(330);
    expect(result.natal.Moon.agentHouse).toBe(2);
  });
  it("retains independent mansion and decan indexes",()=>{
    const moon=computeFixedChart(input).natal.Moon;
    expect(moon.nakshatra).toBe(4);
    expect(moon.arabicMansion).toBe(4);
    expect(moon.decan).toBe(2);
  });
  it("computes five major aspects and counts conjunctions harmonious",()=>{
    const result=computeFixedChart(input);
    const conjunction=result.contacts.find(c=>c.transitName==="Sun"&&c.natalName==="Sun");
    expect(conjunction?.angle).toBe(0);
    expect(conjunction?.harmonious).toBe(true);
  });
});
