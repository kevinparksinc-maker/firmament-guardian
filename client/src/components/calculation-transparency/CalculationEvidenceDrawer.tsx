import type { CalculationEvidence, CalculationEvidenceEnvelope } from "../../../../shared/calculationEvidence";
import "./calculation-transparency.css";

export function CalculationEvidenceDrawer({item, title="How was this calculated?"}:{item:CalculationEvidence | undefined;title?:string}) {
  return <details className="abs-evidence-drawer"><summary>{title}</summary>{!item?<p>Detailed calculation evidence is not available for this result yet.</p>:<div className="abs-evidence-content"><p><strong>{item.objectId}</strong> · {item.displayValue}</p><p>Reference frame: {item.frameId} · {item.engine.name} {item.engine.version}</p><p>Validation: {item.validation.status}</p>{item.steps.length?<ol>{item.steps.map((step,i)=><li key={i}><strong>{step.name}</strong><code>{step.formula}</code><dl>{Object.entries(step.operands).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl><p>Result: {String(step.result)} {step.units??""}</p></li>)}</ol>:<p>No intermediate steps have been recorded for this item.</p>}{item.validation.notes?.map((note,i)=><p key={i}>{note}</p>)}</div>}</details>;
}
export function EvidenceById({envelope,objectId}:{envelope:CalculationEvidenceEnvelope|undefined;objectId:string}) {
  return <CalculationEvidenceDrawer item={envelope?.items.find(item=>item.objectId===objectId)}/>;
}
