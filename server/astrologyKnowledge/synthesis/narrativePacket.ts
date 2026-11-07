import type { FindingJudgment, SynthesisResult } from "./types";

/** Every method is represented; full finding records remain on My Chart.
 * The overview selects a complete, question-relevant outcome from each method,
 * instead of resending hundreds of repeated doctrine paragraphs to a small API tier.
 */
export function buildNarrativePacket(synthesis:SynthesisResult,question:string){
  const methodIds=new Map<string,string>(),findingIds=new Map<string,string>();
  const query=question.toLowerCase(),work=/purpose|work|career|creat|calling|trajectory/.test(query),social=/friend|network|creat/.test(query);
  const score=(f:FindingJudgment)=>{
    let n=({dominant:40,strong:30,moderate:20,subtle:10})[f.strength];
    if(f.subject==="Sun")n+=12;
    if(f.subject==="Moon")n+=8;
    if(f.subject.includes("Creative output and network"))n+=100;
    if(f.subject.startsWith("Mahadasha"))n+=50;
    if(f.subject.startsWith("D9 "))n+=12;
    if(work&&f.subject.startsWith("D10 "))n+=25;
    if(work&&/Venus|Mercury/.test(f.subject))n+=15;
    if(social&&/Mars|Venus/.test(f.subject))n+=15;
    if(f.subject==="32 Paths"||f.subject==="Three Mothers")n-=30;
    if(/no (?:measured|calculated|activated|qualifying)|doctrine.*withheld/i.test(f.judgment))n-=30;
    const ratio=f.mechanism.match(/ = ([\d.]+);/);if(ratio)n+=Number(ratio[1])*10;
    const orb=f.mechanism.match(/orb\s+([\d.]+)/i);if(orb)n+=Math.max(0,10-Number(orb[1])*2);
    const terms=query.match(/[a-z]{4,}/g)??[];
    n+=terms.filter(t=>f.subject.toLowerCase().includes(t)||f.domain.includes(t)).length*8;
    return n;
  };
  const excerpt=(f:FindingJudgment)=>{
    const parts=f.judgment.split(/(?<=[.!?])\s+(?=[A-Z])/);
    let text=parts[0];
    for(const part of parts.slice(1)){if((text+" "+part).length>480)break;text+=" "+part;}
    return text;
  };
  let next=0;
  const selected=new Set<string>();
  const methodOutcomes=synthesis.methodOutcomes.map((o,i)=>{
    const alias=`m${i}`;methodIds.set(alias,o.methodId);
    const ordered=[...o.findingJudgments].sort((a,b)=>score(b)-score(a));
    const findings=o.status==="interpreted"?ordered.slice(0,1):[];
    if(o.methodId.replace(/^transit:/,"")==="vedic-dasha-and-ashtakavarga" && o.status==="interpreted") {
      const sav=ordered.find(f=>f.subject.startsWith("SAV "));
      if(sav&&!findings.some(f=>f.id===sav.id))findings.push(sav);
    }
    const rows=findings.map(f=>{
      const id=`f${next++}`;findingIds.set(id,f.id);selected.add(f.id);
      return [f.subject,[excerpt(f)],[],[],f.valence,f.strength,f.frame??o.frame,f.limitation??null,id,f.mechanism];
    });
    return {methodId:alias,originalMethodId:o.methodId,chartScope:o.chartScope,frame:o.frame,status:o.status,totalFindings:o.findingJudgments.length,findingJudgments:rows};
  });
  // Preserve both kinds of testimony even if the principal selection favors one.
  for(const valence of ["supportive","challenging"]){
    if(methodOutcomes.some(o=>o.findingJudgments.some(row=>row[4]===valence)))continue;
    for(let i=0;i<synthesis.methodOutcomes.length;i++){
      const o=synthesis.methodOutcomes[i];if(o.status!=="interpreted")continue;
      const f=o.findingJudgments.find(f=>f.valence===valence&&!selected.has(f.id));if(!f)continue;
      const id=`f${next++}`;findingIds.set(id,f.id);selected.add(f.id);
      methodOutcomes[i].findingJudgments.push([f.subject,[excerpt(f)],[],[],f.valence,f.strength,f.frame??o.frame,f.limitation??null,id,f.mechanism]);break;
    }
  }
  return {packet:{mode:synthesis.mode,question,
    coverage:"Every registered method; focused finding excerpts for the overview. Complete calculations and judgments remain on My Chart.",
    coordinatePolicy:"Supplied XYZ, fixed firmament, Equal Houses. Shadbala measures capacity, not favorable outcome; Bhava ranks are relative to this chart. Preserve each method's source and scope limits.",
    judgmentColumns:["subject","judgmentParts","evidenceIds","sourceRefs","valence","strength","frame","limitation","findingId","mechanism"],textTable:[],methodOutcomes},methodIds,findingIds};
}
export function restoreNarrativeIds(raw:unknown,bindings:ReturnType<typeof buildNarrativePacket>):unknown{
  if(!raw||typeof raw!=="object")return raw;
  const data=raw as Record<string,any>,method=(id:string)=>bindings.methodIds.get(id)??id,finding=(id:string)=>bindings.findingIds.get(id)??id;
  return {...data,sections:Array.isArray(data.sections)?data.sections.map((s:any)=>({...s,findingIds:Array.isArray(s.findingIds)?s.findingIds.map(finding):s.findingIds})):data.sections,
    methodContributions:Array.isArray(data.methodContributions)?data.methodContributions.map((c:any)=>({...c,methodId:method(c.methodId),findingIds:Array.isArray(c.findingIds)?c.findingIds.map(finding):c.findingIds})):data.methodContributions,
    methodsReviewed:Array.isArray(data.methodsReviewed)?data.methodsReviewed.map(method):data.methodsReviewed};
}
