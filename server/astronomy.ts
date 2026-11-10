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
  worldview?: Worldview;
  readingScope?: ReadingScope;
  birthTimeKnown?: boolean;
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
  /** Every longitude exposed by this result uses the same fixed reference frame. */
  referenceFrame: CoordinateFrame;
  /** Canonical dome/lots geometry derived from the same longitudes. */
  firmament: {
    model: "zero-obliquity-visual-convention";
    horizonModel: "zero-tilt-local-sidereal" | "not-available";
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

const MOSHIER_FLAGS = 4 | 256;
// Swiss Ephemeris Aldebaran at 15 Taurus (sidereal mode 14).
const ALDEBARAN_15_TAU_MODE = 14;
const SIDEREAL_FLAG = 65536;
export function setCanonicalReferenceFrame() {
  const sw = sweph as any;
  if (typeof sw.set_sid_mode !== "function") throw new Error("Swiss Ephemeris sidereal mode is unavailable.");
  sw.set_sid_mode(ALDEBARAN_15_TAU_MODE, 0, 0);
}
function babylonianAyanamsha(jd: number): number {
  setCanonicalReferenceFrame();
  const sw = sweph as any;
  if (typeof sw.get_ayanamsa_ut !== "function") throw new Error("Swiss Ephemeris ayanamsha calculation is unavailable.");
  const result: any = sw.get_ayanamsa_ut(jd);
  const value = Number(result?.data?.[0] ?? result?.data ?? result?.ayanamsa ?? result);
  if (!Number.isFinite(value)) throw new Error("Swiss Ephemeris returned an invalid Aldebaran ayanamsha.");
  return value;
}
function babylonianLongitude(tropicalLongitude: number, jd: number) {
  return normalizeLongitude(tropicalLongitude - babylonianAyanamsha(jd));
}
const TOPOCENTRIC_FLAG = 32768;
function rawCalc(jd: number, planet: number, flags: number) {
  const result: any = (sweph as any).calc_ut(jd, planet, flags); const data = result?.data ?? result;
  if (!data || Number.isNaN(Number(data[0]))) throw new Error("Swiss Ephemeris failed to calculate a planetary position.");
  return { longitude: normalizeLongitude(Number(data[0])), speed: Number(data[3] ?? 0) };
}
/** Geocentric position. Never touches sweph's global topocentric observer. */
function safeCalc(jd: number, planet: number) {
  setCanonicalReferenceFrame();
  return rawCalc(jd, planet, MOSHIER_FLAGS | SIDEREAL_FLAG);
}
/** Canonical geocentric position for downstream engines that need the same frame. */
export function canonicalPositionAt(jd: number, planet: number) {
  return safeCalc(jd, planet);
}
/** Parallax-corrected Moon longitude for one observer; always restores the zero observer. */
function topocentricMoonLongitude(jd: number, longitude: number, latitude: number, elevation = 0) {
  const sw = sweph as any;
  setCanonicalReferenceFrame();
  try {
    sw.set_topo?.(longitude, latitude, elevation);
    return rawCalc(jd, 1, MOSHIER_FLAGS | TOPOCENTRIC_FLAG | SIDEREAL_FLAG).longitude;
  } finally {
    sw.set_topo?.(0, 0, 0);
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

function canonicalLocalSiderealAngle(jd: number, observerLongitude: number) {
  const sw = sweph as any;
  if (typeof sw.sidtime !== "function") throw new Error("Swiss Ephemeris sidereal-time calculation is unavailable.");
  const greenwichDegrees = Number(sw.sidtime(jd)) * 15;
  if (!Number.isFinite(greenwichDegrees)) throw new Error("Swiss Ephemeris returned an invalid sidereal time.");
  // sidtime() is Greenwich apparent sidereal time in the tropical equatorial
  // origin. Apply the mode-14 ayanamsha exactly once to enter the canonical
  // Aldebaran-anchored zodiac frame.
  return normalizeLongitude(greenwichDegrees + observerLongitude - babylonianAyanamsha(jd));
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
    ? { ...rawInput, transitLocation: undefined, transitLatitude: undefined, transitLongitude: undefined, transitTimezone: undefined, transitDate: undefined, transitTime: undefined }
    : rawInput;
  const agentViewAvailable = worldview !== "god" && Boolean(input.time && input.timezone && input.location);
  if (worldview !== "god" && !agentViewAvailable) throw new Error("Agent View requires birth location, date, time, and timezone.");
  if (worldview === "god" && readingScope !== "transit" && !input.date) throw new Error("God View Natal readings require a birth date; birth time and location are optional.");
  const natalMoment = momentFor(input, worldview, readingScope); const utcDate = natalMoment.date; const jd = julianDay(utcDate);
  const hasAgentLocation = worldview !== "god" && Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const natalAngles = hasAgentLocation ? calculateZeroTiltAscendant(canonicalLocalSiderealAngle(jd, input.longitude)) : null;
  const asc = natalAngles?.ascendant ?? null;
  const mc = natalAngles?.midheaven ?? null;
  const houses = fixedHouseRows(worldview, asc);
  const houseFor = (longitude: number) => worldview === "god" ? godHouseFor(longitude) : agentHouseFor(longitude, asc ?? 0);
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const movingBodies = planetNames.map((name, i) => { const p = safeCalc(jd, i); const topocentricLongitude = planetaryTopocentric(i, hasAgentLocation) ? topocentricMoonLongitude(jd, input.longitude, input.latitude, input.elevation ?? 0) : undefined; return row(name, p.longitude, houseFor(p.longitude), worldview, asc, { retrograde: p.speed < 0, speed: p.speed, ...(topocentricLongitude == null ? {} : { topocentricLongitude }), ...(worldview === "god" && name === "Moon" && input.birthTimeKnown === false ? { uncertainty: moonRange(input.date) } : {}) }); });
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
    "Chart calculated in Equal Houses using the Firmament Aldebaran-at-15-Taurus fixed reference frame (Swiss Ephemeris mode 14) for moving planets and nodes; Agent View angles use the verified zero-tilt local-sidereal eastern horizon.",
    "Fixed-star archive retains defined symbolic positions; stars not historically calibrated are not claimed as catalog-verified.",
  ] };
  const transitCoordinatesPresent = [input.transitLatitude, input.transitLongitude].some(value => value !== undefined && Number.isFinite(value) && value !== 0);
  const transitInputsPresent = Boolean(input.transitDate?.trim() || input.transitTime?.trim() || input.transitTimezone?.trim() || input.transitLocation?.trim() || transitCoordinatesPresent);
  const transitLocationResolved = worldview !== "god" && Boolean(input.transitLocation?.trim() && input.transitTimezone?.trim() && Number.isFinite(input.transitLatitude) && Number.isFinite(input.transitLongitude));
  if (worldview !== "god" && transitInputsPresent && !transitLocationResolved) throw new Error("Transit location must be resolved before calculating transit houses.");
  const transitMoment = momentFor(input, worldview, readingScope, true); const transitDate = transitMoment.date; const transitJd = julianDay(transitDate);
  const transitHasLocation = worldview !== "god" && transitLocationResolved;
  const transitAngles = transitHasLocation ? calculateZeroTiltAscendant(canonicalLocalSiderealAngle(transitJd, input.transitLongitude as number)) : null;
  const transitAsc = transitAngles?.ascendant ?? null;
  const transitHouseFrame: TransitHouseFrame = worldview === "god" ? "god-fixed" : transitHasLocation ? "transit-location" : "natal-location";
  const natalTargets = worldview === "god" ? [] : [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), northNode, southNode];
  const transits: TransitRow[] = planetNames.map((name, i) => { const p = safeCalc(transitJd, i); const topocentricLongitude = planetaryTopocentric(i, transitHasLocation) ? topocentricMoonLongitude(transitJd, input.transitLongitude as number, input.transitLatitude as number, input.elevation ?? 0) : undefined; const contacts = natalTargets.flatMap(natal => { const found = aspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); const house = worldview === "god" ? godHouseFor(p.longitude) : agentHouseFor(p.longitude, transitAsc ?? asc ?? 0); return { ...row(name, p.longitude, house, worldview, transitAsc ?? asc, { retrograde: p.speed < 0, speed: p.speed, ...(topocentricLongitude == null ? {} : { topocentricLongitude }) }), natalContacts: contacts }; });
  const transitNodePosition = safeCalc(transitJd, 10).longitude; const transitNorthNode = row("North Node", transitNodePosition, worldview === "god" ? godHouseFor(transitNodePosition) : agentHouseFor(transitNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 }); const transitSouthNodePosition = normalizeLongitude(transitNodePosition + 180); const transitSouthNode = row("South Node", transitSouthNodePosition, worldview === "god" ? godHouseFor(transitSouthNodePosition) : agentHouseFor(transitSouthNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 });
  const contactsFor = (transit: ChartRow) => natalTargets.flatMap(natal => { const found = aspectBetween(transit.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; });
  const transitRows = [...transits, { ...transitNorthNode, natalContacts: contactsFor(transitNorthNode) }, { ...transitSouthNode, natalContacts: contactsFor(transitSouthNode) }];
  const energyReadV2 = calculateEnergyRead(
    movingBodies.map(body => ({ name: body.name, longitude: body.longitude, agentHouse: body.agentHouse, godHouse: body.godHouse })),
    transits.map(body => ({ name: body.name, longitude: body.longitude, agentHouse: body.agentHouse, godHouse: body.godHouse })),
  );
  const natalGeometry = calculateDomeFramework(domeInput([...movingBodies, northNode, southNode], asc));
  const transitGeometry = calculateDomeFramework(domeInput(transitRows, transitAsc ?? asc));
  return { input, worldview, readingScope, agentViewAvailable, utc: utcDate.toISOString(), julianDay: jd, ascendant: ascRow, descendant, midheaven: mcRow, northNode, southNode, houses, movingBodies, frozenStars, godPlacements, transitDate: transitDate.toISOString(), momentPrecision: transitMoment.precision, transitHouseFrame, transits: transitRows, energyReadV2, validation, referenceFrame: REFERENCE_FRAME, firmament: { model: "zero-obliquity-visual-convention", horizonModel: hasAgentLocation ? "zero-tilt-local-sidereal" : "not-available", natal: natalGeometry, transit: transitGeometry } };
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
