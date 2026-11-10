import type { AstrologyEvidencePacket } from "../types";
import { ZODIAC_SIGNS } from "../../../shared/hybrid";
const lords: Record<string,string> = {Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter"};
const elements = ["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"];
const modalities = ["Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable"];
const normalize = (n:number) => ((n%360)+360)%360;
export function buildDerivationSheet(packet: AstrologyEvidencePacket): string {
 const chart=packet.chartFacts;
 const rows=chart.placements.filter(p=>Number.isFinite(p.longitude));
 const signOf=(longitude:number)=>ZODIAC_SIGNS[Math.floor(normalize(longitude)/30)];
 const asc=rows.find(p=>p.name==="Ascendant");
 const ruler=asc?lords[signOf(asc.longitude)]:null;
 const rulerPlacement=ruler?rows.find(p=>p.name===ruler):null;
 const dossier=packet.canonDossier;
 const lines:string[]=["DETERMINISTIC CHART DERIVATION: use these premises BEFORE narrative. Facts must not be invented.", "Every interpretive claim must follow PREMISE (body, exact position, house, relevant rule) → BECAUSE (how the rule operates) → THEREFORE (qualified human-life interpretation)."];
 if(asc)lines.push(`ASCENDANT: ${asc.display}; ${signOf(asc.longitude)} traditional domicile ruler is ${ruler}. ${rulerPlacement?`CHART RULER ${ruler} at ${rulerPlacement.display}, house ${rulerPlacement.house}. Explain what this placement changes; never omit the chart ruler.`:"Chart ruler position unavailable; do not invent it."}`);
 else lines.push("ASCENDANT unavailable: do not assert a chart ruler or all twelve angular houses.");
 const planets=rows.filter(p=>["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"].includes(p.name));
 const elt:Record<string,number>={Fire:0,Earth:0,Air:0,Water:0};
 const mod:Record<string,number>={Cardinal:0,Fixed:0,Mutable:0};
 for(const p of planets){const idx=Math.floor(normalize(p.longitude)/30);elt[elements[idx]]++;mod[modalities[idx]]++;}
 lines.push("PLANET ELEMENT COUNTS (ten planets when supplied): "+Object.entries(elt).map(([k,v])=>k+" "+v).join("; ")+". MODALITY COUNTS: "+Object.entries(mod).map(([k,v])=>k+" "+v).join("; ")+". Counts describe distribution, not personality proof.");
 for(const p of dossier.placements){
   const d=p.dignityAndCondition;
   lines.push(`PLACEMENT ${p.body}: ${p.display}; house ${p.displayedHouse}; sign ruler ${lords[p.sign]??"unresolved"}; ${d.essentialDignities.length?"dignities "+d.essentialDignities.join(", "):"no listed essential dignity"}; ${d.essentialDebilities.length?"debilities "+d.essentialDebilities.join(", "):"no listed essential debility"}; ${d.conditionSummary}; ${p.decanRecord?"elemental decan "+p.decanRecord.label:"decan unspecified"}; ${p.nakshatraRecord?"Nakshatra "+p.nakshatraRecord.name:""}; ${p.manzilRecord?"Manzil "+p.manzilRecord.name:""}.`);
 }
 for(const d of dossier.dispositorChains??[]){lines.push(`DISPOSITOR ${d.planet}: ${d.chainToFinalDispositor.join(" → ")}; ${d.finalDispositor?"final "+d.finalDispositor:d.inMutualReceptionLoop?"reception loop "+d.loopMembers.join(" ↔ "):"not resolved"}. ${d.conditionVsDeliveryNote}`);}
 for(const chain of dossier.relationalChains??[])lines.push("HOUSE RULER DERIVATION: "+chain.workedChainSummary);
 for(const e of packet.fixedStarEvidence)lines.push("STELLAR PREMISE: "+e.statement);
 for(const e of packet.westernEvidence.filter(e=>/aspect|relationship|dignity/.test(e.technique)))lines.push("ASPECT/DIGNITY PREMISE: "+e.statement);
 lines.push("CHINESE XIU: named historical catalog entries are not natal Moon assignments. Do not claim an occupied Xiu without verified boundary evidence.");
 lines.push("REQUIRED READING AUDIT: chart ruler; Sun/Moon dignity and exact degrees; all planet positions; both nodes; every material aspect and its planets; each worked house ruler and dispositorship; Lots/ruler chains only if calculated; element/modality distribution; yogas, Dasha, Ashtakavarga, stellar contacts and uncertainty. Clearly label unavailable items rather than filling gaps.");
 return lines.join("\n");
}
