/**
 * Sunrise-anchored rising point on the user's ZERO-TILT fixed wheel.
 *
 * Coordinates must be expressed in one fixed equatorial XYZ frame:
 * X=0 degrees of the wheel, Y=90 degrees, Z=north celestial pole.
 * The observer latitude and solar declination affect the sunrise hour angle.
 * No tropical longitude, ayanamsha, obliquity or precession adjustment is applied here.
 *
 * Sunrise itself must be obtained independently for the historical date/location;
 * this module does not silently substitute an approximate sunrise.
 */
export type FixedVector = { x: number; y: number; z: number };
export const SIDEREAL_DEGREES_PER_UTC_HOUR = 360.98564736629 / 24;

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
    rightAscension: normalizeDegrees(degrees(Math.atan2(y, x))),
    declination: degrees(Math.atan2(z, Math.hypot(x, y))),
  };
}

export function sunriseEasternHorizonLongitude(sunXYZ: FixedVector, latitude: number): number {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) throw new Error("Invalid observer latitude.");
  const { rightAscension: sunRightAscension, declination } = solarAnglesFromFixedXYZ(sunXYZ);
  const cosineHourAngle = -Math.tan(radians(latitude)) * Math.tan(radians(declination));
  if (!Number.isFinite(cosineHourAngle) || cosineHourAngle < -1 || cosineHourAngle > 1) {
    throw new Error("No unique geometric sunrise at this latitude and solar declination.");
  }
  const sunriseHourAngle = degrees(Math.acos(cosineHourAngle));
  // Master sunrise anchor: Sun equatorial RA minus the sunrise hour angle.
  // This is the explicitly specified wheel anchor, not a conventional ecliptic ASC.
  return normalizeDegrees(sunRightAscension - sunriseHourAngle);
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
    ascendant: normalizeDegrees(sunriseHorizon + elapsedHours * SIDEREAL_DEGREES_PER_UTC_HOUR),
    sunriseHorizon,
    elapsedSiderealDegrees: elapsedHours * SIDEREAL_DEGREES_PER_UTC_HOUR,
    elapsedHours,
    sunriseUtc: new Date(sunriseMillis).toISOString(),
    eventUtc: new Date(eventMillis).toISOString(),
    model: "fixed-equatorial-xyz-zero-tilt-sunrise-v1" as const,
  };
}
