import type { ReactNode } from "react";
import "./absolute-ui.css";

type Tone = "default" | "gold" | "cyan" | "violet" | "rose";
type Action = ReactNode;
export function AbsoluteCard({children,tone="default",selected=false,className=""}:{children:ReactNode;tone?:Tone;selected?:boolean;className?:string}) {
  return <div className={["abs-card",`abs-tone-${tone}`,selected?"abs-selected":"",className].filter(Boolean).join(" ")}>{children}</div>;
}
export function AbsoluteSection({title,eyebrow,description,action,children}:{title:string;eyebrow?:string;description?:string;action?:Action;children:ReactNode}) {
  return <section className="abs-section"><header className="abs-section-header"><div>{eyebrow&&<p className="abs-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description&&<p className="abs-muted">{description}</p>}</div>{action}</header>{children}</section>;
}
export function MetricTile({label,displayValue,description,evidence,status}:{label:string;displayValue:string|number;description?:string;evidence?:ReactNode;status?:string}) {
  return <AbsoluteCard><p className="abs-eyebrow">{label}</p><p className="abs-metric">{displayValue}</p>{status&&<p className="abs-status">{status}</p>}{description&&<p className="abs-muted">{description}</p>}{evidence&&<details><summary>Why this value?</summary><div className="abs-evidence">{evidence}</div></details>}</AbsoluteCard>;
}
export function PlanetPlacementCard({planetName,glyph,signLabel,degreeLabel,houseLabel,dignityLabel,onInspect}:{planetName:string;glyph:string;signLabel:string;degreeLabel:string;houseLabel?:string;dignityLabel?:string;onInspect?:()=>void}) {
  const inner=<><span className="abs-glyph" aria-hidden="true">{glyph}</span><span className="abs-card-copy"><strong>{planetName}</strong><span>{signLabel} · {degreeLabel}</span><small>{[houseLabel,dignityLabel].filter(Boolean).join(" · ")}</small></span></>;
  return onInspect?<button type="button" className="abs-planet abs-clickable" onClick={onInspect} aria-label={`Inspect ${planetName}, ${signLabel} ${degreeLabel}`}>{inner}</button>:<div className="abs-planet">{inner}</div>;
}
export function HouseCard({houseNumber,signLabel,cuspDegree,rulerLabel,occupants=[]}:{houseNumber:number;signLabel:string;cuspDegree?:string;rulerLabel?:string;occupants?:string[]}) {
  return <AbsoluteCard><p className="abs-eyebrow">House {houseNumber}</p><strong>{signLabel}</strong>{cuspDegree&&<p>{cuspDegree}</p>}{rulerLabel&&<p className="abs-muted">Ruler: {rulerLabel}</p>}<p className="abs-muted">{occupants.length?occupants.join(", "):"No planets"}</p></AbsoluteCard>;
}
export function ElementBalanceCard({elements}:{elements:{name:string;value:number;label:string}[]}) {
  return <AbsoluteCard><h3>Element balance</h3><div className="abs-stack">{elements.map(e=><div key={e.name}><div className="abs-between"><span>{e.name}</span><span>{e.label}</span></div><div className="abs-meter" role="img" aria-label={`${e.name}: ${e.label}`}><span style={{width:`${Math.max(0,Math.min(100,e.value))}%`}} /></div></div>)}</div></AbsoluteCard>;
}
export function MansionCard({tradition,mansionName,degreeRangeLabel,occupants=[],interpretation}:{tradition:string;mansionName:string;degreeRangeLabel?:string;occupants?:string[];interpretation?:ReactNode}) {
  return <AbsoluteCard tone="violet"><p className="abs-eyebrow">{tradition}</p><h3>{mansionName}</h3>{degreeRangeLabel&&<p>{degreeRangeLabel}</p>}<p className="abs-muted">{occupants.length?`Occupants: ${occupants.join(", ")}`:"Unoccupied"}</p>{interpretation&&<details><summary>Interpretation</summary><div className="abs-evidence">{interpretation}</div></details>}</AbsoluteCard>;
}
export function ChartFrame({title,frameLabel,legend,evidence,children}:{title:string;frameLabel:"God View"|"Agent View"|string;legend?:ReactNode;evidence?:ReactNode;children:ReactNode}) {
  return <AbsoluteCard tone="gold"><div className="abs-between"><h3>{title}</h3><span className="abs-chip">{frameLabel}</span></div><div className="abs-chart">{children}</div>{legend&&<div className="abs-muted">{legend}</div>}{evidence&&<details><summary>Chart evidence</summary><div className="abs-evidence">{evidence}</div></details>}</AbsoluteCard>;
}
export function ReadingSection({heading,summary,paragraphs,evidence}:{heading:string;summary:string;paragraphs:string[];evidence?:ReactNode}) {
  return <section className="abs-reading"><h3>{heading}</h3><p className="abs-reading-lead">{summary}</p>{paragraphs.map((p,i)=><p key={i}>{p}</p>)}{evidence&&<details><summary>Why this interpretation?</summary><div className="abs-evidence">{evidence}</div></details>}</section>;
}
export function EnergyStatusCard({statusLabel,scoreLabel,windowLabel,nextShiftLabel,suggestions=[],evidence,chartSlot}:{statusLabel:string;scoreLabel?:string;windowLabel?:string;nextShiftLabel?:string;suggestions?:string[];evidence?:ReactNode;chartSlot?:ReactNode}) {
  return <AbsoluteCard tone="cyan" className="abs-energy"><p className="abs-eyebrow">Personal Harmonic Flow Clock</p><div className="abs-between"><h2>{statusLabel}</h2>{scoreLabel&&<strong className="abs-metric">{scoreLabel}</strong>}</div>{windowLabel&&<p>{windowLabel}</p>}{nextShiftLabel&&<p className="abs-muted">Next shift: {nextShiftLabel}</p>}{suggestions.length>0&&<ul>{suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul>}{(evidence||chartSlot)&&<details><summary>Explore the evidence and charts</summary><div className="abs-evidence">{evidence}{chartSlot}</div></details>}</AbsoluteCard>;
}
export function StatePanel({kind,title,message,action}:{kind:"loading"|"empty"|"error"|"locked";title:string;message:string;action?:ReactNode}) {
  return <div className="abs-state" role={kind==="error"?"alert":"status"} aria-busy={kind==="loading"}><p className="abs-eyebrow">{kind}</p><h3>{title}</h3><p className="abs-muted">{message}</p>{action}</div>;
}
