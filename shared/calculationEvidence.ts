export type EvidenceInputSnapshot = {
  localDate?: string;
  localTime?: string;
  timezone?: string;
  utcIso?: string;
  julianDay?: number;
  timeSource?: "explicit-local-date-time" | "date-only-reference" | "automatic-current-time";
  latitudeDeg?: number;
  longitudeDeg?: number;
  elevationM?: number;
  observerMode?: "geocentric" | "topocentric";
};

export type CalculationEvidenceStep = {
  name: string;
  formula: string;
  operands: Record<string, number | string>;
  result: number | string;
  units?: string;
};

export type CalculationEvidence = {
  objectId: string;
  resultLongitudeDeg?: number;
  /** Raw longitude returned by the active Swiss call, before application normalization. */
  rawResultLongitudeDeg?: number;
  resultLatitudeDeg?: number;
  displayValue: string;
  frameId: string;
  frameEpoch?: string;
  input: EvidenceInputSnapshot;
  engine: {
    name: string;
    version: string;
    wrapper: string;
    flags?: number;
    model?: string;
  };
  source: {
    catalog?: string;
    reference?: string;
    url?: string;
  };
  steps: CalculationEvidenceStep[];
  validation: {
    status: "verified" | "unverified" | "not-applicable";
    fixtureId?: string;
    referenceValue?: number;
    angularDifferenceArcmin?: number;
    notes?: string[];
  };
};

export type CalculationEvidenceEnvelope = {
  schemaVersion: "calculation-evidence/v1";
  /** Chart event time, not the server's wall-clock generation time. */
  timestampUtc: string;
  /** Stable identifier for canonical inputs + engine + frame configuration; not a proof of accuracy. */
  reproducibilityId: string;
  canonicalInputs: {
    natal: EvidenceInputSnapshot;
    transit?: EvidenceInputSnapshot;
    calculationMode: {
      worldview: string;
      readingScope: string;
      natalHouseFrame: string;
      transitHouseFrame: string;
      siderealModeId: number;
      geocentricFlags: number;
      topocentricFlags: number;
      majorAspectOrbDegrees: number;
      aspectTargets: Record<string, number>;
      observerElevationPolicy: string;
      fixedStarTableSha256: string;
      calculationAlgorithmVersion: string;
    };
  };
  engine: {
    name: string;
    version: string;
    wrapper: string;
    flags?: number;
    model: string;
  };
  frame: {
    id: string;
    version: string;
    epoch?: string;
  };
  items: CalculationEvidence[];
  privacy: {
    visibility: "private-only";
    containsPreciseBirthOrLocationData: true;
    shareSafe: false;
  };
  reproducibilityNote: string;
};
