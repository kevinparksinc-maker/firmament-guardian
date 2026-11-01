import type { ChartResult, ChartRow } from "../astronomy";

export type LayerStatus =
  | "computed-with-result"
  | "computed-no-result"
  | "not-applicable"
  | "not-implemented"
  | "reference-only"
  | "failed";

export type ProjectionFrame =
  | "god"
  | "agent"
  | "shared"
  | "natal"
  | "transit"
  | "cross-chart";

export interface LayerRecord<T = unknown> {
  id: string;
  tradition:
    | "hellenistic"
    | "vedic"
    | "babylonian"
    | "arabic-persian"
    | "chinese"
    | "kabbalah"
    | "genesis"
    | "firmament";
  technique: string;
  name: string;
  status: LayerStatus;
  frame: ProjectionFrame;
  results?: T;
  evidenceIds: string[];
  sourceIds: string[];
  prerequisites: string[];
  calculationVersion: string;
  errorCode?: string;
  notes?: string;
}

export interface MasterChartInput {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
  time: string;
  transitDate?: string;
  transitTime?: string;
  mode?: "natal" | "transit" | "combined";
}

export interface UnifiedMasterChartSnapshot {
  snapshotId: string;
  schemaVersion: "1.0.0";
  createdAtUtc: string;
  inputs: {
    profileIds: string[];
    eventInstantUtc: string;
    timezone: string;
    locationContext: {
      location: string;
      latitude: number;
      longitude: number;
    };
    mode: "natal" | "transit" | "combined";
  };
  frameConfig: {
    zodiacMode: "hybrid-fixed-star-tropical";
    firmamentAnchorVersion: "polaris-spica-fixed-frame-v2";
    obliquityMode: "zero-tilt-equatorial-aligned";
    precessionMode: "none-fixed-firmament";
    houseSystem: "equal-house-ascendant";
    engineVersion: "firmament-master-2026.1";
  };
  baseCelestialState: {
    julianDay: number;
    utc: string;
    ascendant: ChartRow;
    midheaven?: ChartRow | null;
    descendant?: ChartRow | null;
    northNode: ChartRow;
    southNode: ChartRow;
    planets: ChartRow[];
    houses: Array<{ house: number; sign: string; cusp: number; degreeDisplay: string }>;
  };
  godView: {
    description: string;
    cosmicFrame: "fixed-aries-1-to-pisces-12";
    polarisCenter: boolean;
    placements: Array<{
      body: string;
      longitude: number;
      display: string;
      godHouse: number;
      sign: string;
    }>;
  };
  agentView: {
    description: string;
    ascendantAnchor: string;
    houseSystem: "equal-house-from-ascendant";
    placements: Array<{
      body: string;
      longitude: number;
      display: string;
      agentHouse: number;
      sign: string;
    }>;
    frameRelationships: Array<{
      body: string;
      longitude: number;
      display: string;
      godHouse: number;
      agentHouse: number;
      relationship: string;
    }>;
  };
  natal?: ChartResult;
  transit?: {
    transitInstantUtc: string;
    planets: ChartRow[];
    aspectsToNatal: Array<{
      transitBody: string;
      natalBody: string;
      aspect: string;
      orb: number;
      nature: "harmonic" | "friction" | "dynamic";
    }>;
  };
  layers: Record<string, LayerRecord>;
  methodExecutionLedger: LayerRecord[];
  validation: {
    complete: boolean;
    errors: string[];
    warnings: string[];
    totalMethods: number;
    computedWithResultCount: number;
  };
}

export function getLayer<T = unknown>(
  snapshot: UnifiedMasterChartSnapshot,
  layerId: string
): LayerRecord<T> | undefined {
  return snapshot.layers[layerId] as LayerRecord<T> | undefined;
}

export function getEvidence(
  snapshot: UnifiedMasterChartSnapshot,
  evidenceId: string
): LayerRecord | undefined {
  return snapshot.methodExecutionLedger.find(l =>
    l.evidenceIds.includes(evidenceId)
  );
}

export function getModeView(
  snapshot: UnifiedMasterChartSnapshot,
  mode: "god" | "agent" | "shared"
) {
  if (mode === "god") return snapshot.godView;
  if (mode === "agent") return snapshot.agentView;
  return { godView: snapshot.godView, agentView: snapshot.agentView };
}
