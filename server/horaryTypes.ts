import type { ChartInput, ChartResult } from "./astronomy";
import type { FrameRelationship } from "./astrologyCore";
import type { Lookahead } from "./horaryLookahead";
import type { TraditionalHoraryEvidence } from "./horaryTraditional";
import type { HoraryQuestionAnalysis } from "./horaryQuestionAnalyzer";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject?: "querent" | "other";
  topicHouse?: number;
  /** House of the person asked about, counted from the querent. */
  subjectHouse?: number;
  /** Precomputed Step 1 question analysis (auto-determined when omitted). */
  questionAnalysis?: HoraryQuestionAnalysis;
  natal?: Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time">;
};

export type HoraryPlacement = {
  name: string;
  longitude: number;
  display: string;
  sign: string;
  house: number;
  retrograde: boolean;
  speed: number;
  godHouse?: number;
  agentHouse?: number;
  frameRelationship?: FrameRelationship;
};

export type HoraryAspect = {
  first: string;
  second: string;
  aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
  phase: "applying" | "separating" | "unclear";
};

export type HoraryChart = {
  question: string;
  questionAnalysis: HoraryQuestionAnalysis;
  subject: "querent" | "other";
  subjectHouse: number;
  subjectRuler: string;
  topicHouse: number;
  actualTopicHouse: number;
  topicLabel: string;
  additionalTopicHouses: Array<{
    relativeHouse: number;
    actualHouse: number;
    sign: string;
    ruler: string;
    label: string;
  }>;
  askedAt: string;
  location: string;
  timezone: string;
  houseSystem: "Equal House";
  ascendant: { longitude: number; display: string; sign: string };
  querentRuler: string;
  topicRuler: string;
  moon: HoraryPlacement;
  houses: Array<{ house: number; longitude: number; sign: string; ruler: string }>;
  placements: HoraryPlacement[];
  relevantAspects: HoraryAspect[];
  otherCloseAspects: HoraryAspect[];
  lookahead: Lookahead;
  natalChart?: ChartResult;
  transitChart: ChartResult;
  godChart: ChartResult;
  traditional: TraditionalHoraryEvidence;
  canonEvidenceText: string;
  evidenceText: string;
  judgmentEvidenceText: string;
  unifiedSynthesisSnapshotId?: string;
};
