import { describe, expect, it } from "vitest";
import { calculateChart, longitudeFromXYZ } from "./astronomy";

describe("ACIF equatorial coordinate contract", () => {
  it("projects reference Sun equatorial XYZ without Aldebaran offset", () => {
    expect(longitudeFromXYZ({ x: -0.522999, y: -0.769010, z: -0.333466 })).toBeCloseTo(235.78, 2);
  });
  it("uses Moshier equatorial XYZ for all ten natal and transit bodies", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas", latitude: 32.7767, longitude: -96.797,
      timezone: "America/Chicago", date: "1986-11-20", time: "10:06",
      worldview: "god", readingScope: "natal",
    });
    const expected: Record<string, number> = {
      Sun: 235.78, Moon: 105.26, Mercury: 221.56, Venus: 212.75,
      Mars: 329.14, Jupiter: 345.06, Saturn: 249.18,
      Uranus: 260.33, Neptune: 274.54, Pluto: 220.83,
    };
    for (const body of chart.movingBodies) {
      expect(body.xyz, body.name).toBeDefined();
      expect(body.longitude, body.name).toBeCloseTo(expected[body.name], 1);
      expect(body.longitude, body.name).toBeCloseTo(longitudeFromXYZ(body.xyz!), 9);
    }
    expect(chart.validation.notes[0]).toContain("no sidereal or Aldebaran offset");
  });
});
