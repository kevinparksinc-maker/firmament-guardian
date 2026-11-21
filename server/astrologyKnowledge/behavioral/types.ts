import type { BehavioralDomain, ResponseStyle } from "./catalog";

export type BehavioralConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type BehavioralConfidenceLabel =
  | "Level 1 — Possible"
  | "Level 2 — Supported"
  | "Level 3 — Strong"
  | "Level 4 — Dominant"
  | "Level 5 — Structural";

export type BehavioralState =
  | "baseline"
  | "activated"
  | "suppressed"
  | "emerging"
  | "integrated"
  | "crisis";

export type EvidenceChannelHit = {
  channel:
    | "planet"
    | "sign"
    | "house"
    | "aspect"
    | "angularity"
    | "repetition"
    | "development"
    | "god-agent"
    | "overlay";
  detail: string;
};

export type EvaluatedBehaviorPattern = {
  id: string;
  codeNumber: number;
  name: string;
  domain: BehavioralDomain;
  domainLabel: string;
  confidenceLevel: BehavioralConfidenceLevel;
  confidenceLabel: BehavioralConfidenceLabel;
  languagePrefix: string;
  state: BehavioralState;
  questionRelevance: number;
  score: number;
  definition: string;
  observableExpressions: string[];
  constructiveExpression: string;
  shadowExpression: string;
  consciousExpression: string;
  automaticExpression: string;
  internalExpression: string;
  externalExpression: string;
  motivationPatterns: string[];
  triggerPatterns: string[];
  responseStyle: ResponseStyle;
  repeatingCycle: string;
  compensationPattern: string;
  developmentalTrajectory: {
    early: string;
    developing: string;
    mature: string;
  };
  godToAgentSynthesis: string;
  supportingEvidence: EvidenceChannelHit[];
  counterEvidence: string[];
  aiLanguageRule: string;
};

export type EvaluatedPolarityAxis = {
  id: string;
  leftPole: string;
  rightPole: string;
  leftScore: number;
  rightScore: number;
  isDynamicTension: boolean;
  dominantSide: "left" | "right" | "balanced-tension";
  leftEvidence: string[];
  rightEvidence: string[];
  synthesis: string;
};

export type EventConfidenceCode = "E1" | "E2" | "E3" | "E4" | "E5";
export type EventTemporalState =
  | "State 1 — Latent (Natal Promise)"
  | "State 2 — Approaching"
  | "State 3 — Activating"
  | "State 4 — Manifesting"
  | "State 5 — Peak Convergence"
  | "State 6 — Integrating"
  | "State 8 — Consolidating";

export type EvaluatedLifeEventPattern = {
  id: string;
  codeNumber: number;
  name: string;
  category: string;
  categoryLabel: string;
  confidenceCode: EventConfidenceCode;
  confidenceLabel: string;
  temporalState: EventTemporalState;
  questionRelevance: number;
  score: number;
  definition: string;
  possibleManifestations: string[];
  alternativeManifestations: string[];
  supportingEvidence: string[];
  counterEvidence: string[];
  godToAgentTranslation: string;
  developmentalMeaning: string;
  sequencePredecessors: string[];
  sequenceSuccessors: string[];
  aiLanguageRule: string;
};

export type EvaluatedSequenceChain = {
  id: string;
  name: string;
  activeStages: string[];
  supportingEvidence: string[];
  narrative: string;
  developmentalMeaning: string;
  strength: number;
};

export type EvaluatedPlanetInteraction = {
  pair: string;
  aspect: string;
  orb: number;
  coreTheme: string;
  constructive: string;
  shadow: string;
  behavioralMechanism: string;
};

export type SelfKnowledgeDimensionItem = {
  id: string;
  question: string;
  synthesis: string;
  astrologicalProof: string[];
};

export type SystemConvergenceFactor = {
  system: string;
  category: "Foundation" | "Structure" | "Traditional Overlay" | "Frame & Synthesis";
  status: "convergent" | "supporting" | "contextual";
  evidenceSummary: string;
};

export type SimulationComparisonCase = {
  id: string;
  title: string;
  hypothesisTested: string;
  surfaceOrBaselineView: string;
  convergentPatternReality: string;
  verdict: string;
};

export type BehavioralIntelligenceReport = {
  question: string;
  mode: "natal" | "transit" | "combined";
  evaluatedAt: string;
  allAboutYouProfile: SelfKnowledgeDimensionItem[];
  convergenceSimulationLab: {
    sixteenSystems: SystemConvergenceFactor[];
    simulationComparisons: SimulationComparisonCase[];
  };
  dominantBehaviors: EvaluatedBehaviorPattern[];
  polarityAxes: EvaluatedPolarityAxis[];
  activeContradictions: EvaluatedPolarityAxis[];
  activeLifeEvents: EvaluatedLifeEventPattern[];
  eventSequences: EvaluatedSequenceChain[];
  planetInteractions: EvaluatedPlanetInteraction[];
  activeHouseAxes: Array<{
    name: string;
    theme: string;
    narrative: string;
    evidence: string[];
  }>;
  matchedVocabularyTags: Array<{
    code: number;
    domain: string;
    name: string;
    evidence: string;
  }>;
  doNotClaimRestrictions: readonly string[];
};
