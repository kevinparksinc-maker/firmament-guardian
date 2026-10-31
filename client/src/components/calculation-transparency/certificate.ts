import type { CalculationEvidenceEnvelope } from "../../../../shared/calculationEvidence";

/** Strict allowlist: never serialize the private envelope into a public artifact. */
export function makePublicCertificate(e: CalculationEvidenceEnvelope) {
  return {
    certificateSchema: "absolute-public-certificate/v1" as const,
    frame: { id: e.frame.id, version: e.frame.version },
    engine: { name: e.engine.name, version: e.engine.version, wrapper: e.engine.wrapper },
    method: "Summary only. No birth inputs, precise coordinates, timestamps, raw values, or per-object evidence.",
    validation: "Unverified by independent catalog comparison; not a signature or accuracy certification.",
    privacy: "public-redacted" as const,
  };
}
export function makePrivateCertificate(e: CalculationEvidenceEnvelope) {
  return {
    certificateSchema: "absolute-private-certificate/v1" as const,
    ...e,
    warning: "PRIVATE: Contains precise birth/location data. Never publish this file.",
  };
}
