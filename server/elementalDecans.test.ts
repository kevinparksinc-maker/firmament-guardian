import { describe, expect, it } from "vitest";
import { DECANS, ELEMENTAL_DECAN_SIGNS, overlay } from "../shared/hybrid";
import { DECAN_CANON_RECORDS, getDecanCanonByLongitude } from "./astrologyKnowledge/canon/decans36";

describe("12 Gates elemental-family decans",()=>{
  it("covers 36 distinct consecutive 10-degree segments",()=>{
    expect(DECANS).toHaveLength(36);
    expect(DECAN_CANON_RECORDS).toHaveLength(36);
    for(let index=0;index<36;index++){
      const record=getDecanCanonByLongitude(index*10+5);
      expect(record.index).toBe(index+1);
      expect(record.decanNumber).toBe(index%3+1);
      expect(record.elementalFamilySign).toBe(ELEMENTAL_DECAN_SIGNS[Math.floor(index/3)][index%3]);
      expect(overlay(index*10+5).decan).toBe(record.label);
      expect(record.degreeRange).toEqual([index*10,index*10+10]);
      expect(record.behavioralNuance).not.toMatch(/Chaldean face|planetary hour/i);
    }
  });
  it("cycles through each sign's elemental family, not the Chaldean sequence",()=>{
    expect(DECANS.slice(0,3)).toEqual([
      "Aries (Aries 1st elemental decan)",
      "Leo (Aries 2nd elemental decan)",
      "Sagittarius (Aries 3rd elemental decan)",
    ]);
    expect(DECANS.slice(21,24)).toEqual([
      "Scorpio (Scorpio 1st elemental decan)",
      "Pisces (Scorpio 2nd elemental decan)",
      "Cancer (Scorpio 3rd elemental decan)",
    ]);
  });
  it("handles segment boundaries and wraps around the wheel",()=>{
    expect(getDecanCanonByLongitude(9.999).index).toBe(1);
    expect(getDecanCanonByLongitude(10).index).toBe(2);
    expect(getDecanCanonByLongitude(360).index).toBe(1);
    expect(getDecanCanonByLongitude(-0.01).index).toBe(36);
  });
});
