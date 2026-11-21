export type Tradition = "western" | "vedic" | "arabic" | "firmament";
export type KnowledgeKind = "deterministic-rule" | "source-correspondence";
export type RuleStatus = "implemented" | "incomplete";
export type EvidenceRelation =
  | "reinforcement"
  | "amplification"
  | "qualification"
  | "contradiction"
  | "tension"
  | "different-layer"
  | "timing-difference";

export type AstrologySource = {
  id: string;
  name: string;
  tradition: Tradition;
  authorityType: "calculation" | "tradition" | "reference" | "api";
  url?: string;
  status: "active" | "reference-only" | "disabled";
  capabilities: string[];
};

export type AstrologyRule = {
  id: string;
  tradition: Tradition;
  technique: string;
  subject: string;
  kind: KnowledgeKind;
  sourceId: string;
  status: RuleStatus;
  statement: string;
  doctrine?: string;
};

export type KnowledgePlan = {
  question: string;
  coreLayers: [
    "genesis-astro-engine",
    "genesis-pattern-engine",
    "genesis-yoga-detector",
  ];
  genesisPolicy: "mandatory-evaluate-before-prioritization";
  domains: string[];
  subjects: string[];
  techniques: string[];
  includeTiming: boolean;
  includeDivisionalCharts: string[];
  reasons: string[];
};

export type EvidenceItem = {
  id: string;
  tradition: Tradition;
  category:
    | "calculated-fact"
    | "deterministic-rule"
    | "source-correspondence"
    | "uncertainty";
  technique: string;
  subject: string;
  statement: string;
  concepts: string[];
  polarity?: "supportive" | "pressured" | "mixed" | "neutral";
  strength?: number;
  ruleId?: string;
  sourceId: string;
  sourceTrace: SourceTrace;
};

export type SourceTrace = {
  sourceId: string;
  tradition: Tradition;
  technique: string;
  sourceUrl?: string;
  sourceTitle: string;
  retrievedAt: string;
  ruleId?: string;
  confidence: "high" | "moderate" | "low" | "reference-only";
  provider?: string;
  calculationSettings?: Record<string, unknown>;
  implementationStatus?: RuleStatus;
};

export type EvidenceRelationship = {
  id: string;
  relation: EvidenceRelation;
  theme: string;
  evidenceIds: string[];
  traditions: Tradition[];
  explanation: string;
  strength: number;
};
