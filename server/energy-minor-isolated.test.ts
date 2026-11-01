import { describe, expect, it } from "vitest";
import { aspectBetween, minorAspectBetween } from "./astronomy";

describe("isolated minor transit aspects", () => {
  it.each([
    [45, "semisquare", "friction"],
    [135, "sesquiquadrate", "friction"],
    [150, "quincunx", "contextual"],
  ] as const)("detects %s degrees as %s", (angle, aspect, classification) => {
    expect(minorAspectBetween(0, angle)).toEqual({ aspect, classification, orb: 0, weightMultiplier: 0.5 });
  });
  it("limits minor orb to two degrees", () => {
    expect(minorAspectBetween(0, 47)?.orb).toBe(2);
    expect(minorAspectBetween(0, 47.01)).toBeNull();
  });
  it("excludes semi-sextiles and keeps major contacts unchanged", () => {
    expect(minorAspectBetween(0, 30)).toBeNull();
    expect(aspectBetween(0, 0)?.aspect).toBe("conjunction");
    expect(aspectBetween(0, 60)?.aspect).toBe("sextile");
    expect(aspectBetween(0, 45)).toBeNull();
  });
  it("wraps angular positions across zero", () => {
    expect(minorAspectBetween(350, 35)?.aspect).toBe("semisquare");
  });
});
