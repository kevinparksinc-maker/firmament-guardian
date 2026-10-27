/**
 * Fixed-frame lunar mansion utilities for The Absolute.
 *
 * All inputs MUST be canonical Aldebaran-anchored longitude (Swiss mode 14).
 * This module never applies an ayanamsha or modifies the planetary longitude.
 *
 * Chinese mansions are traditionally referenced to determinative stars and
 * equatorial right ascension. Their historically accurate boundaries cannot
 * be recovered by dividing the ecliptic into 28 equal sectors. Accordingly,
 * Chinese ecliptic assignment requires an explicit, calibrated boundary table.
 */
export const CHINESE_MANSIONS = [
  "Jiao (Horn)", "Kang (Neck)", "Di (Root)", "Fang (Room)",
  "Xin (Heart)", "Wei (Tail)", "Ji (Winnowing Basket)",
  "Dou (Dipper)", "Niu (Ox)", "Nu (Girl)", "Xu (Emptiness)",
  "Wei (Rooftop)", "Shi (Encampment)", "Bi (Wall)",
  "Kui (Legs)", "Lou (Bond)", "Wei (Stomach)", "Mao (Hairy Head)",
  "Bi (Net)", "Zi (Turtle Beak)", "Shen (Three Stars)",
  "Jing (Well)", "Gui (Ghosts)", "Liu (Willow)",
  "Xing (Star)", "Zhang (Extended Net)", "Yi (Wings)", "Zhen (Chariot)",
] as const;

export const NAKSHATRA_RULERS = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter",
  "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon", "Mars",
  "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus",
  "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
] as const;

export type ChineseMansion = (typeof CHINESE_MANSIONS)[number];
export type ChineseBoundary = {
  /** Canonical Aldebaran-anchored zodiac longitude of mansion start. */
  start: number;
  /** Index into CHINESE_MANSIONS. */
  mansionIndex: number;
};
export type ChineseMansionResult = {
  mansion: ChineseMansion;
  mansionIndex: number;
  referenceFrame: "firmament-aldebaran-15-taurus";
  boundaryModel: "calibrated-ecliptic";
};

export function normalizeMansionLongitude(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Longitude must be finite");
  return ((value % 360) + 360) % 360;
}

/**
 * Validate a full set of 28 non-overlapping circular sectors.
 * Starts are sorted by zodiac longitude; mansion indices are unique.
 * A caller must supply a vetted table: no invented equal-sector fallback.
 */
export function validateChineseBoundaries(
  boundaries: readonly ChineseBoundary[],
): ChineseBoundary[] {
  if (boundaries.length !== 28) {
    throw new Error("Exactly 28 calibrated Chinese mansion boundaries are required");
  }
  const sorted = boundaries.map(({ start, mansionIndex }) => {
    if (!Number.isFinite(start) || start < 0 || start >= 360) {
      throw new RangeError("Boundary starts must be within [0, 360)");
    }
    if (!Number.isInteger(mansionIndex) || mansionIndex < 0 || mansionIndex >= 28) {
      throw new RangeError("Invalid Chinese mansion index");
    }
    return { start, mansionIndex };
  }).sort((a, b) => a.start - b.start);
  if (new Set(sorted.map(b => b.start)).size !== 28 ||
      new Set(sorted.map(b => b.mansionIndex)).size !== 28) {
    throw new Error("Chinese mansion boundaries and indices must be unique");
  }
  return sorted;
}

/**
 * Map a canonical longitude to a Chinese mansion using vetted boundaries.
 * No house, ASC, obliquity, or additional sidereal offset is applied.
 */
export function chineseMansionAtLongitude(
  canonicalLongitude: number,
  calibratedBoundaries: readonly ChineseBoundary[],
): ChineseMansionResult {
  const longitude = normalizeMansionLongitude(canonicalLongitude);
  const sorted = validateChineseBoundaries(calibratedBoundaries);
  let chosen = sorted[sorted.length - 1];
  for (const boundary of sorted) {
    if (longitude >= boundary.start) chosen = boundary;
    else break;
  }
  return {
    mansion: CHINESE_MANSIONS[chosen.mansionIndex],
    mansionIndex: chosen.mansionIndex,
    referenceFrame: "firmament-aldebaran-15-taurus",
    boundaryModel: "calibrated-ecliptic",
  };
}

/** Classical Vimshottari lord of the 27 equal nakshatra sectors. */
export function nakshatraRulerAtLongitude(canonicalLongitude: number): string {
  const longitude = normalizeMansionLongitude(canonicalLongitude);
  return NAKSHATRA_RULERS[Math.floor(longitude / (360 / 27)) % 27];
}
