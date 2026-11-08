import type { FindingJudgment, SynthesisResult } from "./types";

/** Transmit every available calculated finding and full chart context; never truncate evidence for cost. */
export function buildNarrativePacket(synthesis:SynthesisResult,question:string){
  const methodIds=new Map<string,string>(),findingIds=new Map<string,string>();
  const excerpt=(f:FindingJudgment)=>f.judgment;
  let next=0;
  const methodOutcomes=synthesis.methodOutcomes.map((o,i)=>{
    const alias=`m${i}`;methodIds.set(alias,o.methodId);
    const findings=o.findingJudgments;
    const rows=findings.map(f=>{
      const id=`f${next++}`;findingIds.set(id,f.id);
      return [f.subject,[excerpt(f)],[],[],f.valence,f.strength,f.frame??o.frame,f.limitation??null,id,f.mechanism];
    });
    return {methodId:alias,originalMethodId:o.methodId,chartScope:o.chartScope,frame:o.frame,status:o.status,totalFindings:o.findingJudgments.length,findingJudgments:rows};
  });
  const expected=synthesis.sourceSnapshot.methodExecutionLedger.length;
  if(expected!==synthesis.methodOutcomes.length)throw new Error(`SYNTHESIS_INPUT_MISMATCH: ${expected} calculated method records but ${synthesis.methodOutcomes.length} method outcomes`);
  return {packet:{mode:synthesis.mode,question,
    coverage:"All registered methods, all calculated findings and all interpreted planetary judgments; no one-finding-per-method truncation.",
    coordinatePolicy:"Supplied XYZ, fixed firmament, Equal Houses. Shadbala measures capacity, not favorable outcome; Bhava ranks are relative to this chart. Preserve each method's source and scope limits.",
    chart_meta:{inputs:synthesis.sourceSnapshot.inputs,frameConfig:synthesis.sourceSnapshot.frameConfig,baseCelestialState:synthesis.sourceSnapshot.baseCelestialState,godView:synthesis.sourceSnapshot.godView,agentView:synthesis.sourceSnapshot.agentView},
    planet_placements:{natal:synthesis.sourceSnapshot.natal?.movingBodies??synthesis.sourceSnapshot.baseCelestialState.planets,transit:synthesis.sourceSnapshot.transit?.planets??[]},
    aspects:{natal:synthesis.sourceSnapshot.layers["western-aspects-and-orbs"]?.results??[],transit:synthesis.sourceSnapshot.transit?.aspectsToNatal??[]},
    method_ledger:synthesis.sourceSnapshot.methodExecutionLedger,
    raw_calculated_outcomes:synthesis.sourceSnapshot.methodExecutionLedger.map(layer=>({methodId:layer.id,status:layer.status,results:layer.results??null,evidenceIds:layer.evidenceIds,errorCode:layer.errorCode??null})),
    judgmentColumns:["subject","judgmentParts","evidenceIds","sourceRefs","valence","strength","frame","limitation","findingId","mechanism"],textTable:[],methodLedger:synthesis.methodFindings,methodOutcomes},methodIds,findingIds};
}
export function restoreNarrativeIds(raw:unknown,bindings:ReturnType<typeof buildNarrativePacket>):unknown{
  if(!raw||typeof raw!=="object")return raw;
  const data=raw as Record<string,any>,method=(id:string)=>bindings.methodIds.get(id)??id,finding=(id:string)=>bindings.findingIds.get(id)??id;
  return {...data,sections:Array.isArray(data.sections)?data.sections.map((s:any)=>({...s,findingIds:Array.isArray(s.findingIds)?s.findingIds.map(finding):s.findingIds})):data.sections,
    methodContributions:Array.isArray(data.methodContributions)?data.methodContributions.map((c:any)=>({...c,methodId:method(c.methodId),findingIds:Array.isArray(c.findingIds)?c.findingIds.map(finding):c.findingIds})):data.methodContributions,
    methodsReviewed:Array.isArray(data.methodsReviewed)?data.methodsReviewed.map(method):data.methodsReviewed};
}

/** Fixed required keys let the provider enforce coverage during generation.
 * Citation bindings come from the calculation, never from model-copied IDs.
 */
export function buildNarrativeContract(bindings:ReturnType<typeof buildNarrativePacket>){
  const active=bindings.packet.methodOutcomes.filter(o=>o.status==="interpreted");
  const groups:Record<string,typeof active>={s1:[],s2:[],s3:[]};
  // Keep each section cross-method; repeated natal/event families remain scoped.
  active.forEach((method,index)=>groups[`s${index%3+1}`].push(method));
  const ids=["s1","s2","s3"];
  const object=(properties:Record<string,unknown>)=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
  const schema={...object({
    contributions:object(Object.fromEntries(active.map(m=>[m.methodId,{type:"string"}]))),
    answer:{type:"string"},
    sections:object(Object.fromEntries(ids.map(id=>[id,{$ref:"#/$defs/section"}]))),
  }),$defs:{section:object({title:{type:"string"},text:{type:"string"}})}};
  return {schema,plan:ids.map(id=>({id,methodIds:groups[id].map(m=>m.methodId)})),
    decode(raw:unknown){
      if(!raw||typeof raw!=="object")return raw;
      const data=raw as Record<string,any>;
      // Existing structured callers can still be validated with original IDs.
      if(Array.isArray(data.sections))return restoreNarrativeIds(raw,bindings);
      const sections=ids.map(id=>({id,title:data.sections?.[id]?.title,text:data.sections?.[id]?.text,
        findingIds:groups[id].flatMap(m=>m.findingJudgments.map(row=>bindings.findingIds.get(row[8] as string)!))}));
      const contributions=active.map(m=>({methodId:bindings.methodIds.get(m.methodId)!,sectionIds:[ids.find(id=>groups[id].some(v=>v.methodId===m.methodId))!],findingIds:m.findingJudgments.map(row=>bindings.findingIds.get(row[8] as string)!),contribution:data.contributions?.[m.methodId]}));
      return {answer:data.answer,sections,methodContributions:contributions};
    }};
}
