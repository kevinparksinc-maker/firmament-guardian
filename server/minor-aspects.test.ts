import { describe, expect, it } from "vitest";
import { aspectBetween } from "./astronomy";
import {
  MAJOR_ASPECT_ORB_DEGREES,
  MINOR_ASPECT_ORB_DEGREES,
  MINOR_ASPECT_WEIGHT,
  aspectWeightMultiplier,
  isMinorAspect,
} from "../shared/chartRules";

describe("minor longitude aspects", () => {
  it.each([
    [30, "semisextile"],
    [45, "semisquare"],
    [135, "sesquiquadrate"],
    [150, "quincunx"],
  ] as const)("detects %s° as %s and assigns half strength", (angle, aspect) => {
    expect(aspectBetween(0, angle)).toEqual({
      aspect,
      orb: 0,
      weightMultiplier: MINOR_ASPECT_WEIGHT,
    });
    expect(isMinorAspect(aspect)).toBe(true);
    expect(aspectWeightMultiplier(aspect)).toBe(0.5);
  });

  it("accepts contacts at the 2° minor-orb boundary and rejects wider contacts", () => {
    expect(aspectBetween(0, 32)).toMatchObject({ aspect: "semisextile", orb: 2 });
    expect(aspectBetween(0, 32.01)).toBeNull();
    expect(MINOR_ASPECT_ORB_DEGREES).toBe(2);
  });

  it("keeps the existing 5° major orb and full major-contact weight", () => {
    expect(aspectBetween(0, 65)).toMatchObject({
      aspect: "sextile",
      orb: 5,
      weightMultiplier: 1,
    });
    expect(aspectWeightMultiplier("trine")).toBe(1);
    expect(MAJOR_ASPECT_ORB_DEGREES).toBe(5);
  });

  it("preserves angular wrap-around when detecting a minor contact", () => {
    expect(aspectBetween(350, 20)).toMatchObject({
      aspect: "semisextile",
      orb: 0,
      weightMultiplier: 0.5,
    });
  });
});
