import { describe, expect, it } from "vitest";
import type { CalculationEvidenceEnvelope } from "../../../../shared/calculationEvidence";
import { makePrivateCertificate, makePublicCertificate } from "./certificate";

const sample = {
  schemaVersion:"calculation-evidence/v1",timestampUtc:"1986-11-20T16:06:00Z",
  reproducibilityId:"private-hash",canonicalInputs:{
    natal:{localDate:"1986-11-20",localTime:"10:06",latitudeDeg:32.7767,longitudeDeg:-96.797,timezone:"America/Chicago"},
    calculationMode:{worldview:"agent",readingScope:"natal",natalHouseFrame:"agent",transitHouseFrame:"none",siderealModeId:14,geocentricFlags:0,topocentricFlags:0,majorAspectOrbDegrees:5,aspectTargets:{},observerElevationPolicy:"none",fixedStarTableSha256:"secret",calculationAlgorithmVersion:"v1"}
  },engine:{name:"Swiss Ephemeris",version:"test",wrapper:"sweph@test",model:"test"},
  frame:{id:"production",version:"v1"},
  items:[{objectId:"natal:Sun",displayValue:"private-position",frameId:"production",input:{localTime:"10:06",latitudeDeg:32.7767},engine:{name:"test",version:"test",wrapper:"test"},source:{},steps:[],validation:{status:"unverified"}}],
  privacy:{visibility:"private-only",containsPreciseBirthOrLocationData:true,shareSafe:false},
  reproducibilityNote:"private"
} as CalculationEvidenceEnvelope;

describe("calculation certificate export privacy",()=>{
  it("excludes all sensitive fields from public certificate",()=>{
    const publicText=JSON.stringify(makePublicCertificate(sample));
    for(const secret of ["1986-11-20","10:06","32.7767","-96.797","America/Chicago","private-hash","private-position","fixedStarTableSha256","canonicalInputs","timestampUtc","items","reproducibilityId"]) {
      expect(publicText).not.toContain(secret);
    }
    expect(JSON.parse(publicText).privacy).toBe("public-redacted");
  });
  it("keeps complete evidence only in explicitly private export",()=>{
    const privateCert=makePrivateCertificate(sample);
    expect(privateCert.canonicalInputs.natal.localTime).toBe("10:06");
    expect(privateCert.privacy.shareSafe).toBe(false);
  });
});
