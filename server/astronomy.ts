import sweph from "sweph";
import { calculateEnergyRead } from "./energyReadV2";
import { MAJOR_ASPECT_ORB_DEGREES } from "../shared/chartRules";
import tzLookup from "tz-lookup";
import { FIXED_STARS, formatLongitude, normalizeLongitude, overlay, type Overlay } from "../shared/hybrid";
import { agentHouseFor, angularDistance, dualPlacement, equalHouseCusps, godHouseFor, type FrameRelationship, type ReadingScope, type Worldview, type DualPlacement } from "./astrologyCore";
import { calculateDomeFramework, calculateZeroTiltAscendant, type DomeInput } from "./firmament-geometry";

export const REFERENCE_FRAME = "firmament-aldebaran-15-taurus" as const;
export type CoordinateFrame = typeof REFERENCE_FRAME;

export type ChartInput = {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
  time: string;
  transitLocation?: string;
  transitLatitude?: number;
  transitLongitude?: number;
  transitTimezone?: string;
  transitDate?: string;
  transitTime?: string;
  instantUtc?: string;
  transitInstantUtc?: string;
  worldview?: Worldview;
  readingScope?: ReadingScope;
  birthTimeKnown?: boolean;
  chartRole?: "natal" | "event";
  elevation?: number;
};

export type MoonUncertainty = { from: number; to: number; label: string };
export type MomentPrecision = "exact" | "date-only-reference";
export type TransitHouseFrame = "transit-location" | "natal-location" | "god-fixed";
export type ChartRow = {
  name: string;
  /** Canonical geocentric longitude, shared by the God and Agent house frames. */
  longitude: number;
  /** Observer-specific (parallax-corrected) longitude. Present for the Moon only, and only when a location is resolved. */
  topocentricLongitude?: number;
  /** Geocentric J2000 Cartesian ephemeris AU and AU/day, before the fixed-firmament projection. */
  xyz?: { x: number; y: number; z: number; dx: number; dy: number; dz: number };
  /** Raw atan2(y,x) ecliptic J2000 bearing before fixed-star rotation. */
  rawXyzLongitude?: number;
  display: string;
  house: number;
  godHouse?: number;
  agentHouse?: number;
  royalStarContacts?: DualPlacement["royalStarContacts"];
  frameRelationship?: FrameRelationship;
  retrograde?: boolean;
  speed?: number;
  overlay: Overlay;
  uncertainty?: MoonUncertainty;
};
export type TransitContact = { natalName: string; aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition"; orb: number };
export type TransitRow = ChartRow & { natalContacts: TransitContact[] };
export type ChartResult = {
  input: ChartInput;
  methodBindings?: import("./masterChart/types").MasterMethodBindings;
  worldview: Worldview;
  readingScope: ReadingScope;
  agentViewAvailable: boolean;
  utc: string;
  julianDay: number;
  ascendant: ChartRow | null;
  descendant: ChartRow | null;
  midheaven: ChartRow | null;
  northNode: ChartRow;
  southNode: ChartRow;
  houses: number[];
  movingBodies: ChartRow[];
  frozenStars: ChartRow[];
  godPlacements: Array<ChartRow & DualPlacement>;
  transitDate: string;
  momentPrecision: MomentPrecision;
  transitHouseFrame: TransitHouseFrame;
  transits: TransitRow[];
  /** Eight-aspect weighted natal-to-transit energy calculation from the canonical chart positions. */
  energyReadV2: ReturnType<typeof calculateEnergyRead>;
  validation: { passed: boolean; notes: string[] };
  sunriseProvenance?: { utc: string; elapsedHours: number; solarDeclination: number; sunXyz: { x: number; y: number; z: number } };
  /** Every longitude exposed by this result uses the same fixed reference frame. */
  referenceFrame: CoordinateFrame;
  /** Canonical dome/lots geometry derived from the same longitudes. */
  firmament: {
    model: "zero-obliquity-visual-convention";
    horizonModel: "sunrise-anchored-xyz" | "not-available";
    natal: ReturnType<typeof calculateDomeFramework>;
    transit: ReturnType<typeof calculateDomeFramework>;
  };
};

export function parseLocalToUtc(date: string, time: string, timezone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) ||
      ![y, m, d, hh, mm].every(Number.isInteger) || hh > 23 || mm > 59 ||
      new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid local date or time.");
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const wallKey = `${date} ${time}`;
  const partsFor = (ms: number) => {
    const parts = formatter.formatToParts(new Date(ms));
    return Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  };
  const candidates = new Set<number>();
  // Probe surrounding instants to discover real IANA offsets, including
  // half/quarter-hour zones and both sides of daylight-saving transitions.
  for (let hour = -36; hour <= 36; hour++) {
    const probe = naive + hour * 3_600_000;
    const p = partsFor(probe);
    const localAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const offsetMinutes = Math.round((localAsUtc - probe) / 60_000);
    const candidate = naive - offsetMinutes * 60_000;
    const actual = partsFor(candidate);
    const key = `${actual.year}-${actual.month}-${actual.day} ${actual.hour}:${actual.minute}`;
    if (key === wallKey) candidates.add(candidate);
  }
  if (candidates.size === 0) {
    throw new Error("That local time does not exist in the selected timezone, usually because of a daylight-saving transition.");
  }
  if (candidates.size > 1) {
    throw new Error("That local time is ambiguous in the selected timezone because the clock repeated; choose a different minute.");
  }
  return new Date(Array.from(candidates)[0]);
}

// Astronomical data source: Swiss Ephemeris Moshier Cartesian vectors, in AU.
// SEFLG_XYZ 4096, SEFLG_J2000 32, SEFLG_SPEED 256, SEFLG_MOSEPH 4.
// No SEFLG_SIDEREAL, time-dependent ayanamsha or precession of the J2000 axes.
const XYZ_FLAGS = 4 | 32 | 256 | 4096;
const EQUATORIAL_XYZ_FLAGS = XYZ_FLAGS | 2048;
// Fixed-star symbolism is defined in shared/hybrid.ts and remains frozen
// (Aldebaran 45°, Antares 225°, Hamal ~12°). Do NOT subtract an ayanamsha
// or rotate planetary XYZ bearings to those symbolic star labels: doing so
// recreates the deprecated Scorpio 03° result in place of the raw XYZ Sun.
export function setCanonicalReferenceFrame() {
  // Intentionally no global Swiss sidereal mode. All planet coordinates use
  // the same fixed J2000 axes with no age-dependent correction or zodiac offset.
}

type CartesianEphemeris = {
  longitude: number; rawXyzLongitude: number; speed: number;
  xyz: { x: number; y: number; z: number; dx: number; dy: number; dz: number };
};
function rawCartesian(jd: number, planet: number, flags = XYZ_FLAGS): CartesianEphemeris {
  const result: any = (sweph as any).calc_ut(jd, planet, flags);
  const data: number[] = result?.data ?? result;
  if (!Array.isArray(data) && !ArrayBuffer.isView(data)) {
    throw new Error("XYZ_EPHEMERIS_UNAVAILABLE: Swiss Ephemeris returned no Cartesian vector.");
  }
  const [x, y, z, dx, dy, dz] = Array.from(data as ArrayLike<number>).map(Number);
  if (![x, y, z, dx, dy, dz].every(Number.isFinite) || x * x + y * y < 1e-20) {
    throw new Error("XYZ_EPHEMERIS_INVALID: expected six finite Cartesian ephemeris components.");
  }
  const rawXyzLongitude = normalizeLongitude(Math.atan2(y, x) * 180 / Math.PI);
  const projectedLongitude = rawXyzLongitude; // zero-tilt fixed-axis God View; symbolic star anchors are separate.
  const speed = (x * dy - y * dx) / (x * x + y * y) * 180 / Math.PI;
  return { longitude: projectedLongitude, rawXyzLongitude, speed, xyz: { x, y, z, dx, dy, dz } };
}
/** Equatorial-of-date vectors for the existing Vedic mean-orbit diagnostic. */
export function ephemerisXYZ(jd: number, planet: number, extraFlags = 0) {
  const result = rawCartesian(jd, planet, (EQUATORIAL_XYZ_FLAGS & ~32) | extraFlags);
  const { x, y, z, dx, dy, dz } = result.xyz;
  return { xyz: { x, y, z }, longitude: result.longitude, speed: result.speed, velocity: [dx, dy, dz] };
}
function safeCalc(jd: number, planet: number) { return rawCartesian(jd, planet); }
/** All consumers (including other astrology methods) receive the XYZ-derived longitude. */
export function canonicalPositionAt(jd: number, planet: number) { return safeCalc(jd, planet); }
function topocentricMoonLongitude(jd: number, longitude: number, latitude: number, elevation = 0) {
  const sw = sweph as any;
  if (typeof sw.set_topo !== "function") throw new Error("XYZ_TOPOCENTRIC_UNAVAILABLE");
  try {
    sw.set_topo(longitude, latitude, elevation);
    return rawCartesian(jd, 1, XYZ_FLAGS | 32768).longitude;
  } finally {
    sw.set_topo(0, 0, 0);
  }
}
function planetaryTopocentric(planet: number, locationAvailable: boolean) {
  return locationAvailable && planet === 1;
}
export function aspectBetween(a: number, b: number): { aspect: TransitContact["aspect"]; orb: number } | null {
  // angularDistance correctly wraps across 0°/360° (for example, 359° and 1° are 2° apart).
  const separation = angularDistance(a, b); const targets: Array<[number, TransitContact["aspect"]]> = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
  const best = targets.map(([target, aspect]) => ({ aspect, orb: Math.abs(separation - target) })).sort((x, y) => x.orb - y.orb)[0]; return best && best.orb <= MAJOR_ASPECT_ORB_DEGREES ? best : null;
}
function momentFor(input: ChartInput, worldview: Worldview, scope: ReadingScope, transit = false) {
  const exact = transit ? input.transitInstantUtc : input.instantUtc;
  if (exact) {
    const date = new Date(exact);
    if (!Number.isFinite(date.getTime())) throw new Error("Invalid exact chart instant.");
    return { date, precision: "exact" as const };
  }
  const date = transit ? input.transitDate : input.date;
  const time = transit ? input.transitTime : input.time;
  const timezone = transit ? input.transitTimezone ?? input.timezone : input.timezone;
  if (!date) return { date: new Date(), precision: "exact" as const };
  if (worldview === "god" && (!time || (!transit && input.birthTimeKnown === false))) return { date: new Date(`${date}T12:00:00.000Z`), precision: "date-only-reference" as const };
  if (!time || !timezone) throw new Error("An exact date, time, and timezone are required for Agent View.");
  return { date: parseLocalToUtc(date, time, timezone), precision: "exact" as const };
}
function julianDay(date: Date) {
  return Number((sweph as any).julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60, 1));
}

/** Calendar rise/set times used by the existing Vedic strength calculator. */
// NOAA solar-calculator equations: apparent sunrise at solar zenith 90.833 degrees.
// Inputs are the LOCAL civil date and signed geographic coordinates (east positive).
// A missing sunrise (polar day/night) is an error, never a substituted angle.
export function noaaSunriseUtc(localDate: string, latitude: number, longitude: number, setting = false): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180)
    throw new Error("Valid local date and coordinates required for NOAA sunrise.");
  const midnight = Date.parse(localDate + "T00:00:00.000Z");
  if (!Number.isFinite(midnight)) throw new Error("Invalid local sunrise date.");
  const rad = Math.PI / 180;
  const jd0 = midnight / 86400000 + 2440587.5;
  const solar = (jd: number) => {
    const t = (jd - 2451545) / 36525;
    const l0 = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
    const m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * rad;
    const ecc = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const c = Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m) * (0.019993 - 0.000101 * t) + Math.sin(3 * m) * 0.000289;
    const trueLong = l0 + c;
    const omega = (125.04 - 1934.136 * t) * rad;
    const lambda = (trueLong - 0.00569 - 0.00478 * Math.sin(omega)) * rad;
    const obliq0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    const obliq = (obliq0 + 0.00256 * Math.cos(omega)) * rad;
    const decl = Math.asin(Math.sin(obliq) * Math.sin(lambda));
    const y = Math.tan(obliq / 2) ** 2;
    const l = l0 * rad;
    const eqtime = 4 * (180 / Math.PI) * (y * Math.sin(2 * l) - 2 * ecc * Math.sin(m) + 4 * ecc * y * Math.sin(m) * Math.cos(2 * l) - 0.5 * y * y * Math.sin(4 * l) - 1.25 * ecc * ecc * Math.sin(2 * m));
    const cosH = (Math.cos(90.833 * rad) - Math.sin(latitude * rad) * Math.sin(decl)) / (Math.cos(latitude * rad) * Math.cos(decl));
    if (!Number.isFinite(cosH) || cosH < -1 || cosH > 1) throw new Error("NOAA sunrise undefined for this location/date; no fallback.");
    return 720 - 4 * (longitude + (setting ? -1 : 1) * Math.acos(cosH) / rad) - eqtime;
  };
  let minutes = solar(jd0 + 0.5);
  minutes = solar(jd0 + minutes / 1440);
  return new Date(midnight + minutes * 60000);
}
const DEG = Math.PI / 180;
/** NOAA sunrise approximation, using the local civil date and geographic coordinates.
 * Solar declination is derived from the Sun's equatorial XYZ vector independently
 * from the no-tilt symbolic longitude. No local sidereal time is used.
 */
export function sunriseUtcForDate(localDate: string, latitude: number, longitude: number, timezone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new RangeError("Invalid sunrise date or coordinates");
  }
  const midnight = Date.parse(localDate + "T00:00:00.000Z");
  if (!Number.isFinite(midnight)) throw new RangeError("Invalid sunrise date");
  const start = Date.UTC(new Date(midnight).getUTCFullYear(), 0, 1);
  const N = (midnight - start) / 86400000 + 1;
  const lngHour = longitude / 15;
  const t = N + (6 - lngHour) / 24;
  const meanAnomaly = (0.9856 * t - 3.289) * DEG;
  const trueLongitude = normalizeLongitude(
    (0.9856 * t - 3.289) + 1.916 * Math.sin(meanAnomaly) +
    0.020 * Math.sin(2 * meanAnomaly) + 282.634
  );
  let rightAscension = normalizeLongitude(Math.atan(0.91764 * Math.tan(trueLongitude * DEG)) / DEG);
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  const sinDec = 0.39782 * Math.sin(trueLongitude * DEG);
  const cosDec = Math.sqrt(1 - sinDec * sinDec);
  const cosH = (Math.cos(90.833 * DEG) - sinDec * Math.sin(latitude * DEG)) /
    (cosDec * Math.cos(latitude * DEG));
  if (cosH < -1 || cosH > 1 || !Number.isFinite(cosH)) {
    throw new Error("SUNRISE_NOT_AVAILABLE: no sunrise occurs at this latitude/date.");
  }
  const hourAngle = (360 - Math.acos(cosH) / DEG) / 15;
  const localMeanTime = hourAngle + rightAscension / 15 - (0.06571 * t) - 6.622;
  const utcHour = ((localMeanTime - lngHour) % 24 + 24) % 24;
  const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit" });
  for (const dayShift of [-1, 0, 1]) {
    const candidate = new Date(midnight + dayShift * 86400000 + utcHour * 3600000);
    const parts = Object.fromEntries(dateFormatter.formatToParts(candidate)
      .filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    if (`${parts.year}-${parts.month}-${parts.day}` === localDate) return candidate;
  }
  throw new Error("SUNRISE_DATE_MISMATCH: sunrise could not be mapped to the requested local date.");
}
export function sunriseAnchoredAngles(
  event: Date, localDate: string, latitude: number, longitude: number, timezone: string,
) {
  const sunriseUtc = sunriseUtcForDate(localDate, latitude, longitude, timezone);
  const sunAtSunrise = safeCalc(julianDay(sunriseUtc), 0);
  const sunEquatorialXYZ = rawCartesian(julianDay(sunriseUtc), 0, EQUATORIAL_XYZ_FLAGS).xyz;
  const declination = Math.atan2(sunEquatorialXYZ.z,
    Math.hypot(sunEquatorialXYZ.x, sunEquatorialXYZ.y)) / DEG;
  const elapsedHours = (event.getTime() - sunriseUtc.getTime()) / 3600000;
  return { ...calculateZeroTiltAscendant(sunAtSunrise.longitude, elapsedHours),
    sunriseUtc: sunriseUtc.toISOString(), elapsedHours, solarDeclination: declination,
    sunriseSunXyz: sunAtSunrise.xyz };
}
function localDateAt(instant: Date, timezone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function row(name: string, longitude: number, house: number, worldview: Worldview, ascendant: number | null, extra: Partial<ChartRow> = {}): ChartRow {
  const dual = dualPlacement(longitude, ascendant, name) as DualPlacement;
  return { name, longitude, display: formatLongitude(longitude), house, godHouse: dual.godHouse, ...(dual.agentHouse == null ? {} : { agentHouse: dual.agentHouse }), ...(dual.frameRelationship ? { frameRelationship: dual.frameRelationship } : {}), royalStarContacts: dual.royalStarContacts, overlay: overlay(longitude), ...extra };
}
function fixedHouseRows(worldview: Worldview, ascendant: number | null) {
  const houses = worldview === "god" ? Array.from({ length: 12 }, (_, index) => index * 30) : equalHouseCusps(ascendant ?? 0);
  return houses;
}
function moonRange(date: string): MoonUncertainty | undefined {
  if (!date) return undefined;
  const start = julianDay(new Date(`${date}T00:00:00.000Z`)); const end = julianDay(new Date(`${date}T23:59:59.000Z`));
  const from = safeCalc(start, 1).longitude; const to = safeCalc(end, 1).longitude;
  return { from, to, label: `${formatLongitude(from)} to ${formatLongitude(to)} possible on this date` };
}

function domeInput(placements: ChartRow[], ascendant: number | null): DomeInput {
  return {
    ascendant: ascendant ?? 0,
    planetLongitudes: Object.fromEntries(placements.map(placement => [placement.name, placement.longitude])),
  };
}

export async function calculateChart(rawInput: ChartInput): Promise<ChartResult> {
  const worldview: Worldview = rawInput.worldview ?? "agent"; const readingScope: ReadingScope = rawInput.readingScope ?? "combined";
  // Natal-only readings never use transit fields, so stale or half-filled form values are ignored.
  const input: ChartInput = readingScope === "natal"
    ? { ...rawInput, transitLocation: undefined, transitLatitude: undefined, transitLongitude: undefined, transitTimezone: undefined, transitDate: undefined, transitTime: undefined, transitInstantUtc: undefined }
    : rawInput;
  const agentViewAvailable = worldview !== "god" && Boolean(input.time && input.timezone && input.location);
  if (worldview !== "god" && !agentViewAvailable) throw new Error("Agent View requires birth location, date, time, and timezone.");
  if (worldview === "god" && readingScope !== "transit" && !input.date) throw new Error("God View Natal readings require a birth date; birth time and location are optional.");
  const natalMoment = momentFor(input, worldview, readingScope); const utcDate = natalMoment.date; const jd = julianDay(utcDate);
  const hasAgentLocation = worldview !== "god" && Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const natalAngles = hasAgentLocation ? sunriseAnchoredAngles(utcDate, input.date, input.latitude, input.longitude, input.timezone) : null;
  const asc = natalAngles?.ascendant ?? null;
  const mc = natalAngles?.midheaven ?? null;
  const houses = fixedHouseRows(worldview, asc);
  const houseFor = (longitude: number) => worldview === "god" ? godHouseFor(longitude) : agentHouseFor(longitude, asc ?? 0);
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const movingBodies = planetNames.map((name, i) => { const p = safeCalc(jd, i); const topocentricLongitude = planetaryTopocentric(i, hasAgentLocation) ? topocentricMoonLongitude(jd, input.longitude, input.latitude, input.elevation ?? 0) : undefined; return row(name, p.longitude, houseFor(p.longitude), worldview, asc, { retrograde: p.speed < 0, speed: p.speed, xyz: p.xyz, rawXyzLongitude: p.rawXyzLongitude, ...(topocentricLongitude == null ? {} : { topocentricLongitude }), ...(worldview === "god" && name === "Moon" && input.birthTimeKnown === false ? { uncertainty: moonRange(input.date) } : {}) }); });
  const ascRow = asc == null ? null : row("Ascendant", asc, 1, worldview, asc);
  const descLongitude = asc == null ? null : normalizeLongitude(asc + 180); const descendant = descLongitude == null ? null : row("Descendant", descLongitude, 7, worldview, asc);
  const mcRow = mc == null ? null : row("Midheaven", mc, houseFor(mc), worldview, asc);
  const nodePosition = safeCalc(jd, 10).longitude; const northNode = row("North Node", nodePosition, houseFor(nodePosition), worldview, asc, { retrograde: true, speed: 0 }); const southNodePosition = normalizeLongitude(nodePosition + 180); const southNode = row("South Node", southNodePosition, houseFor(southNodePosition), worldview, asc, { retrograde: true, speed: 0 });
  const frozenStars = FIXED_STARS.map(([name, longitude]) => row(name, longitude, houseFor(longitude), worldview, asc));
  const allPlacements = [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), ...(mcRow ? [mcRow] : []), northNode, southNode];
  const godPlacements = allPlacements.map(placement => ({ ...placement, ...dualPlacement(placement.longitude, asc, placement.name) }));
  // Source calculation success is distinct from an optional historical reference fixture.
  // Actual ephemeris failures throw during chart construction; test fixtures verify Dallas separately.
  const validation = { passed: true, notes: [
    "Planet positions: Swiss Ephemeris Moshier geocentric J2000 XYZ (AU), atan2(y,x), fixed J2000 axis with zero ecliptic offset; symbolic fixed stars remain frozen at historical custom anchors; no mode-14 sidereal or time-dependent ayanamsha. Agent View Ascendant: Sun XYZ longitude at NOAA sunrise + 15 degrees per elapsed hour; Equal Houses.",
    "Fixed-star archive retains defined symbolic positions; stars not historically calibrated are not claimed as catalog-verified.",
  ] };
  const transitCoordinatesPresent = [input.transitLatitude, input.transitLongitude].some(value => value !== undefined && Number.isFinite(value) && value !== 0);
  const transitInputsPresent = Boolean(input.transitTimezone?.trim() || input.transitLocation?.trim() || transitCoordinatesPresent);
  const transitLocationResolved = worldview !== "god" && Boolean(input.transitLocation?.trim() && input.transitTimezone?.trim() && Number.isFinite(input.transitLatitude) && Number.isFinite(input.transitLongitude));
  if (worldview !== "god" && transitInputsPresent && !transitLocationResolved) throw new Error("Transit location must be resolved before calculating transit houses.");
  const transitMoment = momentFor(input, worldview, readingScope, true); const transitDate = transitMoment.date; const transitJd = julianDay(transitDate);
  const transitHasLocation = transitLocationResolved || (readingScope !== "natal" && hasAgentLocation);
  const transitTimezone = input.transitTimezone ?? input.timezone;
  const transitLatitude = input.transitLatitude ?? input.latitude;
  const transitLongitude = input.transitLongitude ?? input.longitude;
  const transitAngles = transitHasLocation ? sunriseAnchoredAngles(transitDate, localDateAt(transitDate, transitTimezone), transitLatitude, transitLongitude, transitTimezone) : null;
  const transitAsc = transitAngles?.ascendant ?? null;
  const transitHouseFrame: TransitHouseFrame = worldview === "god" ? "god-fixed" : transitLocationResolved ? "transit-location" : "natal-location";
  const natalTargets = worldview === "god" ? [] : [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), northNode, southNode];
  const transits: TransitRow[] = planetNames.map((name, i) => { const p = safeCalc(transitJd, i); const topocentricLongitude = planetaryTopocentric(i, transitHasLocation) ? topocentricMoonLongitude(transitJd, transitLongitude, transitLatitude, input.elevation ?? 0) : undefined; const contacts = natalTargets.flatMap(natal => { const found = aspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); const house = worldview === "god" ? godHouseFor(p.longitude) : agentHouseFor(p.longitude, transitAsc ?? asc ?? 0); return { ...row(name, p.longitude, house, worldview, transitAsc ?? asc, { retrograde: p.speed < 0, speed: p.speed, ...(topocentricLongitude == null ? {} : { topocentricLongitude }) }), natalContacts: contacts }; });
  const transitNodePosition = safeCalc(transitJd, 10).longitude; const transitNorthNode = row("North Node", transitNodePosition, worldview === "god" ? godHouseFor(transitNodePosition) : agentHouseFor(transitNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 }); const transitSouthNodePosition = normalizeLongitude(transitNodePosition + 180); const transitSouthNode = row("South Node", transitSouthNodePosition, worldview === "god" ? godHouseFor(transitSouthNodePosition) : agentHouseFor(transitSouthNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 });
  const contactsFor = (transit: ChartRow) => natalTargets.flatMap(natal => { const found = aspectBetween(transit.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; });
  const transitRows = [...transits, { ...transitNorthNode, natalContacts: contactsFor(transitNorthNode) }, { ...transitSouthNode, natalContacts: contactsFor(transitSouthNode) }];
  const energyReadV2 = calculateEnergyRead(
    movingBodies.map(body => ({ name: body.name, longitude: body.longitude, agentHouse: body.agentHouse, godHouse: body.godHouse })),
    transits.map(body => ({ name: body.name, longitude: body.longitude, agentHouse: body.agentHouse, godHouse: body.godHouse })),
  );
  const natalGeometry = calculateDomeFramework(domeInput([...movingBodies, northNode, southNode], asc));
  const transitGeometry = calculateDomeFramework(domeInput(transitRows, transitAsc ?? asc));
  return { input, worldview, readingScope, agentViewAvailable, utc: utcDate.toISOString(), julianDay: jd, ascendant: ascRow, descendant, midheaven: mcRow, northNode, southNode, houses, movingBodies, frozenStars, godPlacements, transitDate: transitDate.toISOString(), momentPrecision: transitMoment.precision, transitHouseFrame, transits: transitRows, energyReadV2, validation, sunriseProvenance: natalAngles ? { utc: natalAngles.sunriseUtc, elapsedHours: natalAngles.elapsedHours, solarDeclination: natalAngles.solarDeclination, sunXyz: natalAngles.sunriseSunXyz } : undefined, referenceFrame: REFERENCE_FRAME, firmament: { model: "zero-obliquity-visual-convention", horizonModel: hasAgentLocation ? "sunrise-anchored-xyz" : "not-available", natal: natalGeometry, transit: transitGeometry } };
}

export async function geocodeLocation(query: string) {
  const normalizedQuery = query.trim();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(normalizedQuery)}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bible Believers AstrologyHybridZodiac/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`geocoder returned ${response.status}`);
      const data: any[] = await response.json();
      if (!data[0]) throw new Error("No matching place found.");
      const item = data[0]; const lat = Number(item.lat); const lon = Number(item.lon); const timezone = tzLookup(lat, lon); return { label: item.display_name, latitude: lat, longitude: lon, timezone };
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (lastError instanceof Error && lastError.message === "No matching place found.") throw lastError;
  throw new Error("Location search is temporarily unavailable. Please try the pin again in a moment.");
}

export async function reverseGeocodeLocation(latitude: number, longitude: number) {
  const timezone = tzLookup(latitude, longitude);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bible Believers AstrologyHybridZodiac/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data: any = await response.json();
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.municipality || address.county || "";
        const state = address.state || address.region || "";
        const country = address.country || "";
        const parts = [city, state, country].filter(Boolean);
        const label = parts.length > 0 ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(",") || `GPS (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
        return { label, latitude, longitude, timezone };
      }
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  return {
    label: `GPS (${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°)`,
    latitude,
    longitude,
    timezone,
  };
}
