import sweph from "sweph";
import { normalizeLongitude } from "../shared/hybrid";

// Geocentric equatorial Cartesian XYZ: Moshier (4), equatorial (2048), XYZ (4096).
// Never request a sidereal or tropical zodiac conversion for planetary positions.
const MOSHIER_FLAGS = 4;
const EQUATORIAL_FLAG = 2048;
const CARTESIAN_XYZ_FLAG = 4096;
const SPEED_FLAG = 256;
const TOPOCENTRIC_FLAG = 32768;
const EQUATORIAL_XYZ_FLAGS = MOSHIER_FLAGS | EQUATORIAL_FLAG | CARTESIAN_XYZ_FLAG | SPEED_FLAG;
export function ephemerisXYZ(jd: number, planet: number, extraFlags = 0) {
  const result: any = (sweph as any).calc_ut(jd, planet, EQUATORIAL_XYZ_FLAGS | extraFlags);
  const data = result?.data ?? result;
  if (!data || ![data[0], data[1], data[2]].every((n: unknown) => typeof n === "number" && Number.isFinite(n)))
    throw new Error("Ephemeris failed to return geocentric equatorial Cartesian XYZ coordinates.");
  const xyz = { x: Number(data[0]), y: Number(data[1]), z: Number(data[2]) };
  const longitude = longitudeFromXYZ(xyz);
  // Cartesian velocity components are AU/day when SEFLG_SPEED is requested.
  const velocity = [Number(data[3]), Number(data[4]), Number(data[5])];
  const speed = velocity.every(Number.isFinite)
    ? ((xyz.x * velocity[1] - xyz.y * velocity[0]) / (xyz.x * xyz.x + xyz.y * xyz.y)) * 180 / Math.PI
    : 0;
  return { xyz, longitude, speed, velocity };
}
/** Geocentric and observer-specific Moon coordinates must use the same equatorial XYZ axes. */
export function topocentricMoonLongitude(jd: number, longitude: number, latitude: number, elevation = 0) {
  const sw = sweph as any;
  try {
    sw.set_topo?.(longitude, latitude, elevation);
    return ephemerisXYZ(jd, 1, TOPOCENTRIC_FLAG).longitude;
  } finally {
    sw.set_topo?.(0, 0, 0);
  }
}
/** Longitude from externally supplied XYZ. The supplied frame must already be aligned to the fixed 360° zodiac. */
export function longitudeFromXYZ(vector: { x: number; y: number; z: number }): number {
  const { x, y, z } = vector;
  if (![x, y, z].every(Number.isFinite) || Math.hypot(x, y) === 0) {
    throw new Error("Invalid XYZ coordinates: finite values and nonzero XY radius required.");
  }
  return normalizeLongitude(Math.atan2(y, x) * 180 / Math.PI);
}

export function julianDay(date: Date) {
  return Number((sweph as any).julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60, 1));
}
