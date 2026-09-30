import sweph from "sweph";
import { describe, expect, it } from "vitest";
import { calculateLookahead } from "./horaryLookahead";

describe("horary planetary look-ahead", () => {
  it("returns ordered exact contacts and stations within their configured windows", () => {
    const startJd = Number(sweph.julday(2024, 7, 15, 16 + 34 / 60, 1));
    const result = calculateLookahead(startJd, "America/New_York");
    const startMs = Date.parse("2024-07-15T16:34:00.000Z");
    const moonEndMs = startMs + result.moonWindowDays * 86_400_000;
    const endMs = startMs + result.windowDays * 86_400_000;

    expect(result).toMatchObject({ windowDays: 90, moonWindowDays: 3 });
    expect(result.upcomingAspects.length).toBeGreaterThan(0);
    expect(result.stations.length).toBeGreaterThan(0);
    expect(result.upcomingAspects).toEqual([...result.upcomingAspects].sort(
      (left, right) => Date.parse(left.exactAtUtc) - Date.parse(right.exactAtUtc),
    ));

    for (const aspect of result.upcomingAspects) {
      const at = Date.parse(aspect.exactAtUtc);
      expect(at).toBeGreaterThanOrEqual(startMs - 60_000);
      expect(at).toBeLessThanOrEqual(endMs + 60_000);
      expect(aspect.exactAtLocal).toContain("2024");
      if (aspect.first === "Moon" || aspect.second === "Moon") {
        expect(at).toBeLessThanOrEqual(moonEndMs + 60_000);
      }
    }

    for (const station of result.stations) {
      const at = Date.parse(station.atUtc);
      expect(at).toBeGreaterThanOrEqual(startMs - 60_000);
      expect(at).toBeLessThanOrEqual(endMs + 60_000);
      expect(["retrograde", "direct"]).toContain(station.turns);
    }
  });

  it("does not emit duplicate exact contacts", () => {
    const startJd = Number(sweph.julday(2024, 7, 15, 16 + 34 / 60, 1));
    const result = calculateLookahead(startJd, "America/New_York");
    const keys = result.upcomingAspects.map(row => `${row.first}|${row.second}|${row.aspect}|${row.exactAtUtc}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
