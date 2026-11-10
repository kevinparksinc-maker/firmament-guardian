import { nakshatraRulerAtLongitude } from "./lunar-mansion-framework";

export const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

// Frozen symbolic anchors used by the hybrid zodiac. These are intentionally
// precession-locked rather than live ephemeris positions.
export const FIXED_STARS = [
  ["Hamal", 12.9333], ["Algol", 31.4333], ["Aldebaran", 45], ["Rigel", 52.1], ["Polaris", 63.8333],
  ["Sirius", 79.35], ["Regulus", 135], ["Spica", 179.1], ["Antares", 225.0167], ["Fomalhaut", 315],
] as const;

export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"] as const;
export const MANAZIL = ["Al-Sharatain", "Al-Butain", "Al-Thurayya", "Al-Dabaran", "Al-Haq’ah", "Al-Han’ah", "Al-Dhira’", "Al-Nathrah", "Al-Tarf", "Al-Jabhah", "Al-Zubrah", "Al-Sarfah", "Al-Awwa’", "Al-Simak", "Al-Ghafr", "Al-Zubana", "Al-Iklil", "Al-Qalb", "Al-Shaula", "Al-Na’am", "Al-Baldah", "Sa’d al-Dhabih", "Sa’d Bula’", "Sa’d al-Su’ud", "Sa’d al-Akhbiya", "Al-Fargh al-Muqaddam", "Al-Fargh al-Mu’akhkhar", "Al-Risha/Batn al-Hut"] as const;
/** Elemental-family (triplicity) decans: each sign's three ten-degree sectors
 * follow the three zodiac signs of its element, beginning with the host sign.
 * This is NOT the Chaldean planetary-face sequence.
 */
export const ELEMENTAL_DECAN_SIGNS = [
  ["Aries", "Leo", "Sagittarius"],
  ["Taurus", "Virgo", "Capricorn"],
  ["Gemini", "Libra", "Aquarius"],
  ["Cancer", "Scorpio", "Pisces"],
  ["Leo", "Sagittarius", "Aries"],
  ["Virgo", "Capricorn", "Taurus"],
  ["Libra", "Aquarius", "Gemini"],
  ["Scorpio", "Pisces", "Cancer"],
  ["Sagittarius", "Aries", "Leo"],
  ["Capricorn", "Taurus", "Virgo"],
  ["Aquarius", "Gemini", "Libra"],
  ["Pisces", "Cancer", "Scorpio"],
] as const;
export const DECANS = ELEMENTAL_DECAN_SIGNS.flatMap((family, signIndex) =>
  family.map((familySign, decanIndex) =>
    `${familySign} (${ZODIAC_SIGNS[signIndex]} ${["1st","2nd","3rd"][decanIndex]} elemental decan)`
  )
);


export type Overlay = { nakshatra: string; pada: number; manzil: string; decan: string; nakshatraRuler?: string };
export function overlay(longitude: number): Overlay {
  const L = normalizeLongitude(longitude);
  const nakSize = 360 / 27;
  const padaSize = nakSize / 4;
  return { nakshatra: NAKSHATRAS[Math.floor(L / nakSize) % 27], nakshatraRuler: nakshatraRulerAtLongitude(L), pada: Math.floor((L % nakSize) / padaSize) + 1, manzil: MANAZIL[Math.floor(L / (360 / 28)) % 28], decan: DECANS[Math.floor(L / 10) % 36] };
}
export function formatLongitude(longitude: number) { const L = normalizeLongitude(longitude); const sign = ZODIAC_SIGNS[Math.floor(L / 30)]; const deg = L % 30; const d = Math.floor(deg); const m = Math.round((deg - d) * 60); return `${sign} ${String(d).padStart(2, "0")}°${String(m % 60).padStart(2, "0")}′`; }
export function normalizeLongitude(value: number) { const wrapped = value % 360; return wrapped < 0 ? wrapped + 360 : wrapped; }

export type Varga = "D2" | "D3" | "D9" | "D10";

export function vargaPlacement(longitude: number, division: Varga) {
  const lon = normalizeLongitude(longitude), sign = Math.floor(lon / 30), degree = lon % 30;
  const n = Number(division.slice(1)), part = Math.min(n - 1, Math.floor(degree / (30 / n)));
  let result: number;
  if (division === "D2") {
    const sunHora = (sign % 2 === 0) === (part === 0);
    result = sunHora ? 4 : 3;
  } else if (division === "D3") {
    result = (sign + 4 * part) % 12;
  } else if (division === "D9") {
    const start = sign % 3 === 0 ? sign : sign % 3 === 1 ? (sign + 8) % 12 : (sign + 4) % 12;
    result = (start + part) % 12;
  } else {
    result = ((sign % 2 === 0 ? sign : (sign + 8) % 12) + part) % 12;
  }
  return {
    division,
    part: part + 1,
    sourceSign: ZODIAC_SIGNS[sign],
    sign: ZODIAC_SIGNS[result],
    signIndex: result,
    degreeInPart: degree - part * (30 / n),
    coordinateFrame: "guardian-fixed-zero-reference" as const,
  };
}

export function grahaDrishtiTargetHouses(planet: string, fromHouse: number): number[] {
  const aspectCounts: Record<string, readonly number[]> = {
    Mars: [4, 7, 8],
    Jupiter: [5, 7, 9],
    Saturn: [3, 7, 10],
  };
  const counts = aspectCounts[planet];
  if (!counts) return [];
  if (!Number.isInteger(fromHouse) || fromHouse < 1 || fromHouse > 12)
    throw new RangeError("Graha drishti requires a valid occupied house 1–12");
  return counts.map((count) => ((fromHouse + count - 2) % 12) + 1);
}

