export const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

// Frozen symbolic anchors used by the hybrid zodiac. These are intentionally
// precession-locked rather than live ephemeris positions.
export const FIXED_STARS = [
  ["Hamal", 12.9333], ["Algol", 31.4333], ["Aldebaran", 45], ["Rigel", 52.1], ["Polaris", 63.8333],
  ["Sirius", 79.35], ["Regulus", 135], ["Spica", 179.1], ["Antares", 225.0167], ["Fomalhaut", 315],
] as const;

export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"] as const;
export const MANAZIL = ["Al-Sharatain", "Al-Butain", "Al-Thurayya", "Al-Dabaran", "Al-Haq’ah", "Al-Han’ah", "Al-Dhira’", "Al-Nathrah", "Al-Tarf", "Al-Jabhah", "Al-Zubrah", "Al-Sarfah", "Al-Awwa’", "Al-Simak", "Al-Ghafr", "Al-Zubana", "Al-Iklil", "Al-Qalb", "Al-Shaula", "Al-Na’am", "Al-Baldah", "Sa’d al-Dhabih", "Sa’d Bula’", "Sa’d al-Su’ud", "Sa’d al-Akhbiya", "Al-Fargh al-Muqaddam", "Al-Fargh al-Mu’akhkhar", "Al-Risha/Batn al-Hut"] as const;
export const DECANS = ["Mars (Aries 1st)", "Sun (Aries 2nd)", "Venus (Aries 3rd)", "Mercury (Taurus 1st)", "Moon (Taurus 2nd)", "Saturn (Taurus 3rd)", "Jupiter (Gemini 1st)", "Mars (Gemini 2nd)", "Sun (Gemini 3rd)", "Venus (Cancer 1st)", "Mercury (Cancer 2nd)", "Moon (Cancer 3rd)", "Saturn (Leo 1st)", "Jupiter (Leo 2nd)", "Mars (Leo 3rd)", "Sun (Virgo 1st)", "Venus (Virgo 2nd)", "Mercury (Virgo 3rd)", "Moon (Libra 1st)", "Saturn (Libra 2nd)", "Jupiter (Libra 3rd)", "Mars (Scorpio 1st)", "Sun (Scorpio 2nd)", "Venus (Scorpio 3rd)", "Mercury (Sagittarius 1st)", "Moon (Sagittarius 2nd)", "Saturn (Sagittarius 3rd)", "Jupiter (Capricorn 1st)", "Mars (Capricorn 2nd)", "Sun (Capricorn 3rd)", "Venus (Aquarius 1st)", "Mercury (Aquarius 2nd)", "Moon (Aquarius 3rd)", "Saturn (Pisces 1st)", "Jupiter (Pisces 2nd)", "Mars (Pisces 3rd)"] as const;

export type Overlay = { nakshatra: string; pada: number; manzil: string; decan: string };
export function overlay(longitude: number): Overlay {
  const L = ((longitude % 360) + 360) % 360;
  const nakSize = 360 / 27;
  const padaSize = nakSize / 4;
  return { nakshatra: NAKSHATRAS[Math.floor(L / nakSize) % 27], pada: Math.floor((L % nakSize) / padaSize) + 1, manzil: MANAZIL[Math.floor(L / (360 / 28)) % 28], decan: DECANS[Math.floor(L / 10) % 36] };
}
export function formatLongitude(longitude: number) { const L = ((longitude % 360) + 360) % 360; const sign = ZODIAC_SIGNS[Math.floor(L / 30)]; const deg = L % 30; const d = Math.floor(deg); const m = Math.round((deg - d) * 60); return `${sign} ${String(d).padStart(2, "0")}°${String(m % 60).padStart(2, "0")}′`; }
export function normalizeLongitude(value: number) { return ((value % 360) + 360) % 360; }
