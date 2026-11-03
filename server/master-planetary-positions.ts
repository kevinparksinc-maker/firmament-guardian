import sweph from "sweph";
import { xyzToEquatorial } from "../shared/xyzWheel";

/** Independent planetary positions. Requires only a UTC instant.
 * No sunrise, ASC, latitude, longitude, house, zodiac, or interpretation dependency.
 */
export const MASTER_PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"] as const;
export type MasterPlanet = typeof MASTER_PLANETS[number];
export type PlanetPosition = {
  name: MasterPlanet;
  xyz: { x:number; y:number; z:number };
  ra: number;
  dec: number;
  distance: number;
  frame: "geocentric-equatorial-of-date";
};
export function masterJulianDay(utc: Date): number {
  if (!Number.isFinite(utc.getTime())) throw new Error("Invalid UTC instant");
  return Number((sweph as any).julday(
    utc.getUTCFullYear(), utc.getUTCMonth()+1, utc.getUTCDate(),
    utc.getUTCHours()+utc.getUTCMinutes()/60+utc.getUTCSeconds()/3600+utc.getUTCMilliseconds()/3600000, 1,
  ));
}
export function calculatePlanetPositions(utc: Date): PlanetPosition[] {
  const jd = masterJulianDay(utc);
  const flags = 4 | 256 | 2048 | 4096; // Moshier, speed, equatorial, Cartesian
  return MASTER_PLANETS.map((name, planet) => {
    const response: any = (sweph as any).calc_ut(jd, planet, flags);
    const data = response?.data ?? response;
    if (!data || ![data[0],data[1],data[2]].every((v:unknown)=>typeof v==="number" && Number.isFinite(v))) {
      throw new Error(`Missing geocentric equatorial XYZ for ${name}`);
    }
    const xyz = {x:data[0] as number,y:data[1] as number,z:data[2] as number};
    const {ra,dec,distance} = xyzToEquatorial(xyz);
    return {name,xyz,ra,dec,distance,frame:"geocentric-equatorial-of-date" as const};
  });
}
