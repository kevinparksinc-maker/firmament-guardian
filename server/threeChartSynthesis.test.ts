import { describe, expect, it } from "vitest";
import type { ChartResult } from "./astronomy";
import { buildThreeChartTestimony, threeChartJudgmentInstructions } from "./threeChartSynthesis";

const row = (name: string, longitude: number, agentHouse: number, godHouse: number) => ({
  name, longitude, display: name + " 12°", house: agentHouse,
  agentHouse, godHouse, overlay: {} as never,
});

function fixture(): ChartResult {
  return {
    worldview: "agent-vs-god", readingScope: "combined",
    agentViewAvailable: true, houses: Array.from({ length: 12 }, (_, i) => i * 30),
    ascendant: row("Ascendant", 0, 1, 1), descendant: null, midheaven: null,
    northNode: row("North Node", 40, 2, 2), southNode: row("South Node", 220, 8, 8),
    movingBodies: [row("Sun", 42, 2, 2)], frozenStars: [], godPlacements: [],
    transits: [{
      ...row("Mars", 132, 5, 5),
      natalContacts: [{ natalName: "Sun", aspect: "square", orb: 0.5 }],
      minorNatalContacts: [],
    }],
    transitDate: "2026-11-18T12:00:00.000Z",
  } as unknown as ChartResult;
}

describe("Horary-style three-chart testimony", () => {
  it("keeps natal mode free of the current sky", () => {
    const result = buildThreeChartTestimony(fixture(), "natal");
    expect(result.currentGod).toBeNull();
    expect(result.transitContacts).toEqual([]);
    expect(result.natalAgent.placements[0].longitude).toBe(result.natalGod.placements[0].longitude);
    expect(threeChartJudgmentInstructions("natal")).toContain("Do not introduce today's sky");
  });

  it("preserves calculated cross-chart contacts without double-counting birth positions", () => {
    const result = buildThreeChartTestimony(fixture(), "combined");
    expect(result.natalAgent.placements[0].body).toBe("Sun");
    expect(result.natalGod.placements[0].body).toBe("Sun");
    expect(result.safeguards.sharedBirthPositionsCountOnce).toBe(true);
    expect(result.currentGod?.placements[0].body).toBe("Mars");
    expect(result.transitContacts).toEqual([
      { from: "Mars", to: "Sun", aspect: "square", orb: 0.5, weight: 1 },
    ]);
  });

  it("does not invent personal houses without an Agent frame", () => {
    const chart = { ...fixture(), agentViewAvailable: false, ascendant: null };
    const result = buildThreeChartTestimony(chart, "combined");
    expect(result.natalAgent.available).toBe(false);
    expect(result.natalAgent.houses).toEqual([]);
    expect(result.natalAgent.ascendant).toBeNull();
  });
});
