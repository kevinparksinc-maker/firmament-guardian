import type { ChartResult } from "../astronomy";
import type { BehavioralIntelligenceReport } from "./behavioral/types";
import type { ChartCanonDossier } from "./canon/types";

import type { EvidenceItem, EvidenceRelationship, KnowledgePlan, SourceTrace } from "./evidenceTypes";
export type {
  Tradition,
  KnowledgeKind,
  RuleStatus,
  EvidenceRelation,
  AstrologySource,
  AstrologyRule,
  KnowledgePlan,
  EvidenceItem,
  SourceTrace,
  EvidenceRelationship
} from "./evidenceTypes";

export type AstrologyEvidencePacket = {
  question: string;
  plan: KnowledgePlan;
  chartFacts: {
    worldview: ChartResult["worldview"];
    readingScope: ChartResult["readingScope"];
    utc: string;
    agentViewAvailable: boolean;
    placements: Array<{
      name: string;
      longitude: number;
      display: string;
      house: number;
      godHouse?: number;
      agentHouse?: number;
    }>;
  };
  westernEvidence: EvidenceItem[];
  patternEvidence: EvidenceItem[];
  genesisAstroEvidence: EvidenceItem[];
  behavioralEvidence: EvidenceItem[];
  lifeEventEvidence: EvidenceItem[];
  behavioralReport: BehavioralIntelligenceReport;
  canonEvidence: EvidenceItem[];
  canonDossier: ChartCanonDossier;
  vedicEvidence: EvidenceItem[];
  arabicEvidence: EvidenceItem[];
  lunarEvidence: EvidenceItem[];
  fixedStarEvidence: EvidenceItem[];
  timingEvidence: EvidenceItem[];
  relationships: EvidenceRelationship[];
  convergences: EvidenceRelationship[];
  contradictions: EvidenceRelationship[];
  uncertainties: EvidenceItem[];
  incomplete: string[];
  sourceTrace: SourceTrace[];
  doctrine: {
    genesis: Record<string, unknown>;
    western: Record<string, unknown>;
    vedic: Record<string, unknown>;
    arabic: Record<string, unknown>;
  };
};
