export type TerritorialSide = "A" | "B" | "neutral";

export type TerritorialPlanet = {
  planet: string;
  tropicalLongitude: number;
  house: number;
  sign: string;
  degreeInHouse: number;
  degreeInSign?: number;
  altitude: number;
  isRetrograde: boolean;
  nakshatra: string;
};

export type TerritorialHouseLordEvidence = {
  house: number;
  side: "A" | "B";
  lord: string;
  placementHouse: number;
  placementSign: string;
  base: number;
  nakshatra: { name: string; score: number };
  dignity: { status: string; score: number };
  planetaryWar: number;
  total: number;
};

export type DecanEvidence = {
  planet: string;
  sign: string;
  degreeInSign: number;
  decan: 1 | 2 | 3;
  ruler: string;
  rulerHouse: number;
  targetSide: TerritorialSide;
  allegiance: "supports" | "opposes" | "neutral";
  faceDignity: number;
  score: number;
};

export type TerritorialEvidence = {
  layers: Array<{ name: string; scoreA: number; scoreB: number; detail: string }>;
  houseLords: TerritorialHouseLordEvidence[];
  planetaryWars: Array<{ winner: string; loser: string; degreeDifference: number }>;
  arabicLots: Array<{ name: string; longitude: number; sign: string; house: number; side: TerritorialSide; score: number }>;
  ninePlanetInfluence: Array<{ planet: string; house: number; side: TerritorialSide; score: number }>;
  decans: DecanEvidence[];
};

export type RestoredTerritorialResult = {
  scoreA: number;
  scoreB: number;
  evidence: TerritorialEvidence;
};

const ASCENDANT_HOUSES = new Set([1, 2, 3, 6, 10, 11]);
const DESCENDANT_HOUSES = new Set([7, 8, 9, 12, 4, 5]);
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const HOUSE_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const SIGN_RULERS: Record<string, string> = { Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter" };
const EXALTATIONS: Record<string, string> = { Sun: "Aries", Moon: "Taurus", Mercury: "Virgo", Venus: "Pisces", Mars: "Capricorn", Jupiter: "Cancer", Saturn: "Libra" };
const DEBILITATIONS: Record<string, string> = { Sun: "Libra", Moon: "Scorpio", Mercury: "Pisces", Venus: "Virgo", Mars: "Cancer", Jupiter: "Capricorn", Saturn: "Aries" };
const WAR_PRIORITY: Record<string, number> = { Saturn: 5, Jupiter: 4, Rahu: 3.5, Ketu: 3.5, Mars: 3, Sun: 2, Venus: 2, Mercury: 2, Moon: 1.5 };
const CHALDEAN_DECANS: Record<string, [string, string, string]> = {
  Aries: ["Mars", "Sun", "Venus"], Taurus: ["Mercury", "Moon", "Saturn"], Gemini: ["Jupiter", "Mars", "Sun"], Cancer: ["Venus", "Mercury", "Moon"],
  Leo: ["Saturn", "Jupiter", "Mars"], Virgo: ["Sun", "Venus", "Mercury"], Libra: ["Moon", "Saturn", "Jupiter"], Scorpio: ["Mars", "Sun", "Venus"],
  Sagittarius: ["Mercury", "Moon", "Saturn"], Capricorn: ["Jupiter", "Mars", "Sun"], Aquarius: ["Venus", "Mercury", "Moon"], Pisces: ["Saturn", "Jupiter", "Mars"],
};

type Trait = "L" | "M" | "H" | "E";
type StellarProfile = [gana: "Deva" | "Manushya" | "Rakshasa", yoni: string, traits: [Trait, Trait, Trait, Trait]];

/** Compact transcription of the original 27 Nakshatra sports profiles. */
const STELLAR_PROFILES: Record<string, StellarProfile> = {
  Ashwini: ["Deva", "Horse", ["E", "H", "M", "M"]], Bharani: ["Manushya", "Elephant", ["H", "M", "M", "H"]], Krittika: ["Rakshasa", "Sheep", ["E", "M", "M", "M"]],
  Rohini: ["Manushya", "Serpent", ["L", "H", "H", "H"]], Mrigashira: ["Deva", "Serpent", ["H", "M", "M", "M"]], Ardra: ["Manushya", "Dog", ["H", "L", "L", "L"]],
  Punarvasu: ["Deva", "Cat", ["M", "H", "M", "M"]], Pushya: ["Deva", "Goat", ["L", "E", "H", "H"]], Ashlesha: ["Rakshasa", "Cat", ["M", "M", "L", "M"]],
  Magha: ["Rakshasa", "Rat", ["M", "H", "H", "H"]], "Purva Phalguni": ["Manushya", "Rat", ["M", "L", "L", "L"]], "Uttara Phalguni": ["Manushya", "Cow", ["L", "H", "H", "H"]],
  Hasta: ["Deva", "Buffalo", ["H", "H", "H", "M"]], Chitra: ["Rakshasa", "Tiger", ["H", "M", "L", "M"]], Swati: ["Deva", "Buffalo", ["M", "M", "M", "M"]],
  Vishakha: ["Rakshasa", "Tiger", ["H", "M", "M", "H"]], Anuradha: ["Deva", "Deer", ["L", "H", "E", "H"]], Jyeshtha: ["Rakshasa", "Deer", ["M", "E", "H", "H"]],
  Mula: ["Rakshasa", "Dog", ["H", "L", "L", "L"]], "Purva Ashadha": ["Manushya", "Monkey", ["E", "H", "M", "M"]], "Uttara Ashadha": ["Manushya", "Mongoose", ["L", "E", "H", "E"]],
  Shravana: ["Deva", "Monkey", ["M", "H", "H", "M"]], Dhanishta: ["Rakshasa", "Lion", ["H", "M", "M", "H"]], Shatabhisha: ["Rakshasa", "Horse", ["M", "M", "L", "M"]],
  "Purva Bhadrapada": ["Rakshasa", "Lion", ["H", "L", "L", "M"]], "Uttara Bhadrapada": ["Manushya", "Cow", ["L", "H", "H", "H"]], Revati: ["Deva", "Elephant", ["L", "M", "M", "M"]],
};

function normalize(value: number) { return ((value % 360) + 360) % 360; }
function signedDifference(a: number, b: number) { return ((a - b + 540) % 360) - 180; }
function round(value: number) { return Number(value.toFixed(2)); }
function sideForHouse(house: number): TerritorialSide { return ASCENDANT_HOUSES.has(house) ? "A" : DESCENDANT_HOUSES.has(house) ? "B" : "neutral"; }
function signForLongitude(longitude: number) { return SIGNS[Math.floor(normalize(longitude) / 30)]!; }

/**
 * God View has no real ascendant — houses are the fixed natural-zodiac sequence
 * (house 1 = Aries, house 2 = Taurus, ...), so `HOUSE_LORDS[house - 1]` is correct as-is.
 * Agent Mode has a real ascendant, so house N is whatever sign falls N signs forward
 * (whole-sign) from the ascendant's own sign, and that sign's ruler is the house lord.
 */
function lordForHouse(house: number, mode: "god" | "agent", ascendantLongitude: number): string {
  if (mode === "god") return HOUSE_LORDS[house - 1]!;
  const ascendantSignIndex = Math.floor(normalize(ascendantLongitude) / 30);
  const houseSign = SIGNS[(ascendantSignIndex + house - 1) % 12]!;
  return SIGN_RULERS[houseSign]!;
}

/** Traditional Chaldean faces: 0°–<10°, 10°–<20°, and 20°–<30° in each of the 12 signs. */
export function getChaldeanDecan(sign: string, degreeInSign: number) {
  const decanIndex = Math.min(2, Math.max(0, Math.floor(degreeInSign / 10)));
  const rulers = CHALDEAN_DECANS[sign];
  if (!rulers) throw new Error(`Unknown decan mapping for sign: ${sign}`);
  return { decan: (decanIndex + 1) as 1 | 2 | 3, ruler: rulers[decanIndex]! };
}

function dignity(planet: string, sign: string) {
  if (EXALTATIONS[planet] === sign) return { status: "Exalted", score: 2 };
  if (DEBILITATIONS[planet] === sign) return { status: "Debilitated", score: -2 };
  if (SIGN_RULERS[sign] === planet) return { status: "Own Sign", score: 1 };
  return { status: "Neutral", score: 0 };
}

function nakshatraInfluence(name: string, dignityScore: number) {
  const profile = STELLAR_PROFILES[name];
  if (!profile) throw new Error(`Unknown nakshatra: ${name}`);
  const traitWeight: Record<Trait, number> = { E: 1.35, H: 1.18, M: 1, L: 0.82 };
  const base = profile[2].reduce((sum, trait) => sum + traitWeight[trait], 0) / 4;
  const ganaBonus = profile[0] === "Rakshasa" ? 0.25 : profile[0] === "Deva" ? 0.15 : 0.10;
  const yoniMultiplier = ["Lion", "Tiger", "Horse", "Elephant"].includes(profile[1]) ? 1.15 : 1;
  return round((((base + ganaBonus) * yoniMultiplier * (1 + dignityScore * 0.05)) - 1) * 5);
}

function detectWars(planets: TerritorialPlanet[]) {
  const wars: Array<{ winner: string; loser: string; degreeDifference: number }> = [];
  for (let index = 0; index < planets.length; index += 1) {
    for (let compared = index + 1; compared < planets.length; compared += 1) {
      const first = planets[index]!;
      const second = planets[compared]!;
      const degreeDifference = Math.abs(signedDifference(first.tropicalLongitude, second.tropicalLongitude));
      if (degreeDifference <= 3) {
        const firstPriority = WAR_PRIORITY[first.planet] ?? 1;
        const secondPriority = WAR_PRIORITY[second.planet] ?? 1;
        wars.push(firstPriority > secondPriority ? { winner: first.planet, loser: second.planet, degreeDifference: round(degreeDifference) } : { winner: second.planet, loser: first.planet, degreeDifference: round(degreeDifference) });
      }
    }
  }
  return wars;
}

function canonicalLots(planets: Map<string, TerritorialPlanet>, ascendant: number, night: boolean) {
  const longitude = (planet: string) => planets.get(planet)?.tropicalLongitude ?? 0;
  const sun = longitude("Sun"), moon = longitude("Moon"), mars = longitude("Mars"), venus = longitude("Venus"), jupiter = longitude("Jupiter"), saturn = longitude("Saturn");
  // Each lot is ascendant + addend - subtrahend by day; at night the two terms swap,
  // the same day/night reversal already applied to Fortune and Spirit.
  const lot = (addend: number, subtrahend: number) => (night ? ascendant + subtrahend - addend : ascendant + addend - subtrahend);
  return [
    ["Lot of Fortune", lot(moon, sun)],
    ["Lot of Spirit", lot(sun, moon)],
    ["Lot of Victory", lot(mars, saturn)], ["Lot of Success", lot(jupiter, saturn)],
    ["Lot of Courage", lot(mars, sun)], ["Lot of Triumph", lot(venus, saturn)],
    ["Lot of Glory", lot(sun, saturn)], ["Lot of Nemesis", lot(saturn, sun)],
  ] as const;
}

/**
 * Exact additive restoration of the audited Territorial layers. Arabic Lots are
 * calculated once per side, not once per house lord, so their influence is never
 * accidentally multiplied fivefold.
 */
export function calculateRestoredTerritorial(
  planets: TerritorialPlanet[],
  ascendantLongitude: number,
  lotHouseFromLongitude: (longitude: number) => number,
  mode: "god" | "agent" = "god",
): RestoredTerritorialResult {
  const planetsByName = new Map(planets.map((planet) => [planet.planet, planet]));
  const wars = detectWars(planets);
  const warEffects = new Map<string, number>();
  wars.forEach((war) => { warEffects.set(war.winner, (warEffects.get(war.winner) ?? 0) + 1); warEffects.set(war.loser, (warEffects.get(war.loser) ?? 0) - 1); });
  const houseLords: TerritorialHouseLordEvidence[] = [];
  const components = { baseA: 0, baseB: 0, nakA: 0, nakB: 0, dignA: 0, dignB: 0, warA: 0, warB: 0 };

  for (let house = 1; house <= 12; house += 1) {
    const lord = lordForHouse(house, mode, ascendantLongitude);
    const side = sideForHouse(house);
    const placement = planetsByName.get(lord);
    if (side === "neutral" || !placement) continue;
    const placementSide = sideForHouse(placement.house);
    let base = 0;
    if (placementSide === side) { base += 1; if (placement.house === house) base += 1; }
    else if (placementSide !== "neutral") { base -= 1; if ([1, 4, 7, 10].includes(placement.house)) base -= 1; }
    const dignityResult = dignity(lord, placement.sign);
    const nakshatraScore = nakshatraInfluence(placement.nakshatra, dignityResult.score);
    const planetaryWar = warEffects.get(lord) ?? 0;
    const evidence = { house, side, lord, placementHouse: placement.house, placementSign: placement.sign, base, nakshatra: { name: placement.nakshatra, score: nakshatraScore }, dignity: dignityResult, planetaryWar, total: round(base + nakshatraScore + dignityResult.score + planetaryWar) };
    houseLords.push(evidence);
    if (side === "A") { components.baseA += base; components.nakA += nakshatraScore; components.dignA += dignityResult.score; components.warA += planetaryWar; }
    else { components.baseB += base; components.nakB += nakshatraScore; components.dignB += dignityResult.score; components.warB += planetaryWar; }
  }

  const night = (planetsByName.get("Sun")?.altitude ?? 0) < 0;
  const arabicLots = canonicalLots(planetsByName, ascendantLongitude, night).map(([name, rawLongitude]) => {
    const longitude = normalize(rawLongitude);
    const house = lotHouseFromLongitude(longitude);
    const side = sideForHouse(house);
    const magnitude = [1, 4, 7, 10].includes(house) ? 2 : 1;
    const score = side === "neutral" ? 0 : name === "Lot of Nemesis" ? -magnitude : magnitude;
    return { name, longitude: round(longitude), sign: signForLongitude(longitude), house, side, score };
  });
  const lotA = arabicLots.filter((lot) => lot.side === "A").reduce((sum, lot) => sum + lot.score, 0);
  const lotB = arabicLots.filter((lot) => lot.side === "B").reduce((sum, lot) => sum + lot.score, 0);
  const ninePlanetInfluence = planets.map((planet) => {
    const side = sideForHouse(planet.house);
    return { planet: planet.planet, house: planet.house, side, score: side === "neutral" ? 0 : (planet.planet === "Sun" || planet.planet === "Moon" ? 1.4 : 1) };
  });
  const influenceA = ninePlanetInfluence.filter((planet) => planet.side === "A").reduce((sum, planet) => sum + planet.score, 0);
  const influenceB = ninePlanetInfluence.filter((planet) => planet.side === "B").reduce((sum, planet) => sum + planet.score, 0);
  const decans = planets.map((planet) => {
    const targetSide = sideForHouse(planet.house);
    const degreeInSign = planet.degreeInSign ?? planet.degreeInHouse;
    const decan = getChaldeanDecan(planet.sign, degreeInSign);
    const rulerPlacement = planetsByName.get(decan.ruler);
    const rulerHouse = rulerPlacement?.house ?? 2;
    const rulerSide = sideForHouse(rulerHouse);
    const allegiance: DecanEvidence["allegiance"] = targetSide === "neutral" || rulerSide === "neutral" ? "neutral" : targetSide === rulerSide ? "supports" : "opposes";
    const faceDignity = planet.planet === decan.ruler ? 1 : 0;
    const rulerInfluence = allegiance === "supports" ? 0.5 : allegiance === "opposes" ? -0.5 : 0;
    const score = targetSide === "neutral" ? 0 : round(faceDignity + rulerInfluence);
    return { planet: planet.planet, sign: planet.sign, degreeInSign: round(degreeInSign), decan: decan.decan, ruler: decan.ruler, rulerHouse, targetSide, allegiance, faceDignity, score };
  });
  const decanA = decans.filter((entry) => entry.targetSide === "A").reduce((sum, entry) => sum + entry.score, 0);
  const decanB = decans.filter((entry) => entry.targetSide === "B").reduce((sum, entry) => sum + entry.score, 0);
  const scoreA = components.baseA + components.nakA + components.dignA + components.warA + lotA + influenceA + decanA;
  const scoreB = components.baseB + components.nakB + components.dignB + components.warB + lotB + influenceB + decanB;
  const layers = [
    { name: "Cluster territory & house-lord placement", scoreA: round(components.baseA), scoreB: round(components.baseB), detail: "Own-cluster support and opponent-cluster displacement, including angular displacement penalties." },
    { name: "Nakshatra influence", scoreA: round(components.nakA), scoreB: round(components.nakB), detail: "27-profile stellar influence using traits, Gana, Yoni, and dignity-linked lord synergy." },
    { name: "Essential dignity", scoreA: round(components.dignA), scoreB: round(components.dignB), detail: "Exaltation +2, own sign +1, neutral 0, debilitation −2." },
    { name: "Chaldean Decans", scoreA: round(decanA), scoreB: round(decanB), detail: "0°/10°/20° faces across all 12 signs: +1 own-face dignity and ±0.5 from the decan ruler’s cluster allegiance." },
    { name: "Planetary war", scoreA: round(components.warA), scoreB: round(components.warB), detail: "Conjunctions within 3° award +1 to the priority winner and −1 to the loser." },
    { name: "Arabic Lots", scoreA: round(lotA), scoreB: round(lotB), detail: "Fortune, Spirit, Victory, Success, Courage, Triumph, Glory, and Nemesis, applied once per side." },
    { name: "Nine-planet influence", scoreA: round(influenceA), scoreB: round(influenceB), detail: "All nine planetary placements across the fixed cluster territories; Sun and Moon carry the established 1.4 signal." },
  ];
  return { scoreA: round(scoreA), scoreB: round(scoreB), evidence: { layers, houseLords, planetaryWars: wars, arabicLots, ninePlanetInfluence, decans } };
}
