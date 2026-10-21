import { DECANS, ELEMENTAL_DECAN_SIGNS, normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type { DecanCanonRecord } from "./types";

/** Official 12 Gates decans: 10-degree thirds by the three signs of the same element.
 * No Chaldean planetary-hour or descending-face cycle is used.
 */
const SIGN_RULERS: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon",
  Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars",
  Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};
const ELEMENTS = ["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"] as const;
const ELEMENT_THEMES: Record<string,[string,string,string]> = {
  Fire:["initiative","creative expression","purposeful action"],
  Earth:["stewardship","practical building","endurance"],
  Air:["communication","social intelligence","conceptual synthesis"],
  Water:["emotional perception","protection","depth"],
};

export const DECAN_CANON_RECORDS: DecanCanonRecord[] = DECANS.map((label, idx) => {
  const signIndex=Math.floor(idx/3);
  const sign=ZODIAC_SIGNS[signIndex];
  const decanNumber=((idx%3)+1) as 1|2|3;
  const familySign=ELEMENTAL_DECAN_SIGNS[signIndex][decanNumber-1];
  const element=ELEMENTS[signIndex];
  const familyRuler=SIGN_RULERS[familySign];
  return {
    index:idx+1,
    sign,
    decanNumber,
    degreeRange:[idx*10,(idx+1)*10],
    label,
    elementalFamilySign:familySign,
    elementalFamilyRuler:familyRuler,
    traditionalTitle:`${sign} — ${familySign} elemental decan`,
    coreThemes: [...ELEMENT_THEMES[element]],
    behavioralNuance:`The ${decanNumber===1?"first":decanNumber===2?"second":"third"} 10° of ${sign} expresses ${element.toLowerCase()} through its ${familySign} family correspondence. This is an interpretive association, not a separate calculated planetary position.`,
    provenance:{
      tradition:"western",
      sourceTitle:"Elemental-family / zodiacal triplicity decan framework (12 Gates configuration)",
      epistemicCategory:"TRADITION",
      disputedOrVariantNote:"Configured elemental-family decans only; Chaldean faces are not used in this interpretation.",
    },
  };
});
export function getDecanCanonByLongitude(longitude:number):DecanCanonRecord {
  const index=Math.floor(normalizeLongitude(longitude)/10)%36;
  return DECAN_CANON_RECORDS[index];
}
