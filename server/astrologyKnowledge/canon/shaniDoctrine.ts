import type { ChartResult } from "../../astronomy";
import type { VedicAyanamsaMode } from "./types";
import { toVedicLongitude } from "./vedicJyotishCanon";

/** Rules are traditional Jyotish doctrine, not verified causes or predicted events. */
export const SHANI_DOCTRINE_SOURCE = "Parashari house-lordship tradition; Phaladeepika transit doctrine (Gochara); school-specific interpretations vary";
export type ShaniDoctrineResult = { coordinateMode: VedicAyanamsaMode; lagnaSign: string | null; yogakaraka: boolean | null; lordship: number[]; sadeSati: "rising" | "middle" | "setting" | "inactive" | "unavailable"; dhaiya: "fourth-from-moon" | "eighth-from-moon" | "inactive" | "unavailable"; explanation: string };
const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
const signOf = (longitude:number)=>Math.floor((((longitude%360)+360)%360)/30);
const relativeHouse = (from:number,to:number)=>((to-from+12)%12)+1;

export function evaluateShaniDoctrine(chart:ChartResult, mode:VedicAyanamsaMode):ShaniDoctrineResult {
  const convert=(longitude:number)=>toVedicLongitude(longitude,chart.utc,mode);
  const lagna=chart.ascendant && chart.agentViewAvailable ? signOf(convert(chart.ascendant.longitude)) : null;
  const saturnLords=lagna==null?[]:[9,10].map(sign=>relativeHouse(lagna,sign)); // Capricorn (10th sign), Aquarius (11th sign) indices
  // Correction: zero-based zodiac indices for Capricorn and Aquarius are 9 and 10.
  const yogakaraka=lagna==null?null:(lagna===1||lagna===6); // Taurus: 9th and 10th; Libra: 4th and 5th
  const natalMoon=chart.movingBodies.find(p=>p.name==="Moon");
  const transitSaturn=chart.transits.find(p=>p.name==="Saturn");
  const usableTransit=chart.readingScope!=="natal" && Boolean(natalMoon&&transitSaturn);
  const house=usableTransit?relativeHouse(signOf(convert(natalMoon!.longitude)),signOf(convert(transitSaturn!.longitude))):null;
  const sadeSati=house==null?"unavailable":house===12?"rising":house===1?"middle":house===2?"setting":"inactive";
  const dhaiya=house==null?"unavailable":house===4?"fourth-from-moon":house===8?"eighth-from-moon":"inactive";
  const frame=mode==="firmament-tropical-hybrid"?"Firmament tropical hybrid (not classical sidereal Jyotish)":"sidereal Jyotish";
  const explanation=[
    `[TRADITION · ${frame}] Saturn/Shani house-lordship: ${lagna==null?"Lagna unavailable; no functional classification":`${SIGNS[lagna]} Lagna; Saturn rules houses ${saturnLords.join(" and ")}`}; ${yogakaraka===true?"a classical yogakaraka by combined kendra/trikona lordship":yogakaraka===false?"not a standard Taurus/Libra Saturn yogakaraka": "not established"}.`,
    `[TRADITION · Transit from natal Moon] Sade Sati phase: ${sadeSati}; Dhaiya: ${dhaiya}. ${house==null?"No verified natal-Moon-to-transit-Saturn comparison in this reading.":`Transit Saturn is ${house} sign(s) counted from natal Moon.`}`,
    "Do not call Shani categorically beneficial or harmful. Assess dignity, aspects, combustion/affliction, house lordship, dasha, strength and cancellations. Sade Sati and Dhaiya are symbolic timing rules, not promises of hardship or prosperity.",
  ].join(" ");
  return {coordinateMode:mode,lagnaSign:lagna==null?null:SIGNS[lagna],yogakaraka,lordship:saturnLords,sadeSati,dhaiya,explanation};
}
