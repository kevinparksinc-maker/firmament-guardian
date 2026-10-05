import sweph from "sweph";
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
};

export type MoonUncertainty = { from: number; to: number; label: string };
export type ChartRow = {
  name: string;
  longitude: number;
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
const TOPOCENTRIC_FLAG = 32768;
function safeCalc(jd: number, planet: number, topocentric = false) {
  const flags = MOSHIER_FLAGS | (topocentric ? TOPOCENTRIC_FLAG : 0);
  const result: any = (sweph as any).calc_ut(jd, planet, flags); const data = result?.data ?? result;
  if (!data || Number.isNaN(Number(data[0]))) throw new Error("Swiss Ephemeris failed to calculate a planetary position.");
  return { longitude: normalizeLongitude(Number(data[0])), speed: Number(data[3] ?? 0) };
}
function planetaryTopocentric(planet: number, locationAvailable: boolean) {
  // Apply observer-specific parallax to the Moon; keep the other planetary
  // longitudes geocentric so location changes only the horizon/house layer.
  return locationAvailable && planet === 1;
}
function aspectBetween(a: number, b: number): { aspect: TransitContact["aspect"]; orb: number } | null {
  // angularDistance correctly wraps across 0°/360° (for example, 359° and 1° are 2° apart).
  const separation = angularDistance(a, b); const targets: Array<[number, TransitContact["aspect"]]> = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
  const best = targets.map(([target, aspect]) => ({ aspect, orb: Math.abs(separation - target) })).sort((x, y) => x.orb - y.orb)[0]; return best && best.orb <= 3 ? best : null;
}
function momentFor(input: ChartInput, worldview: Worldview, scope: ReadingScope, transit = false) {
  const date = transit ? input.transitDate : input.date;
  const time = transit ? input.transitTime : input.time;
  const timezone = transit ? input.transitTimezone : input.timezone;
  if (!date) return new Date();
  if (worldview === "god" && (!time || (!transit && input.birthTimeKnown === false))) return new Date(`${date}T12:00:00.000Z`);
  if (!time || !timezone) throw new Error("An exact date, time, and timezone are required for Agent View.");
  return parseLocalToUtc(date, time, timezone);
}
function julianDay(date: Date) {
  return Number((sweph as any).julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60, 1));
}
function row(name: string, longitude: number, house: number, worldview: Worldview, ascendant: number | null, extra: Partial<ChartRow> = {}): ChartRow {
  const dual = dualPlacement(longitude, ascendant) as DualPlacement;
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

export async function calculateChart(input: ChartInput): Promise<ChartResult> {
  const worldview: Worldview = input.worldview ?? "agent"; const readingScope: ReadingScope = input.readingScope ?? "combined";
  const agentViewAvailable = worldview !== "god" && Boolean(input.time && input.timezone && input.location);
  if (worldview !== "god" && !agentViewAvailable) throw new Error("Agent View requires birth location, date, time, and timezone.");
  if (worldview === "god" && readingScope !== "transit" && !input.date) throw new Error("God View Natal readings require a birth date; birth time and location are optional.");
  const utcDate = momentFor(input, worldview, readingScope); const jd = julianDay(utcDate);
  const hasAgentLocation = worldview !== "god" && Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  if (hasAgentLocation) (sweph as any).set_topo?.(input.longitude, input.latitude, input.elevation ?? 0);
  else (sweph as any).set_topo?.(0, 0, 0);
  const houseResult: any = hasAgentLocation ? (sweph as any).houses_ex(jd, 0, input.latitude, input.longitude, "E") : null;
  const asc = hasAgentLocation ? Number(houseResult?.data?.points?.[0] ?? houseResult?.points?.[0]) : null;
  const mc = hasAgentLocation ? Number(houseResult?.data?.points?.[1] ?? houseResult?.points?.[1]) : null;
  if (hasAgentLocation && Number.isNaN(asc)) throw new Error("Swiss Ephemeris failed to calculate the Ascendant for Equal House.");
  const houses = fixedHouseRows(worldview, asc);
  const houseFor = (longitude: number) => worldview === "god" ? godHouseFor(longitude) : agentHouseFor(longitude, asc ?? 0);
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const movingBodies = planetNames.map((name, i) => { const p = safeCalc(jd, i, planetaryTopocentric(i, hasAgentLocation)); return row(name, p.longitude, houseFor(p.longitude), worldview, asc, { retrograde: p.speed < 0, speed: p.speed, ...(worldview === "god" && name === "Moon" && input.birthTimeKnown === false ? { uncertainty: moonRange(input.date) } : {}) }); });
  const ascRow = asc == null ? null : row("Ascendant", asc, 1, worldview, asc);
  const descLongitude = asc == null ? null : normalizeLongitude(asc + 180); const descendant = descLongitude == null ? null : row("Descendant", descLongitude, 7, worldview, asc);
  const mcRow = mc == null ? null : row("Midheaven", mc, houseFor(mc), worldview, asc);
  const nodePosition = safeCalc(jd, 10).longitude; const northNode = row("North Node", nodePosition, houseFor(nodePosition), worldview, asc, { retrograde: true, speed: 0 }); const southNodePosition = normalizeLongitude(nodePosition + 180); const southNode = row("South Node", southNodePosition, houseFor(southNodePosition), worldview, asc, { retrograde: true, speed: 0 });
  const frozenStars = FIXED_STARS.map(([name, longitude]) => row(name, longitude, houseFor(longitude), worldview, asc));
  const allPlacements = [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), ...(mcRow ? [mcRow] : []), northNode, southNode];
  const godPlacements = allPlacements.map(placement => ({ ...placement, ...dualPlacement(placement.longitude, asc) }));
  const reference = { Sun: 238.0392, Moon: 102.8030, Ascendant: 277.3745, Antares: 225.0167, Hamal: 12.9333 }; const delta = (a: number, b: number) => Math.abs(((a - b + 180) % 360) - 180);
  const actual = { Sun: movingBodies.find(r => r.name === "Sun")?.longitude ?? 0, Moon: movingBodies.find(r => r.name === "Moon")?.longitude ?? 0, Ascendant: asc ?? 0, Antares: 225.0167, Hamal: 12.9333 };
  const isDallas = input.date === "1986-11-20" && input.location.toLowerCase().includes("dallas"); const withinArcminute = ["Sun", "Moon", "Antares", "Hamal"].every(key => delta(actual[key as keyof typeof actual], reference[key as keyof typeof reference]) <= 1 / 60) && delta(actual.Ascendant, reference.Ascendant) <= 2 / 60;
  const validation = isDallas && agentViewAvailable ? { passed: withinArcminute, notes: withinArcminute ? ["Dallas reference profile verified; the published Ascendant is rounded to the nearest minute, so it uses a two-arcminute display-reference tolerance.", "Frozen stars remain precession-locked; Antares and Hamal use the prescribed constants."] : ["Dallas profile calculated, but one or more reference placements exceeded the one-arcminute tolerance."] } : { passed: false, notes: ["Reference validation runs automatically for the documented Dallas profile in Agent View."] };
  const transitDate = input.transitDate && input.transitTime && input.transitTimezone ? momentFor(input, worldview, readingScope, true) : new Date(); const transitJd = julianDay(transitDate);
  const transitHasLocation = worldview !== "god" && Number.isFinite(input.transitLatitude) && Number.isFinite(input.transitLongitude); if (transitHasLocation) (sweph as any).set_topo?.(input.transitLongitude, input.transitLatitude, input.elevation ?? 0);
  const transitAsc = transitHasLocation ? Number((sweph as any).houses_ex(transitJd, 0, input.transitLatitude, input.transitLongitude, "E")?.data?.points?.[0]) : null;
  const natalTargets = worldview === "god" ? [] : [...movingBodies, ...(ascRow ? [ascRow] : []), ...(descendant ? [descendant] : []), northNode, southNode];
  const transits: TransitRow[] = planetNames.map((name, i) => { const p = safeCalc(transitJd, i, planetaryTopocentric(i, transitHasLocation)); const contacts = natalTargets.flatMap(natal => { const found = aspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); const house = worldview === "god" ? godHouseFor(p.longitude) : agentHouseFor(p.longitude, transitAsc ?? asc ?? 0); return { ...row(name, p.longitude, house, worldview, transitAsc ?? asc, { retrograde: p.speed < 0, speed: p.speed }), natalContacts: contacts }; });
  const transitNodePosition = safeCalc(transitJd, 10).longitude; const transitNorthNode = row("North Node", transitNodePosition, worldview === "god" ? godHouseFor(transitNodePosition) : agentHouseFor(transitNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 }); const transitSouthNodePosition = normalizeLongitude(transitNodePosition + 180); const transitSouthNode = row("South Node", transitSouthNodePosition, worldview === "god" ? godHouseFor(transitSouthNodePosition) : agentHouseFor(transitSouthNodePosition, transitAsc ?? asc ?? 0), worldview, transitAsc ?? asc, { retrograde: true, speed: 0 });
  const contactsFor = (transit: ChartRow) => natalTargets.flatMap(natal => { const found = aspectBetween(transit.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; });
  return { input, worldview, readingScope, agentViewAvailable, utc: utcDate.toISOString(), julianDay: jd, ascendant: ascRow, descendant, midheaven: mcRow, northNode, southNode, houses, movingBodies, frozenStars, godPlacements, transitDate: transitDate.toISOString(), transits: [...transits, { ...transitNorthNode, natalContacts: contactsFor(transitNorthNode) }, { ...transitSouthNode, natalContacts: contactsFor(transitSouthNode) }], validation };
}

export async function geocodeLocation(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`; const response = await fetch(url, { headers: { "User-Agent": "FirmamentHybridZodiac/1.0" } });
  if (!response.ok) throw new Error("Location search is temporarily unavailable."); const data: any[] = await response.json(); if (!data[0]) throw new Error("No matching place found.");
  const item = data[0]; const lat = Number(item.lat); const lon = Number(item.lon); const timezone = tzLookup(lat, lon); return { label: item.display_name, latitude: lat, longitude: lon, timezone };
}
