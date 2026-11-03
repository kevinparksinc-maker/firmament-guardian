
import type { ChartResult } from "../../../server/astronomy";
import { agentHouseFor, angularDistance } from "../../../server/astrologyCore";
export type SynastryAspect={planetA:string;planetB:string;aspect:string;symbol:string;orb:number;weight:number;intensity:number;type:"harmony"|"tension"|"neutral"|"karmic";title:string;description:string};
export type ChemistryScores={overall:number;archetype:string;archetypeSubtitle:string;romantic:number;emotional:number;intellectual:number;stability:number;soulGrowth:number};
export type SynastryOverlay={planet:string;inHouse:number;meaning:string};
// Eight non-overlapping cross-chart aspects: four harmony and four friction.
const TARGETS=[
 {degrees:0,label:"Conjunction",symbol:"☌",type:"harmony" as const,weight:1},
 {degrees:30,label:"Semisextile",symbol:"⚺",type:"harmony" as const,weight:0.5},
 {degrees:45,label:"Semisquare",symbol:"∠",type:"tension" as const,weight:0.5},
 {degrees:60,label:"Sextile",symbol:"⚹",type:"harmony" as const,weight:0.5},
 {degrees:90,label:"Square",symbol:"□",type:"tension" as const,weight:1},
 {degrees:120,label:"Trine",symbol:"△",type:"harmony" as const,weight:1},
 {degrees:150,label:"Quincunx",symbol:"⚻",type:"tension" as const,weight:0.5},
 {degrees:180,label:"Opposition",symbol:"☍",type:"tension" as const,weight:1},
];
const PLANET_STARS:Record<string,number>={
 Sun:5,Moon:5,Mars:5,Jupiter:5,Saturn:5,Pluto:5,
 Mercury:4,Neptune:4,Venus:3,Uranus:3,
 "North Node":4,"South Node":4
};
const intensity=(orb:number)=>Math.max(1,5-Math.floor(orb));
const THEMES=["identity and initiative","resources and values","communication and learning","home and belonging","romance and creativity","daily routines and care","partnership and cooperation","trust and shared resources","beliefs and exploration","responsibility and purpose","friendship and community","privacy and recovery"];
const FIELDS={
 romantic:new Set(["Sun","Moon","Venus","Mars"]),
 emotional:new Set(["Moon","Sun","Venus","Saturn"]),
 intellectual:new Set(["Mercury","Jupiter","Uranus"]),
 stability:new Set(["Saturn","Sun","Moon","Venus"]),
 soulGrowth:new Set(["Jupiter","Saturn","Pluto","Neptune","Uranus"]),
};
export function computeSynastry(chartA:ChartResult|null,chartB:ChartResult|null){
 const empty:ChemistryScores={overall:0,archetype:"Awaiting two charts",archetypeSubtitle:"Both birth charts are required.",romantic:0,emotional:0,intellectual:0,stability:0,soulGrowth:0};
 if(!chartA||!chartB)return{aspects:[] as SynastryAspect[],scores:empty,houseOverlays:[] as SynastryOverlay[]};
 const aspects:SynastryAspect[]=[];
 for(const a of chartA.movingBodies)for(const b of chartB.movingBodies){
  if(!Number.isFinite(a.longitude)||!Number.isFinite(b.longitude))continue;
  const d=angularDistance(a.longitude,b.longitude);
  const found=TARGETS.map(t=>({...t,orb:Math.abs(d-t.degrees)})).sort((a,b)=>a.orb-b.orb)[0];
  if(found.orb>5)continue;
  const type:SynastryAspect["type"]=found.type;
  const orb=Number(found.orb.toFixed(2));
  aspects.push({planetA:a.name,planetB:b.name,aspect:found.label,symbol:found.symbol,orb,type,weight:found.weight,intensity:intensity(found.orb),
   title:a.name+" "+found.label+" "+b.name+" · "+(type==="harmony"?"Flow":type==="tension"?"Friction":type==="karmic"?"Structure":"Integration"),
   description:a.name+" in Person A's sky forms a "+found.label.toLowerCase()+" to "+b.name+" in Person B's sky at "+orb+"°. Its symbolic meaning depends on both charts and personal context."
  });
 }
 const metric=(names:Set<string>)=>{
  const relevant=aspects.filter(a=>names.has(a.planetA)||names.has(a.planetB));
  if(!relevant.length)return 0;
  let positive=0,total=0;
  for(const a of relevant){const w=a.intensity*a.weight*(PLANET_STARS[a.planetA]??3)*(PLANET_STARS[a.planetB]??3);
   positive+=w*(a.type==="harmony"?1:0);total+=w;}
  return Math.round(100*positive/total);
 };
 const romantic=metric(FIELDS.romantic),emotional=metric(FIELDS.emotional),intellectual=metric(FIELDS.intellectual),stability=metric(FIELDS.stability),soulGrowth=metric(FIELDS.soulGrowth);
 const flow=aspects.filter(a=>a.type==="harmony").length,friction=aspects.filter(a=>a.type==="tension").length;
 const all=new Set<string>(Object.values(FIELDS).flatMap(s=>Array.from(s)));
 const overall=metric(all);
 const archetype=aspects.length===0?"No close aspects in scope":flow>friction?"Flow-forward encounter":friction>flow?"Growth through friction":"Mixed celestial testimony";
 const archetypeSubtitle=aspects.length+" cross-chart contacts within 5° · "+flow+" flow · "+friction+" friction. Indices use 1–5 orb intensity, planetary weights, and half-weight minor aspects; not compatibility probabilities.";
 const houseOverlays:SynastryOverlay[]=[];
 for(const dir of [
  {sender:chartA,receiver:chartB,sendLabel:"Person A",receiveLabel:"Person B"},
  {sender:chartB,receiver:chartA,sendLabel:"Person B",receiveLabel:"Person A"}
 ]){
  const asc=dir.receiver.ascendant?.longitude;
  if(asc==null||!Number.isFinite(asc))continue;
  for(const body of dir.sender.movingBodies){
   if(!Number.isFinite(body.longitude))continue;
   const house=agentHouseFor(body.longitude,asc);
   houseOverlays.push({planet:dir.sendLabel+" · "+body.name,inHouse:house,
    meaning:dir.sendLabel+"'s "+body.name+" falls in "+dir.receiveLabel+"'s calculated House "+house+" ("+THEMES[house-1]+"). This is a geometrical overlay, not a diagnosis of feelings."});
  }
 }
 return {aspects,scores:{overall,archetype,archetypeSubtitle,romantic,emotional,intellectual,stability,soulGrowth},houseOverlays};
}
