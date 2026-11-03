import sweph from "sweph";
import { approximateSunriseUtc } from "./historical-sunrise-provider";
import type { FixedVector } from "./sunriseAscendant";

export type SunriseAnchor = { sunriseUtc: string; sunriseSunXYZ: FixedVector };
export type ResolvedSunrise = { anchor: SunriseAnchor; source: "caller-supplied" | "astronomical-estimate" };

/** Single entry point for local sunrise and its Sun XYZ.
 * Built-in sunrise is an estimate, never a certified historical observation.
 * Sun XYZ is sampled at the computed sunrise instant, not at the chart instant.
 */
export function resolveMasterSunrise(
  supplied: SunriseAnchor | undefined,
  localNoonUtc: Date,
  latitude: number,
  longitude: number,
): ResolvedSunrise {
  if (supplied) return { anchor: supplied, source: "caller-supplied" };
  const sunrise = approximateSunriseUtc(localNoonUtc, latitude, longitude);
  const jd = Number((sweph as any).julday(
    sunrise.getUTCFullYear(), sunrise.getUTCMonth() + 1, sunrise.getUTCDate(),
    sunrise.getUTCHours() + sunrise.getUTCMinutes() / 60 + sunrise.getUTCSeconds() / 3600, 1,
  ));
  const flags = 4 | 256 | 2048 | 4096; // Moshier, speed, equatorial, Cartesian XYZ
  const response: any = (sweph as any).calc_ut(jd, 0, flags);
  const data = response?.data ?? response;
  if (!data || ![data[0], data[1], data[2]].every((v: unknown) => typeof v === "number" && Number.isFinite(v))) {
    throw new Error("Sun equatorial XYZ unavailable at calculated sunrise");
  }
  return {
    anchor: { sunriseUtc: sunrise.toISOString(), sunriseSunXYZ: { x: data[0], y: data[1], z: data[2] } },
    source: "astronomical-estimate",
  };
}
