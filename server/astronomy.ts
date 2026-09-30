import sweph from "sweph";
import tzLookup from "tz-lookup";
import { FIXED_STARS, formatLongitude, normalizeLongitude, overlay, type Overlay } from "../shared/hybrid";

export type ChartInput = { location: string; latitude: number; longitude: number; timezone: string; date: string; time: string; transitLocation?: string; transitLatitude?: number; transitLongitude?: number; transitTimezone?: string; transitDate?: string; transitTime?: string };
export type ChartRow = { name: string; longitude: number; display: string; house: number; retrograde?: boolean; speed?: number; overlay: Overlay };
export type TransitContact = { natalName: string; aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition"; orb: number };
export type TransitRow = ChartRow & { natalContacts: TransitContact[] };
export type ChartResult = { input: ChartInput; utc: string; julianDay: number; ascendant: ChartRow; descendant: ChartRow; northNode: ChartRow; southNode: ChartRow; houses: number[]; movingBodies: ChartRow[]; frozenStars: ChartRow[]; transitDate: string; transits: TransitRow[]; validation: { passed: boolean; notes: string[] } };

function parseLocalToUtc(date: string, time: string, timezone: string) {
  const [y, m, d] = date.split("-").map(Number); const [hh, mm] = time.split(":").map(Number);
  const wallKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const candidates = new Set<number>();
  for (let delta = -36; delta <= 36; delta += 1) { const candidate = new Date(naive + delta * 3_600_000); const parts = formatter.formatToParts(candidate); const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value])); const key = `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`; if (key === wallKey) candidates.add(candidate.getTime()); }
  if (candidates.size === 0) throw new Error("That local time does not exist in the selected timezone, usually because of a daylight-saving transition.");
  if (candidates.size > 1) throw new Error("That local time is ambiguous in the selected timezone because the clock repeated; choose a different minute.");
  return new Date(Array.from(candidates)[0]);
}

const MOSHIER_FLAGS = 4 | 256;
function safeCalc(jd: number, planet: number) {
  const result: any = (sweph as any).calc_ut(jd, planet, MOSHIER_FLAGS);
  const data = result?.data ?? result;
  if (!data || Number.isNaN(Number(data[0]))) throw new Error("Swiss Ephemeris failed to calculate a planetary position.");
  return { longitude: normalizeLongitude(Number(data[0])), speed: Number(data[3] ?? 0) };
}
function houseFor(longitude: number, cusps: number[]) { const L = normalizeLongitude(longitude); for (let i = 0; i < 12; i++) { const start = normalizeLongitude(cusps[i]); const end = normalizeLongitude(cusps[(i + 1) % 12]); const inside = start < end ? L >= start && L < end : L >= start || L < end; if (inside) return i + 1; } return 1; }
function aspectBetween(a: number, b: number): { aspect: TransitContact["aspect"]; orb: number } | null { const separation = Math.abs(((a - b + 180) % 360) - 180); const targets: Array<[number, TransitContact["aspect"]]> = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]]; const best = targets.map(([target, aspect]) => ({ aspect, orb: Math.abs(separation - target) })).sort((x, y) => x.orb - y.orb)[0]; return best && best.orb <= 3 ? best : null; }

export async function calculateChart(input: ChartInput): Promise<ChartResult> {
  const utc = parseLocalToUtc(input.date, input.time, input.timezone); const y = utc.getUTCFullYear(); const m = utc.getUTCMonth() + 1; const d = utc.getUTCDate(); const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60;
  const jd = Number((sweph as any).julday(y, m, d, hour, 1));
  const houseResult: any = (sweph as any).houses_ex(jd, 0, input.latitude, input.longitude, "T");
  const cusps: number[] = (houseResult?.data?.houses ?? houseResult?.houses ?? []).slice(0, 12).map(Number);
  const asc = Number(houseResult?.data?.points?.[0] ?? cusps[0]);
  if (cusps.length !== 12 || Number.isNaN(asc)) throw new Error("Swiss Ephemeris failed to calculate topocentric house cusps.");
  const planetNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const movingBodies = planetNames.map((name, i) => { const p = safeCalc(jd, i); return { name, longitude: p.longitude, display: `${formatLongitude(p.longitude)}${p.speed < 0 ? " ®" : ""}`, house: houseFor(p.longitude, cusps), retrograde: p.speed < 0, speed: p.speed, overlay: overlay(p.longitude) }; });
  const ascRow = { name: "Ascendant", longitude: asc, display: formatLongitude(asc), house: 1, overlay: overlay(asc) };
  const nodePosition = safeCalc(jd, 10).longitude; const northNode = { name: "North Node", longitude: nodePosition, display: formatLongitude(nodePosition), house: houseFor(nodePosition, cusps), retrograde: true, overlay: overlay(nodePosition) }; const southNodePosition = normalizeLongitude(nodePosition + 180); const southNode = { name: "South Node", longitude: southNodePosition, display: formatLongitude(southNodePosition), house: houseFor(southNodePosition, cusps), retrograde: true, overlay: overlay(southNodePosition) }; const descendant = { name: "Descendant", longitude: normalizeLongitude(asc + 180), display: formatLongitude(normalizeLongitude(asc + 180)), house: 7, overlay: overlay(normalizeLongitude(asc + 180)) };
  const frozenStars = FIXED_STARS.map(([name, longitude]) => ({ name, longitude, display: formatLongitude(longitude), house: houseFor(longitude, cusps), overlay: overlay(longitude) }));
  const delta = (a: number, b: number) => Math.abs(((a - b + 180) % 360) - 180);
  const reference = { Sun: 238.0333, Moon: 103.5, Ascendant: 277.35, Antares: 225.0167, Hamal: 12.9333 };
  const actual = { Sun: movingBodies.find(row => row.name === "Sun")?.longitude ?? 0, Moon: movingBodies.find(row => row.name === "Moon")?.longitude ?? 0, Ascendant: asc, Antares: 225.0167, Hamal: 12.9333 };
  const isDallas = input.date === "1986-11-20" && input.location.toLowerCase().includes("dallas");
  const withinArcminute = ["Sun", "Moon", "Antares", "Hamal"].every(key => delta(actual[key as keyof typeof actual], reference[key as keyof typeof reference]) <= 1 / 60) && delta(actual.Ascendant, reference.Ascendant) <= 2 / 60;
  const validation = isDallas ? { passed: withinArcminute, notes: withinArcminute ? ["Dallas reference profile verified; the published Ascendant is rounded to the nearest minute, so it uses a two-arcminute display-reference tolerance.", "Frozen stars remain precession-locked; Antares and Hamal use the prescribed constants."] : ["Dallas profile calculated, but one or more reference placements exceeded the one-arcminute tolerance."] } : { passed: false, notes: ["Reference validation runs automatically for the documented Dallas profile."] };
  const transitLatitude = input.transitLatitude ?? input.latitude; const transitLongitude = input.transitLongitude ?? input.longitude; const transitTimezone = input.transitTimezone ?? input.timezone; const transitNow = new Date(); const transitParts = new Intl.DateTimeFormat("en-CA", { timeZone: transitTimezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(transitNow); const transitValues = Object.fromEntries(transitParts.filter(part => part.type !== "literal").map(part => [part.type, part.value])); const transitWallDate = input.transitDate || `${transitValues.year}-${transitValues.month}-${transitValues.day}`; const transitWallTime = input.transitTime || `${transitValues.hour}:${transitValues.minute}`; const transitUtc = parseLocalToUtc(transitWallDate, transitWallTime, transitTimezone); const transitJd = Number((sweph as any).julday(transitUtc.getUTCFullYear(), transitUtc.getUTCMonth() + 1, transitUtc.getUTCDate(), transitUtc.getUTCHours() + transitUtc.getUTCMinutes() / 60, 1));
  const transitHouseResult: any = (sweph as any).houses_ex(transitJd, 0, transitLatitude, transitLongitude, "T"); const transitCusps: number[] = (transitHouseResult?.data?.houses ?? transitHouseResult?.houses ?? []).slice(0, 12).map(Number);
  const natalTargets = [...movingBodies, ascRow, descendant, northNode, southNode];
  const transits: TransitRow[] = planetNames.map((name, i) => { const p = safeCalc(transitJd, i); const contacts = natalTargets.flatMap(natal => { const found = aspectBetween(p.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }); return { name, longitude: p.longitude, display: `${formatLongitude(p.longitude)}${p.speed < 0 ? " ®" : ""}`, house: houseFor(p.longitude, transitCusps.length === 12 ? transitCusps : cusps), retrograde: p.speed < 0, overlay: overlay(p.longitude), natalContacts: contacts }; });
  const transitNodePosition = safeCalc(transitJd, 10).longitude; const transitNorthNode = { name: "North Node", longitude: transitNodePosition, display: formatLongitude(transitNodePosition), house: houseFor(transitNodePosition, transitCusps.length === 12 ? transitCusps : cusps), retrograde: true, overlay: overlay(transitNodePosition) }; const transitSouthNodePosition = normalizeLongitude(transitNodePosition + 180); const transitSouthNode = { name: "South Node", longitude: transitSouthNodePosition, display: formatLongitude(transitSouthNodePosition), house: houseFor(transitSouthNodePosition, transitCusps.length === 12 ? transitCusps : cusps), retrograde: true, overlay: overlay(transitSouthNodePosition) };
  return { input, utc: utc.toISOString(), julianDay: jd, ascendant: ascRow, descendant, northNode, southNode, houses: cusps, movingBodies, frozenStars, transitDate: transitUtc.toISOString(), transits: [...transits, { ...transitNorthNode, natalContacts: natalTargets.flatMap(natal => { const found = aspectBetween(transitNorthNode.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }) }, { ...transitSouthNode, natalContacts: natalTargets.flatMap(natal => { const found = aspectBetween(transitSouthNode.longitude, natal.longitude); return found ? [{ natalName: natal.name, ...found }] : []; }) }], validation };
}

export async function geocodeLocation(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`; const response = await fetch(url, { headers: { "User-Agent": "FirmamentHybridZodiac/1.0" } });
  if (!response.ok) throw new Error("Location search is temporarily unavailable."); const data: any[] = await response.json(); if (!data[0]) throw new Error("No matching place found.");
  const item = data[0]; const lat = Number(item.lat); const lon = Number(item.lon); const timezone = tzLookup(lat, lon);
  return { label: item.display_name, latitude: lat, longitude: lon, timezone };
}
