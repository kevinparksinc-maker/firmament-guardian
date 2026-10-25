import { describe, expect, it } from "vitest";
import { describeJyotishHouse, getJyotishHouseGroups, JYOTISH_HOUSE_GROUPS } from "./jyotishHouseGroups";

describe("deterministic Jyotish bhava canon", () => {
  it("maps every house to exactly one purushartha", () => {
    const purposes = new Set(["dharma","artha","kama","moksha"]);
    for(let house=1;house<=12;house++) {
      const groups=getJyotishHouseGroups(house).filter(g=>purposes.has(g.id));
      expect(groups).toHaveLength(1);
    }
  });
  it("preserves overlapping classical classifications for the sixth house", () => {
    expect(getJyotishHouseGroups(6).map(g=>g.id)).toEqual(expect.arrayContaining(["artha","dusthana","upachaya","trishadaya","apoklima"]));
    expect(describeJyotishHouse(6)).toContain("coexists");
  });
  it("includes all classical kendra and trikona houses", () => {
    expect(JYOTISH_HOUSE_GROUPS.find(g=>g.id==="kendra")?.houses).toEqual([1,4,7,10]);
    expect(JYOTISH_HOUSE_GROUPS.find(g=>g.id==="trikona")?.houses).toEqual([1,5,9]);
  });
  it("rejects invalid house positions without manufacturing doctrine", () => {
    expect(getJyotishHouseGroups(0)).toHaveLength(0);
    expect(getJyotishHouseGroups(13)).toHaveLength(0);
    expect(getJyotishHouseGroups(2.5)).toHaveLength(0);
  });
});
