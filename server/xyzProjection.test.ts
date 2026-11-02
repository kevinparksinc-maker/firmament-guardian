import { describe, expect, it } from "vitest";
import { longitudeFromXYZ } from "./astronomy";

describe("fixed-wheel XYZ projection", () => {
  it.each([
    [{ x: 1, y: 0, z: 0 }, 0],
    [{ x: 0, y: 1, z: 4 }, 90],
    [{ x: -1, y: 0, z: -3 }, 180],
    [{ x: 0, y: -1, z: 0 }, 270],
    [{ x: 1, y: -1, z: 0 }, 315],
  ])("maps Cartesian direction %j to %s degrees", (vector, expected) => {
    expect(longitudeFromXYZ(vector)).toBeCloseTo(expected, 8);
  });
  it("ignores Z when projecting onto the fixed zodiac plane", () => {
    expect(longitudeFromXYZ({ x: 1, y: 1, z: 900 })).toBeCloseTo(45);
  });
  it.each([
    { x: 0, y: 0, z: 1 },
    { x: Number.NaN, y: 1, z: 0 },
    { x: 1, y: Number.POSITIVE_INFINITY, z: 0 },
  ])("rejects invalid vector %j", vector => {
    expect(() => longitudeFromXYZ(vector)).toThrow("Invalid XYZ coordinates");
  });
});
