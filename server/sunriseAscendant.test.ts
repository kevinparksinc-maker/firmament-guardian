import { describe, expect, it } from "vitest";
import {
  ascendantFromSunrise,
  solarAnglesFromFixedXYZ,
  sunriseEasternHorizonLongitude,
  SUNRISE_ROTATION_DEGREES_PER_HOUR,
} from "./sunriseAscendant";

describe("zero-tilt sunrise-anchored rising point", () => {
  const sun = { x: 1, y: 0, z: 0 };
  it("derives fixed-wheel solar longitude and declination from XYZ", () => {
    expect(solarAnglesFromFixedXYZ({ x: 0, y: 1, z: 1 }).longitude).toBe(90);
    expect(solarAnglesFromFixedXYZ({ x: 0, y: 1, z: 1 }).declination).toBeCloseTo(45, 8);
  });
  it("anchors the east horizon to the Sun at equatorial sunrise", () => {
    expect(sunriseEasternHorizonLongitude(sun, 0)).toBeCloseTo(0, 8);
  });
  it("advances from sunrise by exactly 15 degrees per hour", () => {
    const result = ascendantFromSunrise({
      sunriseUtc: "1986-11-20T12:00:00Z",
      eventUtc: "1986-11-20T18:00:00Z",
      sunriseSunXYZ: sun,
      latitude: 0,
    });
    expect(result.ascendant).toBeCloseTo(6 * SUNRISE_ROTATION_DEGREES_PER_HOUR, 8);
    expect(result.elapsedHours).toBe(6);
  });
  it("anchors directly to the Sun longitude regardless of observer latitude", () => {
    const sunXYZ = { x: 1, y: 1, z: 0.4 };
    expect(sunriseEasternHorizonLongitude(sunXYZ, 40)).toBeCloseTo(45, 8);
    expect(sunriseEasternHorizonLongitude(sunXYZ, 0)).toBeCloseTo(45, 8);
  });
  it("does not apply an extra ninety degrees at sunrise", () => {
    const result = ascendantFromSunrise({ sunriseUtc: "1986-11-20T12:00:00Z", eventUtc: "1986-11-20T12:00:00Z", sunriseSunXYZ: { x: 0, y: 1, z: 0 }, latitude: 32 });
    expect(result.ascendant).toBeCloseTo(90, 8);
  });
  it("requires a historical sunrise preceding the event", () => {
    expect(() => ascendantFromSunrise({
      sunriseUtc: "1986-11-20T12:00:00Z",
      eventUtc: "1986-11-20T11:00:00Z",
      sunriseSunXYZ: sun,
      latitude: 0,
    })).toThrow("Sunrise anchor");
  });
});
