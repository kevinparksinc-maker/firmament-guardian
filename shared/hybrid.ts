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
  return { nakshatra: NAKSHATRAS[Math.floor(L / nakSize) % 27], pada: Math.floor((L % nakSize) / padaSize) + 1, manzil: MANAZIL[Math.floor(L / (360 / 28)) % 28], decan: DECANS[Math.floor(L / 10) % 36] };
}
export function formatLongitude(longitude: number) { const L = normalizeLongitude(longitude); const sign = ZODIAC_SIGNS[Math.floor(L / 30)]; const deg = L % 30; const d = Math.floor(deg); const m = Math.round((deg - d) * 60); return `${sign} ${String(d).padStart(2, "0")}°${String(m % 60).padStart(2, "0")}′`; }
export function normalizeLongitude(value: number) { const wrapped = value % 360; return wrapped < 0 ? wrapped + 360 : wrapped; }
