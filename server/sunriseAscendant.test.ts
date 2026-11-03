import { describe, expect, it } from "vitest";
import {
  ascendantFromSunrise,
  solarAnglesFromFixedXYZ,
  sunriseEasternHorizonLongitude,
  SIDEREAL_DEGREES_PER_UTC_HOUR,
} from "./sunriseAscendant";

describe("zero-tilt sunrise-anchored rising point", () => {
  const sun = { x: 1, y: 0, z: 0 };
  it("derives fixed-wheel solar longitude and declination from XYZ", () => {
    expect(solarAnglesFromFixedXYZ({ x: 0, y: 1, z: 1 }).longitude).toBe(90);
    expect(solarAnglesFromFixedXYZ({ x: 0, y: 1, z: 1 }).declination).toBeCloseTo(45, 8);
  });
  it("uses the sunrise hour angle without an extra 90-degree offset", () => {
    expect(sunriseEasternHorizonLongitude(sun, 0)).toBeCloseTo(270, 8);
  });
  it("advances from sunrise by sidereal rather than civil rotation", () => {
    const result = ascendantFromSunrise({
      sunriseUtc: "1986-11-20T12:00:00Z",
      eventUtc: "1986-11-20T18:00:00Z",
      sunriseSunXYZ: sun,
      latitude: 0,
    });
    expect(result.ascendant).toBeCloseTo((270 + 6 * SIDEREAL_DEGREES_PER_UTC_HOUR) % 360, 8);
    expect(result.elapsedHours).toBe(6);
  });
  it("uses latitude and declination to change the sunrise intersection", () => {
    const tiltedSun = { x: 1, y: 0, z: 0.4 };
    expect(sunriseEasternHorizonLongitude(tiltedSun, 40)).not.toBeCloseTo(sunriseEasternHorizonLongitude(tiltedSun, 0));
  });
  it("rejects polar-day or polar-night geometry instead of inventing an Ascendant", () => {
    expect(() => sunriseEasternHorizonLongitude({ x: 1, y: 0, z: 1 }, 80)).toThrow("No unique geometric sunrise");
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
