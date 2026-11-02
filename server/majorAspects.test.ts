import { describe, expect, it } from "vitest";
import { aspectBetween, minorAspectBetween } from "./astronomy";

describe("canonical major aspect scoring contract", () => {
  it.each([
    [0, "conjunction"],
    [60, "sextile"],
    [90, "square"],
    [120, "trine"],
    [180, "opposition"],
  ] as const)("recognizes %s° as %s", (angle, aspect) => {
    expect(aspectBetween(0, angle)).toEqual({ aspect, orb: 0 });
  });

  it("honors the five degree inclusive orb and zodiac wraparound", () => {
    expect(aspectBetween(359, 1)).toEqual({ aspect: "conjunction", orb: 2 });
    expect(aspectBetween(0, 65)?.aspect).toBe("sextile");
    expect(aspectBetween(0, 65.01)).toBeNull();
  });

  it.each([30, 45, 72, 135, 150])("does not count %s° as a major aspect", angle => {
    expect(aspectBetween(0, angle)).toBeNull();
  });

  it("retains quintile only in the separate minor-contact channel", () => {
    expect(minorAspectBetween(0, 72)?.aspect).toBe("quintile");
    expect(aspectBetween(0, 72)).toBeNull();
  });
});
