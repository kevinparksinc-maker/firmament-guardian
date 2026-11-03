import sweph from "sweph";
import { ascendantFromSunrise, type FixedVector } from "./sunriseAscendant";
import tzLookup from "tz-lookup";
import { FIXED_STARS, formatLongitude, normalizeLongitude, overlay, type Overlay } from "../shared/hybrid";
import { agentHouseFor, angularDistance, dualPlacement, equalHouseCusps, godHouseFor, type FrameRelationship, type ReadingScope, type Worldview, type DualPlacement } from "./astrologyCore";

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
  worldview?: Worldview;
  readingScope?: ReadingScope;
  birthTimeKnown?: boolean;
  elevation?: number;
  /** Verified historical sunrise anchor in the fixed EQUATORIAL frame. Optional until provider validation is complete. */
  sunriseAnchor?: { sunriseUtc: string; sunriseSunXYZ: FixedVector };
  transitSunriseAnchor?: { sunriseUtc: string; sunriseSunXYZ: FixedVector };
  /** External Cartesian coordinates in the canonical fixed zodiac plane; x points at 0° Aries, y at 90° Cancer. */
  xyzPositions?: Record<string, { x: number; y: number; z: number }>;
  /** Optional independently sampled transit vectors at the transit instant. */
  transitXYZPositions?: Record<string, { x: number; y: number; z: number }>;
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
  xyz?: { x: number; y: number; z: number };
  coordinateSource?: "external-xyz" | "swiss-ephemeris";
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
export type TransitContact = { natalName: string; aspect: "conjunction" | "square" | "trine" | "opposition"; orb: number };
export type MinorTransitContact = { natalName: string; aspect: "sextile" | "semisextile" | "semisquare" | "quincunx"; orb: number; weightMultiplier: 0.5; classification: "flow" | "friction" };
export type TransitRow = ChartRow & { natalContacts: TransitContact[]; minorNatalContacts: MinorTransitContact[] };
export type ChartResult = {
  input: ChartInput;
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
  validation: { passed: boolean; notes: string[] };
};

export function parseLocalToUtc(date: string, time: string, timezone: string) {
  const [y, m, d] = date.split("-").map(Number); const [hh, mm] = time.split(":").map(Number);
  const wallKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const naive = Date.UTC(y, m - 1, d, hh, mm); const candidates = new Set<number>();
  for (let delta = -36; delta <= 36; delta += 1) { const candidate = new Date(naive + delta * 3_600_000); const parts = formatter.formatToParts(candidate); const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value])); const key = `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`; if (key === wallKey) candidates.add(candidate.getTime()); }
  if (candidates.size === 0) throw new Error("That local time does not exist in the selected timezone, usually because of a daylight-saving transition.");
  if (candidates.size > 1) throw new Error("That local time is ambiguous in the selected timezone because the clock repeated; choose a different minute.");
  return new Date(Array.from(candidates)[0]);
}

const MOSHIER_FLAGS = 4 | 256;
const SIDEREAL_FLAG = 65536;
const CARTESIAN_XYZ_FLAG = 4096;
const TOPOCENTRIC_FLAG = 32768;
const CANONICAL_SIDEREAL_MODE = 14;
function ensureCanonicalReferenceFrame() {
  const sw = sweph as any;
  sw.set_sid_mode?.(sw.constants?.SE_SIDM_ALDEBARAN_15TAU ?? CANONICAL_SIDEREAL_MODE, 0, 0);
}
function rawCalc(jd: number, planet: number, flags: number) {
  ensureCanonicalReferenceFrame();
  const result: any = (sweph as any).calc_ut(jd, planet, flags | SIDEREAL_FLAG); const data = result?.data ?? result;
  if (!data || Number.isNaN(Number(data[0]))) throw new Error("Swiss Ephemeris failed to calculate a planetary position.");
  return { longitude: normalizeLongitude(Number(data[0])), speed: Number(data[3] ?? 0) };
}
/** Geocentric position. Never touches sweph's global topocentric observer. */
function calculatedXYZ(jd: number, planet: number) {
  ensureCanonicalReferenceFrame();
  const result: any = (sweph as any).calc_ut(jd, planet, MOSHIER_FLAGS | SIDEREAL_FLAG | CARTESIAN_XYZ_FLAG);
  const data = result?.data ?? result;
  if (!data || ![data[0], data[1], data[2]].every((n: unknown) => typeof n === "number" && Number.isFinite(n))) {
    throw new Error("Ephemeris did not return finite Cartesian coordinates.");
  }
  const xyz = { x: Number(data[0]), y: Number(data[1]), z: Number(data[2]) };
  const longitude = longitudeFromXYZ(xyz);
  const referenceLongitude = safeCalc(jd, planet).longitude;
  if (angularDistance(longitude, referenceLongitude) > 0.1) {
    throw new Error("XYZ frame mismatch: Cartesian projection disagrees with the configured fixed zodiac reference.");
  }
  return { xyz, longitude };
}
function safeCalc(jd: number, planet: number) {
  return rawCalc(jd, planet, MOSHIER_FLAGS);
}
/** Parallax-corrected Moon longitude for one observer; always restores the zero observer. */
function topocentricMoonLongitude(jd: number, longitude: number, latitude: number, elevation = 0) {
  const sw = sweph as any;
  try {
    ensureCanonicalReferenceFrame();
    sw.set_topo?.(longitude, latitude, elevation);
    return rawCalc(jd, 1, MOSHIER_FLAGS | TOPOCENTRIC_FLAG).longitude;
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
function planetaryTopocentric(planet: number, locationAvailable: boolean) {
  return locationAvailable && planet === 1;
}
export function aspectBetween(a: number, b: number): { aspect: TransitContact["aspect"]; orb: number } | null {
  // angularDistance correctly wraps across 0°/360° (for example, 359° and 1° are 2° apart).
  const separation = angularDistance(a, b); const targets: Array<[number, TransitContact["aspect"]]> = [[0, "conjunction"], [90, "square"], [120, "trine"], [180, "opposition"]];
  const best = targets.map(([target, aspect]) => ({ aspect, orb: Math.abs(separation - target) })).sort((x, y) => x.orb - y.orb)[0]; return best && best.orb <= 5 ? best : null;
}
/** The four minor aspects complete the balanced eight-aspect Energy Read.
 * A pair may have at most one scored aspect; minor contacts are calculated
 * only when the pair has no major contact.
 */
export function minorAspectBetween(a: number, b: number): Omit<MinorTransitContact, "natalName"> | null {
  if (aspectBetween(a, b)) return null;
  const separation = angularDistance(a, b);
  const targets = [
    { target: 30, aspect: "semisextile" as const, classification: "flow" as const },
    { target: 60, aspect: "sextile" as const, classification: "flow" as const },
    { target: 45, aspect: "semisquare" as const, classification: "friction" as const },
    { target: 150, aspect: "quincunx" as const, classification: "friction" as const },
  ];
  const best = targets.map(({ target, aspect, classification }) => ({ aspect, classification, orb: Math.abs(separation - target) }))
    .filter(contact => contact.orb <= 5)
    .sort((a, b) => a.orb - b.orb)[0];
  return best ? { ...best, weightMultiplier: 0.5 } : null;
}
function momentFor(input: ChartInput, worldview: Worldview, scope: ReadingScope, transit = false) {
  const date = transit ? input.transitDate : input.date;
  const time = transit ? input.transitTime : input.time;
  const timezone = transit ? input.transitTimezone : input.timezone;
  if (!date) return { date: new Date(), precision: "exact" as const };
  if (worldview === "god" && (!time || (!transit && input.birthTimeKnown === false))) return { date: new Date(`${date}T12:00:00.000Z`), precision: "date-only-reference" as const };
  if (!time || !timezone) throw new Error("An exact date, time, and timezone are required for Agent View.");
  return { date: parseLocalToUtc(date, time, timezone), precision: "exact" as const };
}
function julianDay(date: Date) {
  return Number((sweph as any).julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60, 1));
}
function row(name: string, longitude: number, house: number, worldview: Worldview, ascendant: number | null, extra: Partial<ChartRow> = {}): ChartRow {
  const dual = dualPlacement(longitude, ascendant, name) as DualPlacement;
  return { name, longitude, display: formatLongitude(longitude), house, godHouse: dual.godHouse, ...(dual.agentHouse == null ? {} : { agentHouse: dual.agentHouse }), ...(dual.frameRelationship ? { frameRelationship: dual.frameRelationship } : {}), royalStarContacts: dual.royalStarContacts, overlay: overlay(longitude), ...extra };
}
function fixedHouseRows(worldview: Worldview, ascendant: number | null) {
  if (worldview !== "god" && (ascendant == null || !Number.isFinite(ascendant))) throw new Error("ASC_REQUIRED_FOR_EQUAL_HOUSES: Cannot construct Agent houses without a valid sunrise-derived Ascendant.");
  const houses = worldview === "god" ? Array.from({ length: 12 }, (_, index) => index * 30) : equalHouseCusps(ascendant!);
  return houses;
}
function moonRange(date: string): MoonUncertainty | undefined {
  if (!date) return undefined;
  const start = julianDay(new Date(`${date}T00:00:00.000Z`)); const end = julianDay(new Date(`${date}T23:59:59.000Z`));
  const from = safeCalc(start, 1).longitude; const to = safeCalc(end, 1).longitude;
  return { from, to, label: `${formatLongitude(from)} to ${formatLongitude(to)} possible on this date` };
}

export async function calculateChart(rawInput: ChartInput): Promise<ChartResult> {
  const worldview: Worldview = rawInput.worldview ?? "agent"; const readingScope: ReadingScope = rawInput.readingScope ?? "combined";
  // Natal-only readings never use transit fields, so stale or half-filled form values are ignored.
  const input: ChartInput = readingScope === "natal"
    ? { ...rawInput, transitLocation: undefined, transitLatitude: undefined, transitLongitude: undefined, transitTimezone: undefined, transitDate: undefined, transitTime: undefined }
    : rawInput;
  const agentViewAvailable = worldview !== "god" && Boolean(input.time && input.timezone && input.location);
  if (worldview !== "god" && !agentViewAvailable) throw new Error("Agent View requires birth location, date, time, and timezone.");
  if (worldview === "god" && readingScope !== "transit" && !input.date) throw new Error("God View Natal readings require a birth date; birth time and location are optional.");
  const natalMoment = momentFor(input, worldview, readingScope); const utcDate = natalMoment.date; const jd = julianDay(utcDate);
  const hasAgentLocation = worldview !== "god" && Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  ensureCanonicalReferenceFrame();
  if (hasAgentLocation && !input.sunriseAnchor) throw new Error("SUNRISE_ANCHOR_REQUIRED: Cannot calculate Agent View without a verified sunrise UTC time and fixed-frame Sun XYZ. No legacy Ascendant fallback.");
  const asc = hasAgentLocation ? ascendantFromSunrise({ ...input.sunriseAnchor!, eventUtc: utcDate.toISOString(), latitude: input.latitude }).ascendant : null;
  // In the zero-tilt equatorial wheel, the upper meridian is 90° behind the eastern horizon.
  // Derive MC from the SAME sunrise-anchored rotation as ASC; never mix in Swiss houses_ex geometry.
  const mc = asc == null ? null : normalizeLongitude(asc - 90);
  if (hasAgentLocation && !Number.isFinite(asc)) throw new Error("SUNRISE_ASC_INVALID: Sunrise-derived natal Ascendant is not finite.");
  const houses = fixedHouseRows(worldview, asc);
  const houseFor = (longitude: number) => worldview === "god" ? godHouseFor(longitude) : agentHouseFor(longitude, asc ?? 0);
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const movingBodies = planetNames.map((name, i) => { const xyz = input.xyzPositions?.[name]; const automatic = xyz ? undefined : calculatedXYZ(jd, i); const p = xyz ? { longitude: longitudeFromXYZ(xyz), speed: 0 } : { longitude: automatic!.longitude, speed: safeCalc(jd, i).speed }; const topocentricLongitude = !xyz && planetaryTopocentric(i, hasAgentLocation) ? topocentricMoonLongitude(jd, input.longitude, input.latitude, input.elevation ?? 0) : undefined; return row(name, p.longitude, houseFor(p.longitude), worldview, asc, { retrograde: xyz ? undefined : p.speed < 0, speed: xyz ? undefined : p.speed, coordinateSource: xyz ? "external-xyz" : "swiss-ephemeris", xyz: xyz ?? automatic!.xyz, ...(topocentricLongitude == null ? {} : { topocentricLongitude }), ...(worldview === "god" && name === "Moon" && input.birthTimeKnown === false ? { uncertainty: moonRange(input.date) } : {}) }); });
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
    "Chart planetary positions are projected from Cartesian XYZ in the configured Aldebaran sidereal frame; reference longitudes are used only to validate frame alignment.",
    input.sunriseAnchor ? "Natal Ascendant: sunrise XYZ anchor supplied by caller; independent historical-source verification is not recorded." : "Natal Ascendant: not calculated in God View; Agent View requires a sunrise anchor and fails closed.",
    input.transitSunriseAnchor ? "Transit Ascendant: sunrise XYZ anchor supplied by caller; independent historical-source verification is not recorded." : "Transit Ascendant: no local transit Ascendant calculated without sunrise anchor.",
    input.xyzPositions ? "Supplied XYZ vectors override matching natal planetary longitudes in the fixed 360° plane; missing bodies retain Swiss Ephemeris positions." : "Planetary longitudes are canonical geocentric values; only the Moon receives a separate topocentric correction.",
  ] };
  const transitCoordinatesPresent = [input.transitLatitude, input.transitLongitude].some(value => value !== undefined && Number.isFinite(value));
  const transitInputsPresent = Boolean(input.transitDate?.trim() || input.transitTime?.trim() || input.transitTimezone?.trim() || input.transitLocation?.trim() || transitCoordinatesPresent);
  const transitLocationResolved = worldview !== "god" && Boolean(input.transitLocation?.trim() && input.transitTimezone?.trim() && Number.isFinite(input.transitLatitude) && Number.isFinite(input.transitLongitude));
  if (worldview !== "god" && transitInputsPresent && !transitLocationResolved) throw new Error("Transit location must be resolved before calculating transit houses.");
  const transitMoment = momentFor(input, worldview, readingScope, true); const transitDate = transitMoment.date; const transitJd = julianDay(transitDate);
  const transitHasLocation = worldview !== "god" && transitLocationResolved;
  ensureCanonicalReferenceFrame();
  if (transitHasLocation && !input.transitSunriseAnchor) throw new Error("TRANSIT_SUNRISE_ANCHOR_REQUIRED: Cannot calculate local transit houses without sunrise UTC and fixed-frame Sun XYZ. No legacy Ascendant fallback.");
  const transitAsc = transitHasLocation ? ascendantFromSunrise({ ...input.transitSunriseAnchor!, eventUtc: transitDate.toISOString(), latitude: input.transitLatitude as number }).ascendant : null;
  if (transitHasLocation && !Number.isFinite(transitAsc)) throw new Error("TRANSIT_SUNRISE_ASC_INVALID: Sunrise-derived transit Ascendant is not finite.");
  const transitHouseFrame: TransitHouseFrame = worldview === "god" ? "god-fixed" : transitHasLocation ? "transit-location" : "natal-location";
  const natalTargets = worldview === "god" ? [] : [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), northNode, southNode];
  const transits: TransitRow[] = planetNames.map((name, i) => { const xyz = input.transitXYZPositions?.[name]; const automatic = xyz ? undefined : calculatedXYZ(transitJd, i); const p = xyz ? { longitude: longitudeFromXYZ(xyz), speed: 0 } : { longitude: automatic!.longitude, speed: safeCalc(transitJd, i).speed }; const topocentricLongitude = !xyz && planetaryTopocentric(i, transitHasLocation) ? topocentricMoonLongitude(transitJd, input.transitLongitude as number, input.transitLatitude as number, input.elevation ?? 0) : undefined; const contacts = natalTargets.flatMap(natal => { const found = aspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); const minorNatalContacts = natalTargets.flatMap(natal => { const found = minorAspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); const house = worldview === "god" ? godHouseFor(p.longitude) : agentHouseFor(p.longitude, transitAsc ?? asc ?? 0); return { ...row(name, p.longitude, house, worldview, transitAsc ?? asc, { retrograde: xyz ? undefined : p.speed < 0, speed: xyz ? undefined : p.speed, coordinateSource: xyz ? "external-xyz" : "swiss-ephemeris", xyz: xyz ?? automatic!.xyz, ...(topocentricLongitude == null ? {} : { topocentricLongitude }) }), natalContacts: contacts, minorNatalContacts }; });
  const transitNodePosition = safeCalc(transitJd, 10).longitude; const transitNorthNode = row("North Node", transitNodePosition, worldview === "god" ? godHouseFor(transitNodePosition) : agentHouseFor(transitNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 }); const transitSouthNodePosition = normalizeLongitude(transitNodePosition + 180); const transitSouthNode = row("South Node", transitSouthNodePosition, worldview === "god" ? godHouseFor(transitSouthNodePosition) : agentHouseFor(transitSouthNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 });
  const contactsFor = (transit: ChartRow) => natalTargets.flatMap(natal => { const found = aspectBetween(transit.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; });
  const minorContactsFor = (transit: ChartRow) => natalTargets.flatMap(natal => { const found = minorAspectBetween(transit.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; });
  return { input, worldview, readingScope, agentViewAvailable, utc: utcDate.toISOString(), julianDay: jd, ascendant: ascRow, descendant, midheaven: mcRow, northNode, southNode, houses, movingBodies, frozenStars, godPlacements, transitDate: transitDate.toISOString(), momentPrecision: transitMoment.precision, transitHouseFrame, transits: [...transits, { ...transitNorthNode, natalContacts: contactsFor(transitNorthNode), minorNatalContacts: minorContactsFor(transitNorthNode) }, { ...transitSouthNode, natalContacts: contactsFor(transitSouthNode), minorNatalContacts: minorContactsFor(transitSouthNode) }], validation };
}

export async function geocodeLocation(query: string) {
  const normalizedQuery = query.trim();
  // Resolve explicit US state names within the United States rather than accepting an unrelated worldwide first match.
  const explicitlyUS = /\b(?:USA|United States|Texas|Nevada|California|Florida|New York|Illinois|Arizona|Colorado)\b/i.test(normalizedQuery);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5${explicitlyUS ? "&countrycodes=us" : ""}&q=${encodeURIComponent(normalizedQuery)}`;
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
      const item = data.find(candidate => !explicitlyUS || candidate.address?.country_code === "us");
      if (!item) throw new Error("No matching place found in the specified country. Please enter city, state and country.");
      const lat = Number(item.lat); const lon = Number(item.lon); const timezone = tzLookup(lat, lon); return { label: item.display_name, latitude: lat, longitude: lon, timezone };
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
