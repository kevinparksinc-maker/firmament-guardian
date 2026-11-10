import {normalizeLongitude,ZODIAC_SIGNS} from "../../../shared/hybrid";
import type {ChartResult} from "../../astronomy";
import type {EvidenceItem} from "../types";

const chaldean=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"] as const;
const weekday=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as const;
const trace=(technique:string)=>({sourceId:"local-arabic-rules",tradition:"arabic" as const,technique,sourceTitle:"Traditional Hellenistic dodecatemoria / Chaldean planetary hours (astronomical sunrise sunset approximation)",retrievedAt:new Date().toISOString(),ruleId:technique==="twelfth-parts"?"arabic-twelfth-parts":"arabic-planetary-hours",confidence:"moderate" as const});
export function twelfthPart(longitude:number){
 const lon=normalizeLongitude(longitude), source=Math.floor(lon/30), within=lon%30;
 const output=normalizeLongitude(source*30+within*12);
 return {longitude:output,sourceSign:ZODIAC_SIGNS[source],derivedSign:ZODIAC_SIGNS[Math.floor(output/30)],degree:output%30,part:Math.floor(within/2.5)+1,variant:"Hellenistic sign-start 12x" as const};
}
/** NOAA mean-solar approximation, UTC sunrise/set. Rounded precision is intentional.
 * Returns null at polar latitudes/dates without actual horizon crossings.
 */
export function solarEvents(dateUTC:Date,lat:number,lon:number){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const d=new Date(Date.UTC(dateUTC.getUTCFullYear(),dateUTC.getUTCMonth(),dateUTC.getUTCDate()));
 const start=Date.UTC(d.getUTCFullYear(),0,0);
 const day=(d.getTime()-start)/86400000;
 const gamma=2*Math.PI/365*(day-1);
 const equation=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const phi=lat*Math.PI/180;
 const cosH=(Math.cos(90.833*Math.PI/180)/(Math.cos(phi)*Math.cos(decl)))-Math.tan(phi)*Math.tan(decl);
 if(Math.abs(cosH)>1)return null;
 const H=Math.acos(cosH)*180/Math.PI;
 const noon=720-4*lon-equation;
 return {sunrise:new Date(d.getTime()+(noon-4*H)*60000),sunset:new Date(d.getTime()+(noon+4*H)*60000),model:"NOAA mean solar approximation, refraction -0.833 degrees" as const};
}
export function planetaryHour(moment:Date,lat:number,lon:number){
 if(!Number.isFinite(moment.getTime()))return null;
 const candidates=[] as {rise:Date;set:Date;nextRise:Date;dayRuler:string}[];
 for(let day=-2;day<=1;day++){
  const date=new Date(moment.getTime()+day*86400000);
  const ev=solarEvents(date,lat,lon);
  const next=solarEvents(new Date(date.getTime()+86400000),lat,lon);
  if(!ev||!next)continue;
  const localSolarWeekday=new Date(ev.sunrise.getTime()+lon*240000).getUTCDay();
  const dayRuler=weekday[localSolarWeekday];
  candidates.push({rise:ev.sunrise,set:ev.sunset,nextRise:next.sunrise,dayRuler});
 }
 const x=candidates.find(e=>moment>=e.rise&&moment<e.nextRise);
 if(!x)return null;
 const isDay=moment<x.set;
 const periodStart=isDay?x.rise:x.set,periodEnd=isDay?x.set:x.nextRise;
 const duration=(periodEnd.getTime()-periodStart.getTime())/12;
 if(duration<=0)return null;
 const number=Math.min(11,Math.floor((moment.getTime()-periodStart.getTime())/duration));
 const startIndex=chaldean.indexOf(x.dayRuler as typeof chaldean[number]);
 const index=(startIndex+(isDay?number:number+12))%7;
 return {ruler:chaldean[index],dayRuler:x.dayRuler,period:isDay?"day":"night",hourNumber:isDay?number+1:number+13,from:new Date(periodStart.getTime()+number*duration).toISOString(),until:new Date(periodStart.getTime()+(number+1)*duration).toISOString(),sunrise:x.rise.toISOString(),sunset:x.set.toISOString(),model:"NOAA approximate sunrise/sunset + Chaldean order"};
}
export function resolveSubdivisions(chart:ChartResult):EvidenceItem[]{
 const evidence:EvidenceItem[]=[];
 const rows=[...chart.movingBodies,chart.ascendant,chart.northNode,chart.southNode].filter((r):r is NonNullable<typeof r>=>r !== null && r !== undefined && Number.isFinite(r.longitude));
 for(const row of rows){
  const t=twelfthPart(row.longitude);
  evidence.push({id:`arabic-twelfth-part-${row.name.toLowerCase().replace(/\s+/g,"-")}`,tradition:"arabic",category:"deterministic-rule",technique:"twelfth-parts",subject:row.name,
   statement:`[Hellenistic sign-start dodecatemorion, 12x, tropical/fixed Guardian frame] ${row.name} ${row.display}: source ${t.sourceSign}, twelfth-part ${t.part}, derived ${t.derivedSign} ${t.degree.toFixed(3)}°. Point-origin 13x is a distinct uncomputed variant.`,
   concepts:["twelfth-parts",row.name.toLowerCase(),t.derivedSign.toLowerCase()],polarity:"neutral",sourceId:"local-arabic-rules",sourceTrace:trace("twelfth-parts")});
 }
 const {latitude,longitude}=chart.input;
 const validGeo=Number.isFinite(latitude)&&Number.isFinite(longitude)&&chart.agentViewAvailable&&chart.momentPrecision==="exact";
 const hour=validGeo?planetaryHour(new Date(chart.utc),latitude,longitude):null;
 if(hour){
  evidence.push({id:"arabic-planetary-hour",tradition:"arabic",category:"deterministic-rule",technique:"planetary-hours",subject:"Question/chart moment",
   statement:`[Approximate astronomical planetary hour] ${hour.ruler}, ${hour.period} hour ${hour.hourNumber}; day ruler ${hour.dayRuler}. Interval ${hour.from} to ${hour.until}; sunrise ${hour.sunrise}, sunset ${hour.sunset}. Sunrise/sunset are approximate (NOAA), and not a rectified local-horizon ephemeris calculation.`,
   concepts:["planetary-hours",hour.ruler.toLowerCase(),hour.period],polarity:"neutral",sourceId:"local-arabic-rules",sourceTrace:trace("planetary-hours")});
 }else{
  evidence.push({id:"arabic-hours-unavailable",tradition:"arabic",category:"uncertainty",technique:"planetary-hours",subject:"Question/chart moment",statement:"Planetary hour unavailable: local observer location, valid time, or sunrise/sunset is absent (including polar days/nights).",concepts:["planetary-hours","unavailable"],polarity:"neutral",sourceId:"local-arabic-rules",sourceTrace:trace("planetary-hours")});
 }
 const transitMoment=new Date(chart.transitDate);
 if(chart.readingScope!=="natal" && chart.transitDate!==chart.utc && chart.momentPrecision==="exact"){
  const tlat=chart.input.transitLatitude??latitude;
  const tlon=chart.input.transitLongitude??longitude;
  const transitHour=chart.transitHouseFrame!=="god-fixed" && Number.isFinite(tlat)&&Number.isFinite(tlon)?planetaryHour(transitMoment,tlat,tlon):null;
  if(transitHour){
    evidence.push({id:"arabic-planetary-hour-transit",tradition:"arabic",category:"deterministic-rule",technique:"planetary-hours",subject:"Transit moment",
      statement:`[Approximate transit planetary hour] ${transitHour.ruler}, ${transitHour.period} hour ${transitHour.hourNumber} at ${chart.transitDate}, using transit observer coordinates; sunrise ${transitHour.sunrise}, sunset ${transitHour.sunset}. Planetary hours are symbolic calendar divisions, not causes of events.`,
      concepts:["planetary-hours","transit",transitHour.ruler.toLowerCase()],polarity:"neutral",sourceId:"local-arabic-rules",sourceTrace:trace("planetary-hours")});
  }else evidence.push({id:"arabic-planetary-hour-transit-unavailable",tradition:"arabic",category:"uncertainty",technique:"planetary-hours",subject:"Transit moment",statement:"Transit planetary hour unavailable: exact local horizon data or sunrise/sunset was not supplied.",concepts:["planetary-hours","transit","unavailable"],polarity:"neutral",sourceId:"local-arabic-rules",sourceTrace:trace("planetary-hours")});
 }
 return evidence;
}
