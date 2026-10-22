import { normalizeLongitude } from "../../../shared/hybrid";

/** Supplementary 30-star observational comparison archive.
 * Values are approximate J2000 tropical ecliptic longitudes from the
 * epoch-2000 historical-position TABLE, not discovery-era coordinates.
 * Source: https://www.yourastrallife.com/en/fixed-star-positions
 * Do not conflate these with Firmament's original locked symbolic anchors.
 * For production-grade historical epoch projection, replace linear precession
 * approximation with Swiss Ephemeris fixstar_ut and catalog proper motion.
 */
export const OBSERVATIONAL_FIXED_STARS_J2000 = [
  { name: "Hamal", j2000Longitude: 0 * 30 + 7 + 40 / 60 },
  { name: "Algol", j2000Longitude: 1 * 30 + 26 + 10 / 60 },
  { name: "Aldebaran", j2000Longitude: 2 * 30 + 9 + 47 / 60 },
  { name: "Rigel", j2000Longitude: 2 * 30 + 16 + 50 / 60 },
  { name: "Polaris", j2000Longitude: 2 * 30 + 28 + 34 / 60 },
  { name: "Sirius", j2000Longitude: 3 * 30 + 14 + 5 / 60 },
  { name: "Regulus", j2000Longitude: 4 * 30 + 29 + 50 / 60 },
  { name: "Spica", j2000Longitude: 6 * 30 + 23 + 50 / 60 },
  { name: "Antares", j2000Longitude: 8 * 30 + 9 + 46 / 60 },
  { name: "Fomalhaut", j2000Longitude: 11 * 30 + 3 + 51 / 60 },
  { name: "Alcyone", j2000Longitude: 1 * 30 + 29 + 59 / 60 },
  { name: "Bellatrix", j2000Longitude: 2 * 30 + 20 + 57 / 60 },
  { name: "Betelgeuse", j2000Longitude: 2 * 30 + 28 + 45 / 60 },
  { name: "Castor", j2000Longitude: 3 * 30 + 20 + 14 / 60 },
  { name: "Pollux", j2000Longitude: 3 * 30 + 23 + 13 / 60 },
  { name: "Procyon", j2000Longitude: 3 * 30 + 25 + 47 / 60 },
  { name: "Arcturus", j2000Longitude: 6 * 30 + 24 + 14 / 60 },
  { name: "Vega", j2000Longitude: 9 * 30 + 15 + 19 / 60 },
  { name: "Altair", j2000Longitude: 10 * 30 + 1 + 46 / 60 },
  { name: "Achernar", j2000Longitude: 11 * 30 + 15 + 18 / 60 },
  { name: "Capella", j2000Longitude: 2 * 30 + 21 + 51 / 60 },
  { name: "Canopus", j2000Longitude: 3 * 30 + 14 + 57 / 60 },
  { name: "Denebola", j2000Longitude: 5 * 30 + 21 + 37 / 60 },
  { name: "Vindemiatrix", j2000Longitude: 6 * 30 + 9 + 56 / 60 },
  { name: "Alphecca", j2000Longitude: 7 * 30 + 12 + 18 / 60 },
  { name: "Zubenelgenubi", j2000Longitude: 7 * 30 + 15 + 5 / 60 },
  { name: "Deneb Algedi", j2000Longitude: 10 * 30 + 23 + 32 / 60 },
  { name: "Rasalhague", j2000Longitude: 8 * 30 + 22 + 27 / 60 },
  { name: "Deneb", j2000Longitude: 11 * 30 + 5 + 20 / 60 },
  { name: "Scheat", j2000Longitude: 11 * 30 + 29 + 22 / 60 },
] as const;
export function approximateStarLongitude(name:string,year:number):number|null {
 const star=OBSERVATIONAL_FIXED_STARS_J2000.find(s=>s.name===name);
 if(!star||!Number.isFinite(year))return null;
 return normalizeLongitude(star.j2000Longitude+(year-2000)*50.29/3600);
}
