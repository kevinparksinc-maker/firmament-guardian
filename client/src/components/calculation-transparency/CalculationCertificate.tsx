import type { CalculationEvidenceEnvelope } from "../../../../shared/calculationEvidence";
import { makePrivateCertificate, makePublicCertificate } from "./certificate";
import "./calculation-transparency.css";

export function CalculationCertificate({envelope}:{envelope:CalculationEvidenceEnvelope|undefined}) {
  if(!envelope) return <section className="abs-certificate"><h3>Calculation Certificate</h3><p>No calculation evidence is available for this chart.</p></section>;
  const download=(publicOnly:boolean)=>{
    const data=publicOnly?makePublicCertificate(envelope):makePrivateCertificate(envelope);
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download=publicOnly?"absolute-public-calculation-certificate.json":"absolute-private-calculation-certificate.json";
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  };
  return <section className="abs-certificate"><h3>Calculation Certificate</h3><p>Frame: {envelope.frame.id} · Engine: {envelope.engine.name} {envelope.engine.version}</p><p>Validation is per evidence item; this certificate does not independently certify astronomical accuracy.</p><button type="button" onClick={()=>download(true)}>Export public summary (redacted)</button><button type="button" onClick={()=>download(false)}>Export private certificate (sensitive data)</button><p className="abs-privacy-note">Private export contains precise birth and location details. Do not share it publicly. Public export excludes inputs, coordinates, timestamps, and raw calculation traces.</p></section>;
}
