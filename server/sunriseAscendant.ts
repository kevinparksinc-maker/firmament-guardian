/**
 * Sunrise-anchored rising point on the user's ZERO-TILT fixed wheel.
 *
 * Coordinates must be expressed in one fixed equatorial XYZ frame:
 * X=0 degrees of the wheel, Y=90 degrees, Z=north celestial pole.
 * At verified sunrise, the Sun's fixed-frame XYZ longitude is the rising anchor.
 * Latitude is retained as an input for provenance/validation, not a longitude offset.
 * No tropical longitude, ayanamsha, obliquity or precession adjustment is applied here.
 *
 * Sunrise itself must be obtained independently for the historical date/location;
 * this module does not silently substitute an approximate sunrise.
 */
export type FixedVector = { x: number; y: number; z: number };
/** Framework rule: advance the sunrise rising point exactly 15 degrees per elapsed hour. */
export const SUNRISE_ROTATION_DEGREES_PER_HOUR = 15;

export function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Angle must be finite.");
  return ((value % 360) + 360) % 360;
}
function radians(deg: number): number { return deg * Math.PI / 180; }
function degrees(rad: number): number { return rad * 180 / Math.PI; }

export function solarAnglesFromFixedXYZ(vector: FixedVector) {
  const { x, y, z } = vector;
  if (![x, y, z].every(Number.isFinite) || Math.hypot(x, y, z) === 0) {
    throw new Error("Sun XYZ must be a nonzero finite vector.");
  }
  return {
    longitude: normalizeDegrees(degrees(Math.atan2(y, x))),
    declination: degrees(Math.atan2(z, Math.hypot(x, y))),
  };
}

export function sunriseEasternHorizonLongitude(sunXYZ: FixedVector, latitude: number): number {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) throw new Error("Invalid observer latitude.");
  // The framework defines the rising degree at sunrise as the Sun's XYZ longitude.
  // No meridian, hour-angle, or +90-degree offset is applied.
  return solarAnglesFromFixedXYZ(sunXYZ).longitude;
}

export function ascendantFromSunrise(input: {
  sunriseUtc: string;
  eventUtc: string;
  sunriseSunXYZ: FixedVector;
  latitude: number;
}) {
  const sunriseMillis = Date.parse(input.sunriseUtc);
  const eventMillis = Date.parse(input.eventUtc);
  if (!Number.isFinite(sunriseMillis) || !Number.isFinite(eventMillis)) {
    throw new Error("Sunrise and event must be valid UTC instants.");
  }
  const elapsedHours = (eventMillis - sunriseMillis) / 3_600_000;
  if (elapsedHours < 0 || elapsedHours > 24) {
    throw new Error("Sunrise anchor must precede the event by no more than 24 hours.");
  }
  const sunriseHorizon = sunriseEasternHorizonLongitude(input.sunriseSunXYZ, input.latitude);
  return {
    ascendant: normalizeDegrees(sunriseHorizon + elapsedHours * SUNRISE_ROTATION_DEGREES_PER_HOUR),
    sunriseHorizon,
    elapsedSiderealDegrees: elapsedHours * SUNRISE_ROTATION_DEGREES_PER_HOUR,
    elapsedHours,
    sunriseUtc: new Date(sunriseMillis).toISOString(),
    eventUtc: new Date(eventMillis).toISOString(),
    model: "fixed-equatorial-xyz-solar-longitude-sunrise-v2" as const,
  };
}
