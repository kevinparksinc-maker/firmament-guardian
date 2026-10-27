import { describe, expect, it } from "vitest";
import { aldebaranDelta, anchorRawLongitude, projectToDome, arabicLots, equalHouseCuspsOnDome, equalHouseOnDome, calculateDomeFramework, calculateZeroTiltAscendant } from "./firmament-geometry";

describe("Fixed Firmament map geometry", () => {
  it("anchors raw Aldebaran exactly at 45 degrees", () => {
    const delta = aldebaranDelta(69.85);
    expect(delta).toBeCloseTo(335.15, 8);
    expect(anchorRawLongitude(69.85, delta)).toBeCloseTo(45, 8);
    expect(anchorRawLongitude(210, delta)).toBeCloseTo(185.15, 8);
  });
  it("normalizes negatives and wraps at 360", () => {
    expect(anchorRawLongitude(-10, 0)).toBe(350);
    expect(equalHouseCuspsOnDome(277.35)[3]).toBeCloseTo(7.35);
    expect(equalHouseOnDome(7.35, 277.35)).toBe(4);
  });
  it("projects fixed radii without altering bearing", () => {
    expect(projectToDome(90, 50).x).toBeCloseTo(0, 8);
    expect(projectToDome(90, 50).y).toBeCloseTo(50, 8);
  });
  it("calculates Fortune and Spirit with modular arithmetic", () => {
    expect(arabicLots(350, 20, 80)).toEqual({ fortune: 50, spirit: 290 });
  });
  it("uses already anchored inputs and never recalibrates them", () => {
    const result = calculateDomeFramework({ ascendant: 277.35, planetLongitudes: { Sun: 213, Moon: 78 } });
    expect(result.positions.Sun.bearing).toBe(213);
    expect(result.positions.Lot_Of_Fortune.bearing).toBeCloseTo(142.35);
    expect(result.houseCusps).toHaveLength(12);
  });
  it("selects the eastern zero-tilt horizon and never reverses ASC/DSC", () => {
    expect(calculateZeroTiltAscendant(0)).toMatchObject({ ascendant: 90, descendant: 270, midheaven: 0, obliquity: 0 });
    expect(calculateZeroTiltAscendant(359.999).ascendant).toBeCloseTo(89.999, 6);
    for (const theta of [0, 45, 180, 359.999]) {
      const angles = calculateZeroTiltAscendant(theta);
      expect((angles.descendant - angles.ascendant + 360) % 360).toBeCloseTo(180, 8);
    }
  });
});
