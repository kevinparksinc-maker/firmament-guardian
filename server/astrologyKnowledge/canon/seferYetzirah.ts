/** Sefer Yetzirah / Four Worlds knowledge layer.
 * These are historically situated symbolic correspondences, not physical causes.
 * 32 paths = 10 sefirot + 22 letters (3 mothers, 7 doubles, 12 simples).
 * The Four Worlds belong to later Kabbalistic cosmology, not the text of Sefer Yetzirah itself.
 * Source: https://sacred-texts.com/jud/yetzirah.htm (Westcott translation, textual variant)
 * Four worlds: https://www.jewishencyclopedia.com/articles/3073-beriah
 * https://sefaria.jewishencyclopedia.com/articles/2012-asiyah
 */
import { ZODIAC_SIGNS, normalizeLongitude } from "../../../shared/hybrid";
import type { ChartResult } from "../../astronomy";
import type { EvidenceItem } from "../types";

const BASE="https://sacred-texts.com/jud/yetzirah.htm";
const WORLDS_SOURCE="https://www.jewishencyclopedia.com/articles/3073-beriah";
export const MOTHER_LETTERS = [
  {letter:"א",name:"Aleph",element:"Air"},
  {letter:"מ",name:"Mem",element:"Water"},
  {letter:"ש",name:"Shin",element:"Fire"},
] as const;
export const SIMPLE_LETTERS=[
  {letter:"ה",name:"Heh"},{letter:"ו",name:"Vav"},{letter:"ז",name:"Zayin"},
  {letter:"ח",name:"Chet"},{letter:"ט",name:"Tet"},{letter:"י",name:"Yod"},
  {letter:"ל",name:"Lamed"},{letter:"נ",name:"Nun"},{letter:"ס",name:"Samekh"},
  {letter:"ע",name:"Ayin"},{letter:"צ",name:"Tsadi"},{letter:"ק",name:"Qoph"},
].map((v,i)=>({...v,sign:ZODIAC_SIGNS[i],variant:"Westcott / Short recension family; compare editions"}));
/** The planetary ordering below is one explicitly identified textual variant.
 * It must never be presented as the only authentic Sefer Yetzirah assignment.
 */
export const DOUBLE_LETTERS=[
  {letter:"ב",name:"Bet",planet:"Saturn",contraries:["life","death"]},
  {letter:"ג",name:"Gimel",planet:"Jupiter",contraries:["peace","war"]},
  {letter:"ד",name:"Dalet",planet:"Mars",contraries:["wisdom","folly"]},
  {letter:"כ",name:"Kaf",planet:"Sun",contraries:["wealth","poverty"]},
  {letter:"פ",name:"Pe",planet:"Venus",contraries:["grace","ugliness"]},
  {letter:"ר",name:"Resh",planet:"Mercury",contraries:["fertility","barrenness"]},
  {letter:"ת",name:"Tav",planet:"Moon",contraries:["dominion","servitude"]},
] as const;
export const FOUR_WORLDS=[
  {name:"Atzilut",hebrew:"אצילות",stage:"Emanation",question:"What is the originating principle?"},
  {name:"Beriah",hebrew:"בריאה",stage:"Creation",question:"What possibility or intention takes shape?"},
  {name:"Yetzirah",hebrew:"יצירה",stage:"Formation",question:"What structure, relationship, or pattern forms?"},
  {name:"Assiah",hebrew:"עשיה",stage:"Action",question:"What actions and observable consequences follow?"},
] as const;
const trace=(technique:string,url=BASE,title="Sefer Yetzirah (Westcott translation; attribution variant)")=>({
  sourceId:"sefer-yetzirah-canon",tradition:"firmament" as const,technique,sourceUrl:url,
  sourceTitle:title,retrievedAt:"2026-10-21T00:00:00.000Z",ruleId:"sefer-yetzirah-correspondences",
  confidence:"reference-only" as const,implementationStatus:"implemented" as const,
});
const evidence=(id:string,technique:string,subject:string,statement:string,concepts:string[],url=BASE,title?:string):EvidenceItem=>({
  id,tradition:"firmament",category:"source-correspondence",technique,subject,statement,concepts,
  polarity:"neutral",sourceId:"sefer-yetzirah-canon",sourceTrace:trace(technique,url,title),
});
export function seferYetzirahEvidence(chart:ChartResult):EvidenceItem[]{
  const result:EvidenceItem[]=[];
  result.push(evidence("sy-cosmology-32","sefer-yetzirah-framework","32 Paths",
    "[TEXTUAL TRADITION] Thirty-two paths: ten sefirot and twenty-two Hebrew letters (three mothers, seven doubles, twelve simples). This is symbolic cosmology, not a physical prediction.",
    ["sefer-yetzirah","32-paths","cosmology"]));
  result.push(evidence("sy-mothers","sefer-yetzirah-mothers","Aleph Mem Shin",
    "[TEXTUAL TRADITION] Mother letters: Aleph/Air, Mem/Water, Shin/Fire. Earth is not one of the three mothers. Guardian's four-element decan framework remains independent.",
    ["sefer-yetzirah","mothers","elements"]));
  for(const row of chart.movingBodies){
    const body=DOUBLE_LETTERS.find(r=>r.planet===row.name);
    if(body) result.push(evidence(`sy-double-${row.name.toLowerCase()}`,"sefer-yetzirah-doubles",row.name,
      `[TEXTUAL VARIANT — not universal] ${row.name} at ${row.display}: double letter ${body.name} (${body.letter}), symbolic contraries ${body.contraries[0]} / ${body.contraries[1]}. The chart does not establish which contrary manifests; explore both as questions.`,
      ["sefer-yetzirah","seven-doubles",row.name.toLowerCase(),body.name.toLowerCase()]));
    const simple=SIMPLE_LETTERS[Math.floor(normalizeLongitude(row.longitude)/30)];
    result.push(evidence(`sy-simple-${row.name.toLowerCase()}`,"sefer-yetzirah-simples",row.name,
      `[TEXTUAL VARIANT] ${row.name} at ${row.display}: ${simple.sign} is associated with the simple letter ${simple.name} (${simple.letter}) in the specified recension. This does not replace zodiac or house calculations.`,
      ["sefer-yetzirah","twelve-simples",simple.sign.toLowerCase(),row.name.toLowerCase()]));
  }
  result.push(evidence("sy-four-worlds","four-worlds","Four Worlds",
    "[LATER JEWISH KABBALAH — distinct from Sefer Yetzirah] Atzilut/Emanation → Beriah/Creation → Yetzirah/Formation → Assiah/Action. Interpret symbolically through source, possibility, formed pattern, and observable action; do not claim a chart proves causal manifestation.",
    ["four-worlds","emanation","creation","formation","action"],WORLDS_SOURCE,"Jewish Encyclopedia: Beriah and the Four Worlds"));
  return result;
}
