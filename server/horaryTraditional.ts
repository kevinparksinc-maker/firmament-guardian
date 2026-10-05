import { FIXED_STARS, normalizeLongitude, overlay, ZODIAC_SIGNS } from "../shared/hybrid";

type PlacementLike = { name: string; longitude: number; house: number; retrograde?: boolean; speed?: number; sign?: string };
type HouseLike = { house: number; longitude: number; sign: string; ruler: string };

export type TraditionalLot = {
  name: "Fortune" | "Spirit" | "Eros" | "Necessity";
  longitude: number;
  display: string;
  sign: string;
  house: number;
  formula: string;
  meaning: string;
};
export type DignityScore = { planet: string; sign: string; house: number; essential: string[]; essentialScore: number; accidental: string[]; accidentalScore: number; debilities: string[] };
export type Reception = { from: string; to: string; by: "domicile" | "exaltation" | "triplicity" | "term" | "face"; mutual: boolean; description: string };
export type FixedStarTestimony = { star: string; planet: string; orb: number; nature: string; meaning: string };
export type Radicality = { status: "radical" | "caution"; considerations: string[]; explanation: string };
export type TraditionalTiming = { from: string; to: string; aspect: string; degreesToPerfection: number; estimatedUnits: string; method: string };
export type TraditionalHoraryEvidence = { lots: TraditionalLot[]; dignities: DignityScore[]; receptions: Reception[]; fixedStars: FixedStarTestimony[]; radicality: Radicality; timing: TraditionalTiming[]; overlays: Array<{ body: string; display: string; nakshatra: string; pada: number; manzil: string; decan: string }> };

const DOMICILE: Record<string, string> = { Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter" };
const EXALTATION: Record<string, string> = { Aries: "Sun", Taurus: "Moon", Cancer: "Jupiter", Virgo: "Mercury", Libra: "Saturn", Capricorn: "Mars", Pisces: "Venus" };
const DETRIMENT: Record<string, string> = { Aries: "Venus", Taurus: "Mars", Gemini: "Jupiter", Cancer: "Saturn", Leo: "Saturn", Virgo: "Jupiter", Libra: "Mars", Scorpio: "Venus", Sagittarius: "Mercury", Capricorn: "Moon", Aquarius: "Sun", Pisces: "Mercury" };
const FALL: Record<string, string> = { Aries: "Saturn", Scorpio: "Moon", Capricorn: "Jupiter", Pisces: "Mercury", Libra: "Sun" };
const TRIPLICITIES: Record<string, { day: string; night: string; participating: string }> = {
  Fire: { day: "Sun", night: "Jupiter", participating: "Saturn" }, Earth: { day: "Venus", night: "Moon", participating: "Mars" }, Air: { day: "Saturn", night: "Mercury", participating: "Jupiter" }, Water: { day: "Venus", night: "Mars", participating: "Moon" },
};
const ELEMENT: Record<string, keyof typeof TRIPLICITIES> = { Aries: "Fire", Leo: "Fire", Sagittarius: "Fire", Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth", Gemini: "Air", Libra: "Air", Aquarius: "Air", Cancer: "Water", Scorpio: "Water", Pisces: "Water" };
const EGYPTIAN_TERMS: Record<string, Array<[number, string]>> = {
  Aries: [[6, "Jupiter"], [12, "Venus"], [20, "Mercury"], [25, "Mars"], [30, "Saturn"]], Taurus: [[8, "Venus"], [14, "Mercury"], [22, "Jupiter"], [27, "Saturn"], [30, "Mars"]], Gemini: [[6, "Mercury"], [12, "Jupiter"], [17, "Venus"], [24, "Mars"], [30, "Saturn"]], Cancer: [[7, "Mars"], [13, "Venus"], [19, "Mercury"], [26, "Jupiter"], [30, "Saturn"]], Leo: [[6, "Jupiter"], [11, "Venus"], [18, "Saturn"], [24, "Mercury"], [30, "Mars"]], Virgo: [[7, "Mercury"], [17, "Venus"], [21, "Jupiter"], [28, "Mars"], [30, "Saturn"]], Libra: [[6, "Saturn"], [14, "Mercury"], [21, "Jupiter"], [28, "Venus"], [30, "Mars"]], Scorpio: [[7, "Mars"], [11, "Venus"], [19, "Mercury"], [24, "Jupiter"], [30, "Saturn"]], Sagittarius: [[12, "Jupiter"], [17, "Venus"], [21, "Mercury"], [26, "Saturn"], [30, "Mars"]], Capricorn: [[7, "Mercury"], [14, "Jupiter"], [22, "Venus"], [26, "Saturn"], [30, "Mars"]], Aquarius: [[7, "Mercury"], [13, "Venus"], [20, "Jupiter"], [25, "Mars"], [30, "Saturn"]], Pisces: [[12, "Venus"], [16, "Jupiter"], [19, "Mercury"], [28, "Mars"], [30, "Saturn"]],
};
const FACES = ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const STAR_NATURE: Record<string, string> = { Aldebaran: "Mars / Venus", Regulus: "Mars / Jupiter", Antares: "Mars / Jupiter", Fomalhaut: "Venus / Mercury", Sirius: "Jupiter / Mars", Spica: "Venus / Jupiter", Polaris: "Saturn / Venus", Hamal: "Mars / Saturn", Algol: "Saturn / Jupiter", Rigel: "Jupiter / Saturn" };
const STAR_MEANING: Record<string, string> = { Aldebaran: "prominence with a requirement for integrity", Regulus: "visibility, authority, and the need to avoid revenge", Antares: "intensity, contest, and strong conviction", Fomalhaut: "vision, idealism, and unusual inspiration", Sirius: "force, prominence, and strong drive", Spica: "protection, talent, and fortunate support", Polaris: "orientation, endurance, and a fixed point", Hamal: "initiative, pressure, and assertion", Algol: "extreme pressure and the need for careful handling", Rigel: "skill, ambition, and advancement" };

function lon(v: number) { return normalizeLongitude(v); }
function sign(v: number) { return ZODIAC_SIGNS[Math.floor(lon(v) / 30)]; }
function display(v: number) { const d = lon(v); const deg = d % 30; const whole = Math.floor(deg); return `${sign(v)} ${String(whole).padStart(2, "0")}°${String(Math.round((deg - whole) * 60) % 60).padStart(2, "0")}′`; }
function distance(a: number, b: number) { const d = Math.abs(lon(a - b)); return Math.min(d, 360 - d); }
function houseFor(v: number, houses: HouseLike[]) { for (const h of houses) { const next = houses.find(candidate => candidate.house === (h.house % 12) + 1); if (next && lon(v - h.longitude) < lon(next.longitude - h.longitude)) return h.house; } return 12; }
function rulerAt(longitude: number, day: boolean) {
  const s = sign(longitude); const deg = lon(longitude) % 30; const element = ELEMENT[s]; const term = EGYPTIAN_TERMS[s].find(([end]) => deg < end)?.[1];
  return { domicile: DOMICILE[s], exaltation: EXALTATION[s], triplicity: TRIPLICITIES[element][day ? "day" : "night"], term, face: FACES[Math.min(35, Math.floor(lon(longitude) / 10))] };
}
function addMod(a: number, b: number, c: number) { return lon(a + b - c); }

export function calculateTraditionalHorary(input: { ascendant: PlacementLike; houses: HouseLike[]; placements: PlacementLike[]; topicRuler: string; subjectRuler: string; querentRuler: string }): TraditionalHoraryEvidence {
  const sun = input.placements.find(p => p.name === "Sun")!; const moon = input.placements.find(p => p.name === "Moon")!; const day = sun.house >= 7 && sun.house <= 12;
  const lotDefs: Array<[TraditionalLot["name"], number, number, string, string]> = [
    ["Fortune", day ? input.ascendant.longitude : input.ascendant.longitude, day ? moon.longitude : sun.longitude, day ? sun.name : moon.name, "material circumstances, body, and what comes through the world's conditions"],
    ["Spirit", input.ascendant.longitude, day ? sun.longitude : moon.longitude, day ? moon.name : sun.name, "intention, agency, and what comes through directed choice"],
  ];
  const fortune = day ? addMod(input.ascendant.longitude, moon.longitude, sun.longitude) : addMod(input.ascendant.longitude, sun.longitude, moon.longitude);
  const spirit = day ? addMod(input.ascendant.longitude, sun.longitude, moon.longitude) : addMod(input.ascendant.longitude, moon.longitude, sun.longitude);
  const eros = addMod(input.ascendant.longitude, input.placements.find(p => p.name === "Venus")!.longitude, fortune);
  const necessity = addMod(input.ascendant.longitude, fortune, spirit);
  const lots: TraditionalLot[] = [
    { name: "Fortune", longitude: fortune, display: display(fortune), sign: sign(fortune), house: houseFor(fortune, input.houses), formula: day ? "Ascendant + Moon − Sun (day sect)" : "Ascendant + Sun − Moon (night sect)", meaning: lotDefs[0][4] },
    { name: "Spirit", longitude: spirit, display: display(spirit), sign: sign(spirit), house: houseFor(spirit, input.houses), formula: day ? "Ascendant + Sun − Moon (day sect)" : "Ascendant + Moon − Sun (night sect)", meaning: lotDefs[1][4] },
    { name: "Eros", longitude: eros, display: display(eros), sign: sign(eros), house: houseFor(eros, input.houses), formula: "Ascendant + Venus − Fortune", meaning: "desire, attraction, pleasure, and the pull toward union" },
    { name: "Necessity", longitude: necessity, display: display(necessity), sign: sign(necessity), house: houseFor(necessity, input.houses), formula: "Ascendant + Fortune − Spirit", meaning: "constraint, obligation, and what circumstances require" },
  ];
  const dignities: DignityScore[] = input.placements.filter(p => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(p.name)).map(p => {
    const s = p.sign ?? sign(p.longitude); const r = rulerAt(p.longitude, day); const essential: string[] = []; const debilities: string[] = []; let essentialScore = 0;
    if (r.domicile === p.name) { essential.push("domicile"); essentialScore += 5; } if (r.exaltation === p.name) { essential.push("exaltation"); essentialScore += 4; } if (r.triplicity === p.name) { essential.push("triplicity ruler"); essentialScore += 3; } if (r.term === p.name) { essential.push("Egyptian term"); essentialScore += 2; } if (r.face === p.name) { essential.push("face"); essentialScore += 1; }
    if (DETRIMENT[s] === p.name) debilities.push("detriment"); if (FALL[s] === p.name) debilities.push("fall"); if (p.retrograde) debilities.push("retrograde"); if (p.house >= 6 && p.house <= 12 && ![7, 10].includes(p.house)) debilities.push("cadent house");
    const accidental: string[] = []; let accidentalScore = 0; if ([1, 4, 7, 10].includes(p.house)) { accidental.push("angular"); accidentalScore += 5; } else if ([2, 5, 8, 11].includes(p.house)) { accidental.push("succedent"); accidentalScore += 2; } else { accidental.push("cadent"); accidentalScore -= 2; }
    const sunDistance = distance(p.longitude, input.placements.find(x => x.name === "Sun")!.longitude); if (p.name !== "Sun" && sunDistance < 8.5) debilities.push("combust"); else if (p.name !== "Sun" && sunDistance < 17) debilities.push("under the beams");
    return { planet: p.name, sign: s, house: p.house, essential, essentialScore, accidental, accidentalScore, debilities };
  });
  const receptions: Reception[] = []; const planets = dignities.map(d => input.placements.find(p => p.name === d.planet)!).filter(Boolean);
  for (const from of planets) for (const to of planets) if (from.name !== to.name) { const r = rulerAt(from.longitude, day); const by = r.domicile === to.name ? "domicile" : r.exaltation === to.name ? "exaltation" : r.triplicity === to.name ? "triplicity" : r.term === to.name ? "term" : r.face === to.name ? "face" : null; if (by) { const reverse = rulerAt(to.longitude, day); const mutual = reverse.domicile === from.name || reverse.exaltation === from.name || reverse.triplicity === from.name || reverse.term === from.name || reverse.face === from.name; receptions.push({ from: from.name, to: to.name, by, mutual, description: `${from.name} receives ${to.name} by ${by}${mutual ? "; the reception is mutual" : ""}.` }); } }
  const fixedStars: FixedStarTestimony[] = []; for (const p of [...planets, input.ascendant]) for (const [star, starLon] of FIXED_STARS) { const orb = distance(p.longitude, starLon); if (orb <= 1) fixedStars.push({ star, planet: p.name, orb: Number(orb.toFixed(2)), nature: STAR_NATURE[star] ?? "traditional fixed-star nature", meaning: STAR_MEANING[star] ?? "a fixed-star emphasis requiring contextual interpretation" }); }
  const considerations: string[] = []; const ascDeg = lon(input.ascendant.longitude) % 30; if (ascDeg < 3) considerations.push("Ascendant is in the first 3° of its sign; the matter may be newly forming."); if (ascDeg > 27) considerations.push("Ascendant is in the last 3° of its sign; the matter may be near a change of condition."); if (input.placements.find(p => p.name === "Moon")?.house === 7) considerations.push("Moon is in the 7th house; the astrologer/reader relationship deserves care."); if (input.placements.find(p => p.name === "Saturn")?.house === 7) considerations.push("Saturn is in the 7th house; traditional horary practice treats this as a caution, not an automatic refusal."); if (input.placements.find(p => p.name === "Moon")?.speed === 0) considerations.push("Moon speed is unavailable; void-of-course status was not asserted."); const radicality: Radicality = { status: considerations.length ? "caution" : "radical", considerations, explanation: considerations.length ? "These are traditional considerations before judgment. They qualify confidence; they do not automatically invalidate the chart." : "No configured traditional caution was triggered. This is not a claim that every traditional radicality doctrine has been exhausted." };
  const timing: TraditionalTiming[] = []; const key = new Set([input.querentRuler, input.subjectRuler, input.topicRuler, "Moon"]); const aspectTargets: Array<[number, string]> = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]]; for (const a of planets) for (const b of planets) if (a.name < b.name && key.has(a.name) && key.has(b.name)) { const sep = distance(a.longitude, b.longitude); const best = aspectTargets.map(([target, aspect]) => ({ target, aspect, orb: Math.abs(sep - target) })).sort((x, y) => x.orb - y.orb)[0]; const relativeSpeed = Math.abs((a.speed ?? 0) - (b.speed ?? 0)); if (best.orb <= 5 && relativeSpeed > 0 && (a.speed ?? 0) * (b.speed ?? 0) !== 0) { const degrees = Number(best.orb.toFixed(2)); const signMode = ["Aries", "Cancer", "Libra", "Capricorn"].includes(sign(a.longitude)) ? "cardinal" : ["Taurus", "Leo", "Scorpio", "Aquarius"].includes(sign(a.longitude)) ? "fixed" : "mutable"; timing.push({ from: a.name, to: b.name, aspect: best.aspect, degreesToPerfection: degrees, estimatedUnits: `${degrees} ${signMode === "cardinal" ? "short" : signMode === "fixed" ? "long" : "variable"} time units (traditional estimate; not a guaranteed event date)`, method: `Applying/separating perfection estimate using current orb, relative speed, sign modality (${signMode}), and house condition.` }); } }
  const overlays = [...planets, input.ascendant].map(p => { const o = overlay(p.longitude); return { body: p.name, display: display(p.longitude), ...o }; });
  return { lots, dignities, receptions, fixedStars, radicality, timing, overlays };
}
