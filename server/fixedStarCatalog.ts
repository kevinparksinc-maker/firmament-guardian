/** Catalog-backed fixed-star coordinates. No invented or manually locked degrees.
 *
 * Stage 1 only: the existing chart engine is not switched to this source until
 * the ancient coordinate origin and downstream consumers are migrated together.
 */
import sweph from "sweph";
import { normalizeLongitude } from "../shared/hybrid";

export const CATALOG_STAR_NAMES = [
  "Hamal", "Algol", "Aldebaran", "Rigel", "Polaris",
  "Sirius", "Regulus", "Spica", "Antares", "Fomalhaut",
] as const;

export type CatalogStarName = typeof CATALOG_STAR_NAMES[number];
export type CatalogStarPosition = {
  name: CatalogStarName;
  longitude: number;
  latitude: number;
  julianDayUt: number;
  coordinateFrame: "ecliptic-of-date";
  source: "Swiss Ephemeris fixed-star catalog";
};

const SEFLG_MOSEPH = 4;
const SEFLG_SPEED = 256;

/** Use the same UT Julian day convention as the existing astronomy engine. */
export function catalogFixedStarsAt(julianDayUt: number): CatalogStarPosition[] {
  if (!Number.isFinite(julianDayUt)) throw new RangeError("A finite UT Julian day is required.");
  const sw = sweph as any;
  const calculate = sw.fixstar2_ut ?? sw.fixstar_ut;
  if (typeof calculate !== "function") {
    throw new Error("This sweph installation has no fixed-star calculation function.");
  }
  return CATALOG_STAR_NAMES.map(name => {
    let result: any;
    try {
      result = calculate.call(sw, name, julianDayUt, SEFLG_MOSEPH | SEFLG_SPEED);
    } catch (error) {
      throw new Error(`Cannot resolve catalog star ${name}: ${String(error)}`);
    }
    const values = result?.data ?? result?.xx ?? result;
    if (!Array.isArray(values) || !Number.isFinite(Number(values[0])) ||
        !Number.isFinite(Number(values[1]))) {
      throw new Error(`Swiss Ephemeris returned no valid catalog coordinates for ${name}. Check sefstars.txt and star aliases.`);
    }
    return {
      name,
      longitude: normalizeLongitude(Number(values[0])),
      latitude: Number(values[1]),
      julianDayUt,
      coordinateFrame: "ecliptic-of-date" as const,
      source: "Swiss Ephemeris fixed-star catalog" as const,
    };
  });
}
