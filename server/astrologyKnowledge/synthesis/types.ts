import type { UnifiedMasterChartSnapshot } from "../../masterChart/types";

export type HumanDomain =
  | "identity"
  | "purpose_work"
  | "relationships"
  | "resources_wealth"
  | "family_home"
  | "autonomy_power"
  | "energy_wellbeing"
  | "choices_obstacles"
  | "timing";

export interface SynthesisInput {
  snapshot: UnifiedMasterChartSnapshot;
  readingMode: "natal" | "transit" | "combined";
  userQuestion?: string;
}

export interface InterpretedProposition {
  id: string;
  themeTitle: string;
  plainLanguageMeaning: string;
  domain: HumanDomain;
  causalMechanism: string; // e.g., "Mars in 10th House trine Sun"
  valence: "supportive" | "challenging" | "transformative" | "neutral";
  strength: "dominant" | "strong" | "moderate" | "subtle";
  tradition: string; // "Hellenistic", "Vedic Jyotish", "Babylonian Fixed Stars", "Arabic Lots", "Kabbalah", etc.
  frame: "god" | "agent" | "shared" | "transit";
  supportingEvidenceIds: string[];
  opposingEvidenceIds: string[];
  sourceDoctrineIds: string[];
}

export interface SynthesizedTheme {
  id: string;
  humanTheme: string;
  domain: HumanDomain;
  primaryConclusion: string;
  whyHow: string;
  concreteManifestations: string[];
  consequences: string;
  deeperMeaning: string;
  timing?: {
    onset?: string;
    peak?: string;
    easing?: string;
    notes?: string;
  };
  convergenceAssessment: {
    independentTraditions: string[];
    corroborationLevel:
      | "unanimous"
      | "strong-corroboration"
      | "moderate-reinforcement"
      | "singular";
    tensions: string[];
    reconciliation: string;
  };
  linkedPropositionIds: string[];
  evidenceIds: string[];
}

export interface SynthesisResult {
  snapshotId: string;
  mode: "natal" | "transit" | "combined";
  dominantConclusion: string;
  integratedNarrative: string[];
  methodFindings: Array<{ id: string; name: string; tradition: string; status: string; frame: string; evidenceIds: string[]; sourceIds: string[]; resultCount: number; findings: Array<{ label: string; details: string }>; notes?: string }>;
  themes: SynthesizedTheme[];
  contradictionsAndTensions: Array<{
    polarities: string;
    reconciliation: string;
    evidenceIds: string[];
  }>;
  timingOverview?: {
    activeWindow: string;
    turningPoints: string[];
  };
  methodLedgerSummary: {
    totalEvaluated: number;
    computedWithResult: number;
    referenceOnly: number;
    notApplicable: number;
    failed: number;
  };
  evidenceTraceMap: Record<string, string[]>;
  qualityAudit: {
    groundedRatio: number; // 1.0 (100% of claims grounded in evidence IDs)
    unsupportedClaims: string[];
    passed: boolean;
  };
}
