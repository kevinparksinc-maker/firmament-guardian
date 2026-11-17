import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { calculateEnergyStarsAndLots } from "../shared/energyStarsAndLots";
import { normalizeLongitude } from "../shared/hybrid";

const baseInput = {
  location: "Dallas, Texas, USA",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
  transitLocation: "Las Vegas, Nevada, USA",
  transitLatitude: 36.1699,
  transitLongitude: -115.1398,
  transitTimezone: "America/Los_Angeles",
  transitDate: "2026-11-06",
  transitTime: "11:06",
  worldview: "agent" as const,
  readingScope: "combined" as const,
};

function shortestAngle(a: number, b: number) {
  const diff = Math.abs(normalizeLongitude(a - b));
  return Math.min(diff, 360 - diff);
}

describe("Fixed Stars & Hermetic Arabic Lots for Energy Read", () => {
  it("computes all 7 Hermetic Lots using sect-appropriate formulas and transit-to-lot weights", async () => {
    const chart = await calculateChart(baseInput);
    const result = calculateEnergyStarsAndLots(chart);

    expect(result.lotsAvailable).toBe(true);
    expect(result.lots).toHaveLength(7);

    const sun = chart.movingBodies.find((b) => b.name === "Sun")!;
    const moon = chart.movingBodies.find((b) => b.name === "Moon")!;
    const asc = chart.ascendant!.longitude;
    const isDay = result.sect === "day";

    const fortune = result.lots.find((l) => l.meta.id === "fortune")!;
    const spirit = result.lots.find((l) => l.meta.id === "spirit")!;
    const expectedFortune = isDay
      ? normalizeLongitude(asc + moon.longitude - sun.longitude)
      : normalizeLongitude(asc + sun.longitude - moon.longitude);
    const expectedSpirit = isDay
      ? normalizeLongitude(asc + sun.longitude - moon.longitude)
      : normalizeLongitude(asc + moon.longitude - sun.longitude);

    expect(shortestAngle(fortune.longitude, expectedFortune)).toBeLessThan(0.01);
    expect(shortestAngle(spirit.longitude, expectedSpirit)).toBeLessThan(0.01);

    for (const hit of result.activeLotHits) {
      expect(hit.aspect.orbDeg).toBeLessThanOrEqual(5);
      if (hit.aspect.isMajor) {
        expect(hit.aspect.weight).toBeGreaterThan(0);
      } else {
        expect(hit.aspect.weight).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it("switches Fortune and Spirit formulas between Day and Night charts", async () => {
    const dayChart = await calculateChart(baseInput);
    const nightChart = await calculateChart({
      ...baseInput,
      time: "22:30",
    });

    const dayRes = calculateEnergyStarsAndLots(dayChart);
    const nightRes = calculateEnergyStarsAndLots(nightChart);

    expect(dayRes.sect).toBe("day");
    expect(nightRes.sect).toBe("night");
    expect(dayRes.lots[0].formulaUsed).toBe("Asc + Moon − Sun");
    expect(nightRes.lots[0].formulaUsed).toBe("Asc + Sun − Moon");
  });

  it("enforces 5 degree orb on Royal Stars and 2 degree orb on non-Royal Stars", async () => {
    const chart = await calculateChart(baseInput);
    const result = calculateEnergyStarsAndLots(chart);
    const allStars = [
      ...result.liveSkyStars,
      ...result.natalTriggeredStars,
      ...result.natalAnchorStars,
    ];

    expect(allStars.length).toBeGreaterThan(0);
    for (const star of allStars) {
      if (star.isRoyal) {
        expect(star.orbDeg).toBeLessThanOrEqual(5.0);
      } else {
        expect(star.orbDeg).toBeLessThanOrEqual(2.0);
      }
    }
  });

  it("gracefully degrades Lots when Ascendant is unavailable while preserving Fixed Stars", async () => {
    const chart = await calculateChart(baseInput);
    const noAsc = { ...chart, ascendant: null };
    const result = calculateEnergyStarsAndLots(noAsc);

    expect(result.lotsAvailable).toBe(false);
    expect(result.lotsUnavailableReason).toMatch(/Ascendant|birth time/i);
    expect(result.lots).toEqual([]);
    expect(result.activeLotHits).toEqual([]);
    expect(
      result.liveSkyStars.length +
        result.natalTriggeredStars.length +
        result.natalAnchorStars.length
    ).toBeGreaterThan(0);
    expect(result.natalStarPositions.length).toBe(30);
  });

  it("maps every Fixed Star (including Algol) and Arabic Lot to a standalone Natal House & Sign reading even without aspects", async () => {
    const chart = await calculateChart(baseInput);
    const result = calculateEnergyStarsAndLots(chart);

    expect(result.natalStarPositions.length).toBe(30);

    const algol = result.natalStarPositions.find((s) => s.starName === "Algol")!;
    expect(algol).toBeTruthy();
    expect(algol.sign).toBe("Taurus");
    expect(algol.house).toBeGreaterThanOrEqual(1);
    expect(algol.house).toBeLessThanOrEqual(12);
    expect(algol.personalHouseReading).toContain(`House ${algol.house}`);
    expect(algol.sabotageOrShadowRisk.toLowerCase()).toContain("sabotage");

    const fortune = result.lots.find((l) => l.meta.id === "fortune")!;
    expect(fortune).toBeTruthy();
    expect(fortune.personalPlacementReading).toContain(fortune.sign);
    expect(fortune.personalPlacementReading).toContain(`House ${fortune.house}`);
    expect(fortune.personalPlacementReading).toContain(fortune.houseArena);
  });
});
