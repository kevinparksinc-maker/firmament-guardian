import sweph from "sweph";
import type { ChartResult } from "../../astronomy";
import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type { EvidenceItem, SourceTrace } from "../types";

const ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
const YEARS: Record<(typeof ORDER)[number], number> = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const CLASSICAL = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as const;
type Classical = (typeof CLASSICAL)[number];
type Contributor = Classical | "Lagna";
type BinduTable = Record<Classical, Record<Contributor, number[]>>;

// Parashari benefic houses, counted inclusively from each contributor's sign.
const BENEFIC_PLACES: BinduTable = {
 Sun:{Sun:[1,2,4,7,8,9,10,11],Moon:[3,6,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[3,5,6,9,10,11,12],Jupiter:[5,6,9,11],Venus:[6,7,12],Saturn:[1,2,4,7,8,9,10,11],Lagna:[3,4,6,10,11,12]},
 Moon:{Sun:[3,6,7,8,10,11],Moon:[1,3,6,7,10,11],Mars:[2,3,5,6,9,10,11],Mercury:[1,3,4,5,7,8,10,11],Jupiter:[1,4,7,8,10,11,12],Venus:[3,4,5,7,9,10,11],Saturn:[3,5,6,11],Lagna:[3,6,10,11]},
 Mars:{Sun:[3,5,6,10,11],Moon:[3,6,11],Mars:[1,2,4,7,8,10,11],Mercury:[3,5,6,11],Jupiter:[6,10,11,12],Venus:[6,8,11,12],Saturn:[1,4,7,8,9,10,11],Lagna:[1,3,6,10,11]},
 Mercury:{Sun:[5,6,9,11,12],Moon:[2,4,6,8,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[1,3,5,6,9,10,11,12],Jupiter:[6,8,11,12],Venus:[1,2,3,4,5,8,9,11],Saturn:[1,2,4,7,8,9,10,11],Lagna:[1,2,4,6,8,10,11]},
 Jupiter:{Sun:[1,2,3,4,7,8,9,10,11],Moon:[2,5,7,9,11],Mars:[1,2,4,7,8,10,11],Mercury:[1,2,4,5,6,9,10,11],Jupiter:[1,2,3,4,7,8,10,11],Venus:[2,5,6,9,10,11],Saturn:[3,5,6,12],Lagna:[1,2,4,5,6,7,9,10,11]},
 Venus:{Sun:[8,11,12],Moon:[1,2,3,4,5,8,9,11,12],Mars:[3,5,6,9,11,12],Mercury:[3,5,6,9,11],Jupiter:[5,8,9,10,11],Venus:[1,2,3,4,5,8,9,10,11],Saturn:[3,4,5,8,9,10,11],Lagna:[1,2,3,4,5,8,9,11]},
 Saturn:{Sun:[1,2,4,7,8,10,11],Moon:[3,6,11],Mars:[3,5,6,10,11,12],Mercury:[6,8,9,10,11,12],Jupiter:[5,6,11,12],Venus:[6,11,12],Saturn:[3,5,6,11],Lagna:[1,3,4,6,10,11]},
};
const EXPECTED_TOTALS: Record<Classical, number> = {Sun:48,Moon:49,Mars:39,Mercury:54,Jupiter:56,Venus:52,Saturn:39};
const TRACE = (technique: string, ruleId: string): SourceTrace => ({
 sourceId:"local-vedic-rules", tradition:"vedic", technique, sourceTitle:"Firmament Vedic calculation layer",
 retrievedAt:new Date().toISOString(), ruleId, confidence:"high",
 calculationSettings:{ayanamsa:"Lahiri/Chitrapaksha",ephemeris:"Swiss Ephemeris Moshier",yearLengthDays:365.25},
});
function sidereal(longitude:number,jd:number) {
 const sw=sweph as any; const constants=sw.constants??{}; const lahiri=Number(constants.SE_SIDM_LAHIRI??1);
 try {
  sw.set_sid_mode(lahiri,0,0);
  const ayanamsa=Number(sw.get_ayanamsa_ut(jd));
  if(!Number.isFinite(ayanamsa)) throw new Error("Swiss Ephemeris returned an invalid Lahiri ayanamsa.");
  return {longitude:normalizeLongitude(longitude-ayanamsa),ayanamsa};
 } finally { sw.set_sid_mode(Number(constants.SE_SIDM_FAGAN_BRADLEY??0),0,0); }
}
function signIndex(longitude:number){return Math.floor(normalizeLongitude(longitude)/30);}
function dayNumber(date:Date){return date.getTime()/86400000;}
function dateLabel(days:number){return new Date(days*86400000).toISOString().slice(0,10);}
function subperiods(start:number,end:number,lord:(typeof ORDER)[number]){
 const index=ORDER.indexOf(lord); const years=(end-start)/365.25; let cursor=start;
 return ORDER.map((_,offset)=>{const child=ORDER[(index+offset)%9];const next=cursor+years*YEARS[child]/120*365.25;const item={lord:child,start:cursor,end:next};cursor=next;return item;});
}
function activePeriod<T extends {start:number;end:number}>(items:T[],now:number){return items.find(item=>now>=item.start&&now<item.end);}
function dashaEvidence(chart:ChartResult,ayanamsa:number,moon:number):EvidenceItem[]{
 if(chart.momentPrecision==="date-only-reference"||chart.input.birthTimeKnown===false) return [{
  id:"vedic-dasha-time-uncertain",tradition:"vedic",category:"uncertainty",technique:"dasha",subject:"Vimshottari Dasha",
  statement:"Vimshottari periods were not asserted because birth time is date-only or marked unknown. The Moon's sidereal position and Dasha balance can change within the day; provide a verified birth time for an exact timeline.",
  concepts:["dasha","birth-time-uncertain"],polarity:"neutral",strength:0,ruleId:"vedic-dasha-architecture",sourceId:"local-vedic-rules",sourceTrace:TRACE("dasha","vedic-dasha-architecture"),
 }];
 const birth=dayNumber(new Date(chart.utc)); const size=360/27; const starIndex=Math.floor(moon/size); const progressed=moon-starIndex*size;
 const firstLord=ORDER[starIndex%9]; const balance=(size-progressed)/size*YEARS[firstLord]; const elapsed=YEARS[firstLord]-balance;
 let cursor=birth-elapsed*365.25; const timeline:Array<{lord:(typeof ORDER)[number];start:number;end:number}>=[];
 for(let i=0;i<9;i++){const lord=ORDER[(ORDER.indexOf(firstLord)+i)%9];const end=cursor+YEARS[lord]*365.25;timeline.push({lord,start:cursor,end});cursor=end;}
 const now=dayNumber(new Date()); const active=activePeriod(timeline,now); const details=[
  "Lahiri sidereal Moon "+moon.toFixed(4)+"°; ayanamsa "+ayanamsa.toFixed(4)+"°.",
  "Birth Nakshatra "+NAKSHATRAS[starIndex]+"; starting Mahadasha "+firstLord+".",
  "Balance at birth "+balance.toFixed(3)+" years using a 365.25-day year."
 ];
 if(active){
  const ads=subperiods(active.start,active.end,active.lord);const ad=activePeriod(ads,now);const pds=ad?subperiods(ad.start,ad.end,ad.lord):[];const pd=activePeriod(pds,now);
  details.push("Current Mahadasha: "+active.lord+" ("+dateLabel(active.start)+"–"+dateLabel(active.end)+").");
  if(ad) details.push("Current Antardasha: "+active.lord+"/"+ad.lord+" ("+dateLabel(ad.start)+"–"+dateLabel(ad.end)+").");
  if(ad&&pd) details.push("Current Pratyantardasha: "+active.lord+"/"+ad.lord+"/"+pd.lord+" ("+dateLabel(pd.start)+"–"+dateLabel(pd.end)+").");
  const next=timeline.find(item=>item.start>now);if(next)details.push("Next Mahadasha: "+next.lord+", beginning "+dateLabel(next.start)+".");
 } else details.push("Current date falls outside the first nine Mahadashas generated; no current period is claimed.");
 return [{id:"vedic-vimshottari-dasha",tradition:"vedic",category:"calculated-fact",technique:"dasha",subject:"Vimshottari Dasha",statement:details.join(" "),concepts:["dasha","vimshottari",NAKSHATRAS[starIndex].toLowerCase(),firstLord.toLowerCase()],polarity:"neutral",strength:1,ruleId:"vedic-dasha-architecture",sourceId:"local-vedic-rules",sourceTrace:{...TRACE("dasha","vedic-dasha-architecture"),calculationSettings:{ayanamsa:"Lahiri/Chitrapaksha",ayanamsaDegrees:Number(ayanamsa.toFixed(6)),siderealMoonDegrees:Number(moon.toFixed(6)),birthNakshatra:NAKSHATRAS[starIndex],yearLengthDays:365.25,subperiods:"proportional 120-year Vimshottari cycle"}}}];
}
function ashtakavargaEvidence(positions:Record<Classical,number>,asc:number,ayanamsa:number):EvidenceItem[]{
 const contributorSigns:Record<Contributor,number>={Lagna:signIndex(asc),...Object.fromEntries(CLASSICAL.map(p=>[p,signIndex(positions[p])])) as Record<Classical,number>};
 const bav={} as Record<Classical,number[]>;
 for(const target of CLASSICAL){
  const scores=Array(12).fill(0) as number[];
  for(const contributor of [...CLASSICAL,"Lagna"] as Contributor[]) for(const house of BENEFIC_PLACES[target][contributor]) scores[(contributorSigns[contributor]+house-1)%12]++;
  const total=scores.reduce((a,b)=>a+b,0);
  if(total!==EXPECTED_TOTALS[target]) return [{id:"vedic-ashtakavarga-checksum-failed",tradition:"vedic",category:"uncertainty",technique:"ashtakavarga",subject:"Ashtakavarga",statement:"Ashtakavarga withheld because "+target+" BAV checksum was "+total+", expected "+EXPECTED_TOTALS[target]+". No scores are passed to the interpreter.",concepts:["ashtakavarga","validation-failed"],polarity:"neutral",strength:0,ruleId:"vedic-ashtakavarga-classical",sourceId:"local-vedic-rules",sourceTrace:TRACE("ashtakavarga","vedic-ashtakavarga-classical")}];
  bav[target]=scores;
 }
 const sav=Array(12).fill(0) as number[];for(const p of CLASSICAL)bav[p].forEach((score,i)=>sav[i]+=score);
 if(sav.reduce((a,b)=>a+b,0)!==337) return [{id:"vedic-ashtakavarga-sav-checksum-failed",tradition:"vedic",category:"uncertainty",technique:"ashtakavarga",subject:"Ashtakavarga",statement:"Sarvashtakavarga checksum failed; no scores are passed to the interpreter.",concepts:["ashtakavarga","validation-failed"],polarity:"neutral",strength:0,ruleId:"vedic-ashtakavarga-classical",sourceId:"local-vedic-rules",sourceTrace:TRACE("ashtakavarga","vedic-ashtakavarga-classical")}];
 const ranked=sav.map((score,i)=>({sign:ZODIAC_SIGNS[i],score}));const high=[...ranked].sort((a,b)=>b.score-a.score).slice(0,3);const low=[...ranked].sort((a,b)=>a.score-b.score).slice(0,3);
 const parts=["Lahiri sidereal, unreduced Parashari Bhinnashtakavarga and Sarvashtakavarga; ayanamsa "+ayanamsa.toFixed(4)+"°.","SAV total checksum 337 bindus.","Highest SAV signs: "+high.map(x=>x.sign+" "+x.score).join(", ")+".","Lowest SAV signs: "+low.map(x=>x.sign+" "+x.score).join(", ")+".",...CLASSICAL.map(p=>p+" BAV total "+bav[p].reduce((a,b)=>a+b,0)+": "+bav[p].map((score,i)=>ZODIAC_SIGNS[i]+" "+score).join(", ")+".")];
 return [{id:"vedic-ashtakavarga-bav-sav",tradition:"vedic",category:"calculated-fact",technique:"ashtakavarga",subject:"Bhinnashtakavarga and Sarvashtakavarga",statement:parts.join(" "),concepts:["ashtakavarga","bhinnashtakavarga","sarvashtakavarga","bindu-scores"],polarity:"neutral",strength:1,ruleId:"vedic-ashtakavarga-classical",sourceId:"local-vedic-rules",sourceTrace:{...TRACE("ashtakavarga","vedic-ashtakavarga-classical"),calculationSettings:{ayanamsa:"Lahiri/Chitrapaksha",ayanamsaDegrees:Number(ayanamsa.toFixed(6)),system:"Parashari unreduced BAV/SAV",excludedContributors:["Rahu","Ketu"],checksums:{Sun:48,Moon:49,Mars:39,Mercury:54,Jupiter:56,Venus:52,Saturn:39,SAV:337}}}}];
}
export function resolveVedicTimingAndAshtakavarga(chart:ChartResult):EvidenceItem[]{
 if(!Number.isFinite(chart.julianDay)||!chart.utc) return [{id:"vedic-advanced-no-epoch",tradition:"vedic",category:"uncertainty",technique:"dasha-ashtakavarga",subject:"Dasha and Ashtakavarga",statement:"Dasha and Ashtakavarga were not calculated because the chart has no valid birth epoch.",concepts:["dasha","ashtakavarga","unavailable"],polarity:"neutral",strength:0,ruleId:"vedic-dasha-architecture",sourceId:"local-vedic-rules",sourceTrace:TRACE("dasha-ashtakavarga","vedic-dasha-architecture")}];
 try{
  const moon=chart.movingBodies.find(row=>row.name==="Moon");if(!moon)throw new Error("Natal Moon is missing.");
  const moonSidereal=sidereal(moon.longitude,chart.julianDay);const result=dashaEvidence(chart,moonSidereal.ayanamsa,moonSidereal.longitude);
  const asc=chart.ascendant;if(!asc||!Number.isFinite(asc.longitude)) return [...result,{id:"vedic-ashtakavarga-no-ascendant",tradition:"vedic",category:"uncertainty",technique:"ashtakavarga",subject:"Ashtakavarga",statement:"Ashtakavarga requires a usable birth Ascendant/Lagna. This chart has no calculated Ascendant, so no BAV/SAV scores are asserted.",concepts:["ashtakavarga","lagna-unavailable"],polarity:"neutral",strength:0,ruleId:"vedic-ashtakavarga-classical",sourceId:"local-vedic-rules",sourceTrace:TRACE("ashtakavarga","vedic-ashtakavarga-classical")}];
  const sidAsc=sidereal(asc.longitude,chart.julianDay);const positions={} as Record<Classical,number>;
  for(const p of CLASSICAL){const row=chart.movingBodies.find(item=>item.name===p);if(!row)throw new Error("Required classical position "+p+" is missing.");positions[p]=sidereal(row.longitude,chart.julianDay).longitude;}
  return [...result,...ashtakavargaEvidence(positions,sidAsc.longitude,sidAsc.ayanamsa)];
 }catch(error){return [{id:"vedic-advanced-calculation-error",tradition:"vedic",category:"uncertainty",technique:"dasha-ashtakavarga",subject:"Dasha and Ashtakavarga",statement:"Dasha/Ashtakavarga calculation failed safely: "+(error instanceof Error?error.message:String(error))+". No inferred score or timing is supplied.",concepts:["dasha","ashtakavarga","calculation-error"],polarity:"neutral",strength:0,ruleId:"vedic-dasha-architecture",sourceId:"local-vedic-rules",sourceTrace:TRACE("dasha-ashtakavarga","vedic-dasha-architecture")}];}
}
