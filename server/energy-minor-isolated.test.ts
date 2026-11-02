import { describe, expect, it } from "vitest";
import { aspectBetween, minorAspectBetween } from "./astronomy";

describe("balanced Energy Read aspect classifications", () => {
  it.each([
    [0, "conjunction"],
    [60, "sextile"],
    [120, "trine"],
    [90, "square"],
    [180, "opposition"],
  ] as const)("recognizes canonical major %s° %s", (angle, aspect) => {
    expect(aspectBetween(0, angle)).toEqual({ aspect, orb: 0 });
  });

  it.each([
    [72, "quintile", "flow"],
    [144, "biquintile", "flow"],
    [135, "sesquiquadrate", "friction"],
    [150, "quincunx", "friction"],
  ] as const)("recognizes half-weight minor %s° %s", (angle, aspect, classification) => {
    expect(minorAspectBetween(0, angle)).toEqual({ aspect, classification, orb: 0, weightMultiplier: 0.5 });
  });

  it("limits major orbs to five degrees and minor orbs to two degrees", () => {
    expect(aspectBetween(0, 65)).toMatchObject({ aspect: "sextile", orb: 5 });
    expect(aspectBetween(0, 65.01)).toBeNull();
    expect(minorAspectBetween(0, 74)).toMatchObject({ aspect: "quintile", orb: 2 });
    expect(minorAspectBetween(0, 74.01)).toBeNull();
  });

  it("excludes the semi-sextile and does not double-count semi-square as minor", () => {
    expect(aspectBetween(0, 30)).toBeNull();
    expect(minorAspectBetween(0, 30)).toBeNull();
    expect(aspectBetween(0, 45)).toBeNull();
    expect(minorAspectBetween(0, 45)).toBeNull();
  });

  it("wraps angular positions across zero", () => {
    expect(minorAspectBetween(350, 62)?.aspect).toBe("quintile");
    expect(aspectBetween(350, 50)?.aspect).toBe("sextile");
  });
});
