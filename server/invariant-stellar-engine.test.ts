import { describe, expect, it } from "vitest";
import { InvariantStellarEngine } from "./invariant-stellar-engine";

const calibration = {
  planeNormal: {x:0,y:0,z:1},
  referenceDirection: {x:1,y:0,z:0},
  aldebaranDirection: {x:0,y:1,z:0},
  provenance: "Synthetic orthonormal fixture; NOT historical calibration",
};
describe("invariant stellar geometry",()=>{
  const engine=new InvariantStellarEngine(calibration);
  it("anchors Aldebaran at 15 Taurus",()=>{
    expect(engine.longitude(calibration.aldebaranDirection)).toBeCloseTo(45,10);
  });
  it("is invariant for repeated vectors",()=>{
    const v={x:0.5,y:0.8,z:0.1};
    expect(engine.longitude(v)).toBe(engine.longitude(v));
  });
  it("handles wraparound and twelve equal cusps",()=>{
    const cusps=engine.equalHouses(350);
    expect(cusps).toHaveLength(12);
    expect(cusps[0]).toBe(350);
    expect(cusps[1]).toBe(20);
  });
  it("rejects degenerate calibration",()=>{
    expect(()=>new InvariantStellarEngine({...calibration,planeNormal:{x:0,y:0,z:0}})).toThrow();
  });
});
