import { createRequire } from "node:module";
import type { Body } from "astronomy-engine";
import { calculateRestoredTerritorial, type TerritorialEvidence } from "./territorialStack";

const require = createRequire(import.meta.url);
const Astronomy = require("astronomy-engine") as typeof import("astronomy-engine");

export const GAME_TYPES = ["MLB", "NBA", "NFL", "boxing"] as const;
export type GameType = (typeof GAME_TYPES)[number];
export const DOME_MODELS = ["polaris-fixed-ra", "azimuth", "fixed-ecliptic", "unified-ephemeris", "fixed-j2000-kp"] as const;
export type DomeModel = (typeof DOME_MODELS)[number];
export type Side = "ascendant" | "descendant" | "neutral";
export type Allegiance = "supports" | "opposes" | "neutral";

export const ASCENDANT_CLUSTER = [1, 3, 6, 10, 11] as const;
export const DESCENDANT_CLUSTER = [7, 9, 12, 4, 5] as const;
export const NEUTRAL_HOUSES = [2, 8] as const;
export const NAKSHATRA_ARC_MINUTES = 800;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
const DASHA_YEARS: Record<(typeof DASHA_SEQUENCE)[number], number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const BODY_BY_PLANET: Record<string, Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
};

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"] as const;

/**
 * Permanent Pure Clock configuration. The Royal Star rotation is calibrated once
 * from the supplied fixed J2000 RA values and is never recomputed per chart.
 */
export const FIRMAMENT_CONSTANTS = Object.freeze({
  royalStarTargets: Object.freeze({ Aldebaran: 45, Regulus: 135, Antares: 225, Fomalhaut: 315 }),
  royalStarJ2000RA: Object.freeze({ Aldebaran: 68.98, Regulus: 152.09, Antares: 247.35, Fomalhaut: 344.41 }),
  royalStarCalibrationDegrees: 0,
  royalStarToleranceDegrees: 6.25,
  nodeObliquityDegrees: 0,
  fixedJ2000ObliquityDegrees: 0,
  houseSizeDegrees: 30,
});

export type GameInput = {
  teamA: string;
  teamB: string;
  location: string;
  coordinates?: { latitude: number; longitude: number };
  gameType: GameType;
  startTime: Date;
};

export type KP249Entry = {
  number: number;
  startLongitude: number;
  endLongitude: number;
  nakshatra: string;
  starLord: string;
  subLord: string;
};

export type PlanetReading = {
  planet: string;
  ofDateEclipticLongitude: number;
  tropicalLongitude: number;
  fixedJ2000EclipticLongitude: number;
  kpLongitude: number;
  kpCoordinateFrame: "of-date-ecliptic-with-fixed-kp-offset" | "raw-of-date-ecliptic" | "fixed-j2000-ecliptic";
  j2000RaDegrees: number;
  j2000DecDegrees: number;
  firmamentRA: number;
  firmamentHouse: number;
  firmamentDegreeInHouse: number;
  degreeInSign: number;
  localSiderealTime: number;
  raHours: number;
  decDegrees: number;
  hourAngle: number;
  azimuth: number;
  altitude: number;
  azimuthDomeDelta: number;
  azimuthHouse: number;
  azimuthDegreeInHouse: number;
  eclipticHouse: number;
  eclipticDegreeInHouse: number;
  isRetrograde: boolean;
  house: number;
  sign: string;
  degreeInHouse: number;
  nakshatra: string;
  pada: 1 | 2 | 3 | 4;
  starLord: string;
  subLord: string;
};

export type HouseReading = {
  house: number;
  cluster: Side;
  cuspLongitude: number;
  sign: string;
  starLord: string;
  pada: 1 | 2 | 3 | 4;
  subLord: string;
  subLordHouse: number;
  subLordAllegiance: Allegiance;
};

export type LayerVerdict = {
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | "TIE";
  rationale: string[];
  evidence?: TerritorialEvidence;
  clusterDensity?: KPClusterDensityEvidence;
};

export type KPClusterDensityEvidence = {
  coordinateFrame: "fixed-j2000-ecliptic";
  thresholdPercent: number;
  ascendant: { houses: number[]; densityPercent: number; normalizedPeerScore: number; cuspSubLords: Array<{ house: number; subLord: string; connections: number; significations: number[] }> };
  descendant: { houses: number[]; densityPercent: number; normalizedPeerScore: number; cuspSubLords: Array<{ house: number; subLord: string; connections: number; significations: number[] }> };
  differentialPercent: number;
  result: "ASCENDANT" | "DESCENDANT" | "NEUTRAL";
};

export type KPSubSubDetails = {
  adjustedLongitude: number;
  nakshatra: string;
  starLord: string;
  subLord: string;
  subSubLord: string;
  subStartLongitude: number;
  subEndLongitude: number;
  subSubStartLongitude: number;
  subSubEndLongitude: number;
  subWidthDegrees: number;
  subSubWidthDegrees: number;
  vimshottariSequence: string[];
  calculationPrecision: "float64-degrees";
  boundaryRule: "[start,end)";
};

export type KPIntervalSubdivision = {
  lord: string;
  startLongitude: number;
  endLongitude: number;
  widthDegrees: number;
};

export type KPFamilyDirection = "favorable" | "unfavorable" | "neutral";
export type KPResonanceState = "STRONG_REINFORCEMENT" | "REINFORCEMENT" | "NEUTRAL" | "WEAKENING" | "CONTRADICTION";
export type KPFamilySupport = { significations: number[]; favorableHouses: number[]; opposingHouses: number[]; direction: KPFamilyDirection; score: number };

export type KPResonanceConfig = {
  enabled: boolean;
  closeTerritorialMargin: number;
  subLordWeight: number;
  resonanceModifiers: Record<KPResonanceState, number>;
  familyCompatibilityRules: {
    strongReinforcementRequiresSharedFavorableHouse: boolean;
    contradictionRequiresExclusiveOpposition: boolean;
  };
};

export type KPCuspResonanceAudit = {
  house: number;
  teamSide: "A" | "B";
  cuspLongitude: number;
  starLord: string;
  subLord: string;
  subLordInterval: { startLongitude: number; endLongitude: number; widthDegrees: number };
  subLordFamily: { significations: number[]; favorableHouses: number[]; opposingHouses: number[]; direction: KPFamilyDirection; score: number };
  subSubLord: string;
  subSubLordInterval: { startLongitude: number; endLongitude: number; widthDegrees: number };
  subSubLordFamily: { significations: number[]; favorableHouses: number[]; opposingHouses: number[]; direction: KPFamilyDirection; score: number };
  resonance: KPResonanceState;
  primarySubLordContribution: number;
  subSubLordAdjustment: number;
  finalContribution: number;
};

export type KPTerritorialResonanceExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  config: KPResonanceConfig;
  territorial: { scoreA: number; scoreB: number; margin: number; classification: "CLOSE_TERRITORIAL_MATCHUP" | "CLEAR_TERRITORIAL_ADVANTAGE"; winner: "A" | "B" | "TIE"; evidence: TerritorialEvidence };
  ascendant: { team: string; familyScore: number; subLordScore: number; subSubLordAdjustment: number; finalKPWinFit: number; resonanceStates: Record<KPResonanceState, number>; auditChain: KPCuspResonanceAudit[] };
  descendant: { team: string; familyScore: number; subLordScore: number; subSubLordAdjustment: number; finalKPWinFit: number; resonanceStates: Record<KPResonanceState, number>; auditChain: KPCuspResonanceAudit[] };
  resolution: { kpWinner: "A" | "B" | "TIE"; proposedWinner: "A" | "B" | "TIE"; overallConflict: boolean; activeCombinedWinner: "A" | "B" | "TIE"; note: string };
};

export type AscendantHouseResonanceSimulation = Omit<KPTerritorialResonanceExperiment, "coordinateFrame"> & {
  coordinateFrame: "observer-local-ascendant-whole-sign";
  ascendantLongitude: number;
};

export type FullLayerFrameAudit = {
  coordinateFrame: "fixed-j2000-ecliptic" | "observer-local-ascendant-whole-sign";
  houseRule: "permanent-aries-zero-whole-sign" | "local-moving-ascendant-whole-sign";
  ascendantLongitude?: number;
  territorial: KPTerritorialResonanceExperiment["territorial"];
  kp: Pick<KPTerritorialResonanceExperiment, "ascendant" | "descendant" | "resolution">;
};

export type AgentGodFullLayerExperiment = {
  status: "experimental-read-only";
  input: GameInput;
  config: KPResonanceConfig;
  territorialLayers: readonly [
    "Cluster territory & house-lord placement",
    "Nakshatra influence",
    "Essential dignity",
    "Chaldean Decans",
    "Planetary war",
    "Arabic Lots",
    "Nine-planet influence",
  ];
  god: FullLayerFrameAudit;
  agent: FullLayerFrameAudit;
  boundary: string;
};

export const DEFAULT_KP_RESONANCE_CONFIG: KPResonanceConfig = Object.freeze({
  enabled: false,
  closeTerritorialMargin: 5,
  subLordWeight: 1,
  resonanceModifiers: Object.freeze({
    STRONG_REINFORCEMENT: 0.5,
    REINFORCEMENT: 0.25,
    NEUTRAL: 0,
    WEAKENING: -0.25,
    CONTRADICTION: -0.5,
  }),
  familyCompatibilityRules: Object.freeze({
    strongReinforcementRequiresSharedFavorableHouse: true,
    contradictionRequiresExclusiveOpposition: true,
  }),
});

export type KPSubSubClusterDensityEvidence = {
  coordinateFrame: "fixed-j2000-ecliptic";
  thresholdPercent: number;
  ascendant: { houses: number[]; densityPercent: number; cuspSubSubLords: Array<{ house: number; subLord: string; subSubLord: string; connections: number; significations: number[] }> };
  descendant: { houses: number[]; densityPercent: number; cuspSubSubLords: Array<{ house: number; subLord: string; subSubLord: string; connections: number; significations: number[] }> };
  differentialPercent: number;
  result: "ASCENDANT" | "DESCENDANT" | "NEUTRAL";
};

export type FixedJ2000KPSubSubExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  input: GameInput;
  activeFixedKPWinner: "A" | "B" | "TIE";
  activeCombinedWinner: "A" | "B" | "TIE";
  subSubDensity: KPSubSubClusterDensityEvidence;
};

export type MovingKPMatrixLordTrace = {
  lord: string;
  currentHouse: number;
  significations: number[];
  ascendantConnections: number[];
  descendantConnections: number[];
  supportConnections: number[];
  target: "A" | "B" | "NEUTRAL";
};

export type GodViewMovingKPMatrixRow = {
  house: number;
  cuspLongitude: number;
  cuspSign: string;
  houseRole: "PRIMARY" | "SUPPORT";
  houseWeight: number;
  anchorPlanet: string;
  anchorLongitude: number;
  anchorHouse: number;
  nakshatra: string;
  starLord: MovingKPMatrixLordTrace;
  subLord: MovingKPMatrixLordTrace;
  subSubLord: MovingKPMatrixLordTrace;
  coreValue: -2 | -1 | 0 | 1 | 2;
  finalValue: number;
  state: "A_CONFIRMED" | "B_CONFIRMED" | "A_BLOCKED" | "B_BLOCKED" | "A_UNCONFIRMED" | "B_UNCONFIRMED" | "NEUTRAL";
};

export type GodViewMovingKPMatrixExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  input: GameInput;
  activeFixedKPWinner: "A" | "B" | "TIE";
  activeCombinedWinner: "A" | "B" | "TIE";
  rules: { primaryHouseWeight: number; supportHouseWeight: number; noCallThreshold: number; starLordIsAuditableOnly: true };
  rows: GodViewMovingKPMatrixRow[];
  totals: { ascendantStrength: number; descendantStrength: number; supportContribution: number; net: number; winner: "A" | "B" | "TIE"; noCall: boolean };
};

export type KPFullFamilyEvidence = {
  lord: string;
  occupationHouse: number;
  ownershipHouses: number[];
  nodeDispositor?: { lord: string; sign: string; occupationHouse: number; ownershipHouses: number[] };
  significations: number[];
  ascendantHouses: number[];
  descendantHouses: number[];
  supportHouses: number[];
  target: "A" | "B" | "NEUTRAL";
};

export type GodViewFullKPFamilyRow = {
  house: number;
  cuspLongitude: number;
  cuspSign: string;
  fixedCusp: { signLord: string; starLord: string; subLord: string; subSubLord: string };
  cuspSignLord: KPFullFamilyEvidence;
  cuspStarLord: KPFullFamilyEvidence;
  cuspSubLord: KPFullFamilyEvidence;
  cuspSubSubLord: KPFullFamilyEvidence;
  movingAnchor: {
    planet: string;
    longitude: number;
    house: number;
    nakshatra: string;
    starLord: KPFullFamilyEvidence;
    subLord: KPFullFamilyEvidence;
    subSubLord: KPFullFamilyEvidence;
  };
  cuspConnection: { starLordMatches: boolean; subLordMatches: boolean; subSubLordMatches: boolean; movingSubSignifiesCusp: boolean; movingSubSubSignifiesCusp: boolean };
};

export type GodViewFullKPFamilyExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  input: GameInput;
  activeFixedKPWinner: "A" | "B" | "TIE";
  activeCombinedWinner: "A" | "B" | "TIE";
  method: "occupation-ownership-star-sub-cusp-subsub";
  rows: GodViewFullKPFamilyRow[];
};

export type KPFamilyScoreContribution = {
  label: string;
  lord: string;
  target: "A" | "B" | "NEUTRAL";
  baseWeight: number;
  supportContribution: number;
  total: number;
};

export type GodViewPerCuspFamilyScoreRow = {
  house: number;
  cuspSign: string;
  cuspFamily: "A" | "B" | "SUPPORT";
  sourceContributions: KPFamilyScoreContribution[];
  connectionContributions: KPFamilyScoreContribution[];
  sourceSubtotal: number;
  connectionSubtotal: number;
  total: number;
};

export type GodViewPerCuspFamilyScoreExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  input: GameInput;
  activeFixedKPWinner: "A" | "B" | "TIE";
  activeCombinedWinner: "A" | "B" | "TIE";
  rules: { sourceWeights: Record<string, number>; supportHouseIncrement: number; connectionBonuses: Record<string, number>; noCallThreshold: number };
  rows: GodViewPerCuspFamilyScoreRow[];
  totals: { ascendantStrength: number; descendantStrength: number; supportContribution: number; net: number; winner: "A" | "B" | "TIE"; noCall: boolean };
};

export type GodViewDeduplicatedAnchorGroup = {
  anchor: string;
  memberHouses: number[];
  movingChain: { starLord: string; subLord: string; subSubLord: string };
  movingContributions: KPFamilyScoreContribution[];
  selectedConnections: KPFamilyScoreContribution[];
  total: number;
};

export type GodViewDeduplicatedAnchorScoreExperiment = {
  status: "experimental-read-only";
  coordinateFrame: "fixed-j2000-ecliptic";
  input: GameInput;
  activeFixedKPWinner: "A" | "B" | "TIE";
  activeCombinedWinner: "A" | "B" | "TIE";
  rules: GodViewPerCuspFamilyScoreExperiment["rules"] & { movingAnchorPolicy: "count-once-per-planet" };
  fixedRows: Array<{ house: number; cuspSign: string; cuspFamily: "A" | "B" | "SUPPORT"; fixedContributions: KPFamilyScoreContribution[]; total: number }>;
  anchorGroups: GodViewDeduplicatedAnchorGroup[];
  totals: { fixedSubtotal: number; movingAnchorSubtotal: number; net: number; winner: "A" | "B" | "TIE"; noCall: boolean };
};

export type Prediction = {
  input: GameInput;
  domeModel: DomeModel;
  venue: { label: string; latitude: number; longitude: number; inferred: boolean };
  localSiderealTime: number;
  kpAyanamsa: number;
  ascendantLongitude: number;
  planets: PlanetReading[];
  houses: HouseReading[];
  territorial: LayerVerdict;
  kpStellar: LayerVerdict;
  combined: LayerVerdict & { confidence: number; agreement: "AGREE" | "DIVERGE" | "TIE" };
};

const KNOWN_VENUES: Array<{ keys: string[]; label: string; latitude: number; longitude: number }> = [
  { keys: ["baltimore", "camden yards"], label: "Baltimore, MD", latitude: 39.2838, longitude: -76.6216 },
  { keys: ["philadelphia", "citizens bank"], label: "Philadelphia, PA", latitude: 39.9061, longitude: -75.1665 },
  { keys: ["new york", "yankee", "citi field", "madison square"], label: "New York, NY", latitude: 40.7128, longitude: -74.006 },
  { keys: ["los angeles", "anaheim", "dodger", "crypto"], label: "Los Angeles, CA", latitude: 34.0522, longitude: -118.2437 },
  { keys: ["boston", "fenway"], label: "Boston, MA", latitude: 42.3601, longitude: -71.0589 },
  { keys: ["chicago", "wrigley", "soldier field"], label: "Chicago, IL", latitude: 41.8781, longitude: -87.6298 },
  { keys: ["las vegas", "t-mobile", "allegiant"], label: "Las Vegas, NV", latitude: 36.1699, longitude: -115.1398 },
];

function normalize(value: number) {
  return ((value % 360) + 360) % 360;
}

function hashLocation(value: string) {
  return Array.from(value.toLowerCase()).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
}

export function resolveVenue(location: string) {
  const normalized = location.toLowerCase();
  const known = KNOWN_VENUES.find((venue) => venue.keys.some((key) => normalized.includes(key)));
  if (known) return { ...known, inferred: false };
  const seed = hashLocation(location || "default");
  return {
    label: location || "Unspecified venue",
    latitude: Number((24 + (seed % 2500) / 100).toFixed(4)),
    longitude: Number((-124 + ((seed >>> 8) % 5700) / 100).toFixed(4)),
    inferred: true,
  };
}

/** Exact KP Sub-Lord arc in arc-minutes: Dasha years / 120 × 800. */
export function subLordArcMinutes(planet: (typeof DASHA_SEQUENCE)[number]) {
  return (DASHA_YEARS[planet] / 120) * NAKSHATRA_ARC_MINUTES;
}

/**
 * The 27×9 Sub divisions create 243 star/sub segments. Six segments cross sign
 * boundaries and are split at the boundary, yielding the published 249-entry KP
 * horary map. No equal-width approximation is used.
 */
export function buildKP249Lookup(): KP249Entry[] {
  const rawEntries: Omit<KP249Entry, "number">[] = [];
  for (let nakshatraIndex = 0; nakshatraIndex < 27; nakshatraIndex += 1) {
    const nakshatraStart = nakshatraIndex * (NAKSHATRA_ARC_MINUTES / 60);
    const starLord = DASHA_SEQUENCE[nakshatraIndex % DASHA_SEQUENCE.length];
    const firstSubIndex = DASHA_SEQUENCE.indexOf(starLord);
    let segmentStart = nakshatraStart;
    for (let offset = 0; offset < DASHA_SEQUENCE.length; offset += 1) {
      const subLord = DASHA_SEQUENCE[(firstSubIndex + offset) % DASHA_SEQUENCE.length];
      const segmentEnd = segmentStart + subLordArcMinutes(subLord) / 60;
      const boundaries = [segmentStart];
      const firstSignBoundary = Math.ceil(segmentStart / 30) * 30;
      for (let boundary = firstSignBoundary; boundary < segmentEnd - 1e-10; boundary += 30) {
        if (boundary > segmentStart + 1e-10) boundaries.push(boundary);
      }
      boundaries.push(segmentEnd);
      for (let index = 0; index < boundaries.length - 1; index += 1) {
        rawEntries.push({
          startLongitude: boundaries[index],
          endLongitude: boundaries[index + 1],
          nakshatra: NAKSHATRAS[nakshatraIndex],
          starLord,
          subLord,
        });
      }
      segmentStart = segmentEnd;
    }
  }
  return rawEntries.map((entry, index) => ({ ...entry, number: index + 1 }));
}

export const KP_249_LOOKUP = buildKP249Lookup();

/**
 * The fixed-dome KP reference is the raw permanent dome longitude. No
 * ayanamsa, precession, nutation, or obliquity correction is applied.
 */
export function kpAyanamsa(_date: Date) {
  // Retained as a compatibility export; the fixed-dome model has no ayanamsa.
  return 0;
}

export function kpDetailsFromTropicalLongitude(tropicalLongitude: number, date: Date) {
  return kpDetailsFromCanonicalLongitude(tropicalLongitude, date, false);
}

/**
 * Stellar lookup from the one canonical dome longitude. When `applyKpShift` is
 * false, raw ephemeris longitude is used unchanged for dome, Nakshatra, Pada,
 * Star Lord, and Sub-Lord—no secondary coordinate is created.
 */
export function kpDetailsFromCanonicalLongitude(longitude: number, _date: Date, _applyKpShift: boolean) {
  const adjustedLongitude = normalize(longitude);
  const entry = KP_249_LOOKUP.find((item) => adjustedLongitude >= item.startLongitude - 1e-10 && adjustedLongitude < item.endLongitude - 1e-10)
    ?? KP_249_LOOKUP[KP_249_LOOKUP.length - 1];
  const nakshatraArc = NAKSHATRA_ARC_MINUTES / 60;
  const pada = (Math.floor((adjustedLongitude % nakshatraArc) / (nakshatraArc / 4)) + 1) as 1 | 2 | 3 | 4;
  return { ...entry, adjustedLongitude, pada };
}

/** Create the nine exact Vimshottari-proportional children of one parent interval. */
export function subdivideKPInterval(startLongitude: number, endLongitude: number, startingLord: (typeof DASHA_SEQUENCE)[number]): KPIntervalSubdivision[] {
  const firstIndex = DASHA_SEQUENCE.indexOf(startingLord);
  const width = endLongitude - startLongitude;
  let cursor = startLongitude;
  return DASHA_SEQUENCE.map((_, offset) => {
    const lord = DASHA_SEQUENCE[(firstIndex + offset) % DASHA_SEQUENCE.length];
    const next = offset === DASHA_SEQUENCE.length - 1 ? endLongitude : cursor + (width * DASHA_YEARS[lord] / 120);
    const subdivision = { lord, startLongitude: cursor, endLongitude: next, widthDegrees: next - cursor };
    cursor = next;
    return subdivision;
  });
}

function containingKPSubdivision(longitude: number, subdivisions: KPIntervalSubdivision[]) {
  return subdivisions.find((subdivision) => longitude >= subdivision.startLongitude - 1e-10 && longitude < subdivision.endLongitude - 1e-10)
    ?? subdivisions[subdivisions.length - 1]!;
}

/**
 * Recursively divides the located KP Sub-Lord span by the same Vimshottari
 * proportions. The sequence begins with the current Sub-Lord, exactly as a
 * Nakshatra's Sub-Lord sequence begins with its Star Lord. This is an
 * experimental inspection helper; it does not participate in active verdicts.
 */
export function kpSubSubDetailsFromCanonicalLongitude(longitude: number, date: Date, applyKpShift: boolean): KPSubSubDetails {
  const adjustedLongitude = applyKpShift ? normalize(longitude + kpAyanamsa(date)) : normalize(longitude);
  const nakshatraArcDegrees = NAKSHATRA_ARC_MINUTES / 60;
  const nakshatraIndex = Math.floor(adjustedLongitude / nakshatraArcDegrees) % NAKSHATRAS.length;
  const nakshatraStart = nakshatraIndex * nakshatraArcDegrees;
  const starLord = DASHA_SEQUENCE[nakshatraIndex % DASHA_SEQUENCE.length];
  const sub = containingKPSubdivision(adjustedLongitude, subdivideKPInterval(nakshatraStart, nakshatraStart + nakshatraArcDegrees, starLord));
  const subSubDivisions = subdivideKPInterval(sub.startLongitude, sub.endLongitude, sub.lord as (typeof DASHA_SEQUENCE)[number]);
  const subSub = containingKPSubdivision(adjustedLongitude, subSubDivisions);
  return {
    adjustedLongitude,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    starLord,
    subLord: sub.lord,
    subSubLord: subSub.lord,
    subStartLongitude: sub.startLongitude,
    subEndLongitude: sub.endLongitude,
    subSubStartLongitude: subSub.startLongitude,
    subSubEndLongitude: subSub.endLongitude,
    subWidthDegrees: sub.widthDegrees,
    subSubWidthDegrees: subSub.widthDegrees,
    vimshottariSequence: subSubDivisions.map((division) => division.lord),
    calculationPrecision: "float64-degrees",
    boundaryRule: "[start,end)",
  };
}

/** East = H1 / Aries; 30° sectors proceed counter-clockwise through the fixed dome. */
export function fixedDomeHouseFromAzimuth(azimuth: number) {
  const delta = normalize(90 - azimuth);
  const house = Math.floor(delta / 30) + 1;
  return { house, degreeInHouse: delta % 30, sign: SIGNS[house - 1] };
}

/**
 * Polaris-centered Pure Clock sector map. `firmamentRA` is a permanent J2000
 * equatorial angle plus the one-time Royal Star rotation; no venue, LST, horizon,
 * altitude, or azimuth value participates in this house calculation.
 */
export function fixedFirmamentHouseFromRA(firmamentRA: number) {
  // Compatibility name retained; the fixed dome maps raw longitude directly.
  const normalizedLongitude = normalize(firmamentRA);
  const house = Math.floor(normalizedLongitude / FIRMAMENT_CONSTANTS.houseSizeDegrees) + 1;
  return { house, degreeInHouse: normalizedLongitude % FIRMAMENT_CONSTANTS.houseSizeDegrees, sectorSign: SIGNS[house - 1] };
}

/**
 * Literal Fixed Ecliptic Dome: raw ephemeris longitude is the permanent
 * sign-house position. H1/Aries begins at 0° and advances in fixed 30° sectors.
 * This function deliberately does not use azimuth, LST, or venue coordinates.
 */
export function fixedEclipticHouseFromLongitude(longitude: number) {
  const normalizedLongitude = normalize(longitude);
  const house = Math.floor(normalizedLongitude / 30) + 1;
  return { house, degreeInHouse: normalizedLongitude % 30, sign: SIGNS[house - 1] };
}

export function clusterForHouse(house: number): Side {
  if ((ASCENDANT_CLUSTER as readonly number[]).includes(house)) return "ascendant";
  if ((DESCENDANT_CLUSTER as readonly number[]).includes(house)) return "descendant";
  return "neutral";
}

export function allegiance(planetHouse: number, targetCluster: Side): Allegiance {
  const actual = clusterForHouse(planetHouse);
  if (actual === "neutral") return "neutral";
  return actual === targetCluster ? "supports" : "opposes";
}

function signForLongitude(longitude: number) {
  return SIGNS[Math.floor(normalize(longitude) / 30)];
}

export function calculateAscendantLongitude(date: Date, _latitude: number, longitude: number) {
  // Local horizon intersection with the permanent zero-tilt dome. Latitude
  // drops out when the dome equator and ecliptic are coincident; longitude and
  // time still make the local Ascendant individualized.
  const gstHours = Astronomy.SiderealTime(Astronomy.MakeTime(date));
  return normalize(gstHours * 15 + longitude + 270);
}

function nodeLongitude(date: Date) {
  const days = (date.getTime() - new Date("2000-01-01T12:00:00Z").getTime()) / 86400000;
  return normalize(125.04452 - 0.0529538083 * days);
}

function nodeRaDec(longitude: number) {
  return { raHours: normalize(longitude) / 15, decDegrees: 0 };
}

function geocentricEclipticLongitude(body: Body, date: Date) {
  return fixedDomeLongitude(body, date);
}

function fixedDomeLongitude(body: Body, date: Date) {
  const vector = Astronomy.GeoVector(body, date, false);
  return normalize(Math.atan2(vector.y, vector.x) * 180 / Math.PI);
}

/** Geocentric fixed J2000 equatorial coordinates: no observer or of-date rotation. */
function geocentricJ2000Equatorial(body: Body, date: Date) {
  const sphere = Astronomy.SphereFromVector(Astronomy.GeoVector(body, date, false));
  return { raDegrees: normalize(sphere.lon), decDegrees: sphere.lat };
}

/**
 * Converts an EQJ/J2000 geocentric vector into a permanent J2000 ecliptic
 * longitude. This intentionally avoids the library's Ecliptic() helper,
 * which precesses/nutates to the true ecliptic and true obliquity of date.
 */
export function fixedJ2000EclipticLongitudeFromEquatorialVector(vector: { x: number; y: number; z: number }) {
  // The fixed dome deliberately projects onto a zero-tilt X/Y plane.
  return normalize(Math.atan2(vector.y, vector.x) * 180 / Math.PI);
}

/** Geocentric J2000 ecliptic longitude with fixed J2000 obliquity and no aberration. */
function geocentricFixedJ2000EclipticLongitude(body: Body, date: Date) {
  return fixedDomeLongitude(body, date);
}

function firmamentCoordinateFromJ2000RA(raDegrees: number) {
  return normalize(raDegrees);
}

function buildPlanetReadings(date: Date, venue: { latitude: number; longitude: number }, domeModel: DomeModel = "azimuth") {
  const localSiderealTime = normalize(Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15 + venue.longitude);
  const ascendantLongitude = calculateAscendantLongitude(date, venue.latitude, venue.longitude);
  const ascendantSignStart = Math.floor(ascendantLongitude / 30) * 30;
  const usesFixedJ2000KP = domeModel === "fixed-j2000-kp";
  const readings: PlanetReading[] = [];
  for (const planet of PLANETS) {
    const ofDateLongitude = planet === "Rahu" ? nodeLongitude(date) : planet === "Ketu" ? normalize(nodeLongitude(date) + 180) : geocentricEclipticLongitude(BODY_BY_PLANET[planet], date);
    const fixedJ2000EclipticLongitude = planet === "Rahu" ? nodeLongitude(date) : planet === "Ketu" ? normalize(nodeLongitude(date) + 180) : geocentricFixedJ2000EclipticLongitude(BODY_BY_PLANET[planet], date);
    const nextDate = new Date(date.getTime() + 86400000);
    const followingOfDateLongitude = planet === "Rahu" ? nodeLongitude(nextDate) : planet === "Ketu" ? normalize(nodeLongitude(nextDate) + 180) : geocentricEclipticLongitude(BODY_BY_PLANET[planet], nextDate);
    const followingFixedJ2000EclipticLongitude = planet === "Rahu" ? nodeLongitude(nextDate) : planet === "Ketu" ? normalize(nodeLongitude(nextDate) + 180) : geocentricFixedJ2000EclipticLongitude(BODY_BY_PLANET[planet], nextDate);
    const tropicalLongitude = usesFixedJ2000KP ? fixedJ2000EclipticLongitude : ofDateLongitude;
    const followingLongitude = usesFixedJ2000KP ? followingFixedJ2000EclipticLongitude : followingOfDateLongitude;
    const j2000Equatorial = planet === "Rahu" || planet === "Ketu"
      ? (() => {
          const node = nodeRaDec(usesFixedJ2000KP ? fixedJ2000EclipticLongitude : ofDateLongitude);
          return { raDegrees: node.raHours * 15, decDegrees: node.decDegrees };
        })()
      : geocentricJ2000Equatorial(BODY_BY_PLANET[planet], date);
    const equatorial = { raHours: j2000Equatorial.raDegrees / 15, decDegrees: j2000Equatorial.decDegrees };
    const horizontal = { azimuth: 0, altitude: 0 };
    const azimuthDome = fixedDomeHouseFromAzimuth(horizontal.azimuth);
    const eclipticDome = fixedEclipticHouseFromLongitude(ofDateLongitude);
    const fixedJ2000EclipticDome = fixedEclipticHouseFromLongitude(fixedJ2000EclipticLongitude);
    const firmamentRA = firmamentCoordinateFromJ2000RA(j2000Equatorial.raDegrees);
    const firmamentDome = fixedFirmamentHouseFromRA(firmamentRA);
    // Compatibility model names remain in the API, but every active model now
    // resolves to the same permanent raw fixed-dome sectors.
    void domeModel;
    const localHouse = fixedEclipticHouseFromLongitude(fixedJ2000EclipticLongitude - ascendantSignStart);
    const dome = { ...fixedJ2000EclipticDome, house: localHouse.house, degreeInHouse: localHouse.degreeInHouse };
    const stellar = kpDetailsFromCanonicalLongitude(tropicalLongitude, date, domeModel !== "unified-ephemeris" && !usesFixedJ2000KP);
    readings.push({
      planet,
      ofDateEclipticLongitude: ofDateLongitude,
      tropicalLongitude,
      fixedJ2000EclipticLongitude,
      kpLongitude: stellar.adjustedLongitude,
      kpCoordinateFrame: usesFixedJ2000KP
        ? "fixed-j2000-ecliptic"
        : domeModel === "unified-ephemeris"
          ? "raw-of-date-ecliptic"
          : "of-date-ecliptic-with-fixed-kp-offset",
      j2000RaDegrees: j2000Equatorial.raDegrees,
      j2000DecDegrees: j2000Equatorial.decDegrees,
      firmamentRA,
      firmamentHouse: firmamentDome.house,
      firmamentDegreeInHouse: firmamentDome.degreeInHouse,
      degreeInSign: usesFixedJ2000KP ? fixedJ2000EclipticDome.degreeInHouse : eclipticDome.degreeInHouse,
      localSiderealTime,
      raHours: equatorial.raHours,
      decDegrees: equatorial.decDegrees,
      hourAngle: ((localSiderealTime - equatorial.raHours * 15 + 540) % 360) - 180,
      azimuth: horizontal.azimuth,
      altitude: horizontal.altitude,
      azimuthDomeDelta: normalize(90 - horizontal.azimuth),
      azimuthHouse: azimuthDome.house,
      azimuthDegreeInHouse: azimuthDome.degreeInHouse,
      eclipticHouse: eclipticDome.house,
      eclipticDegreeInHouse: eclipticDome.degreeInHouse,
      isRetrograde: ((followingLongitude - tropicalLongitude + 540) % 360) - 180 < 0,
      house: dome.house,
      sign: signForLongitude(tropicalLongitude),
      degreeInHouse: dome.degreeInHouse,
      nakshatra: stellar.nakshatra,
      pada: stellar.pada,
      starLord: stellar.starLord,
      subLord: stellar.subLord,
    });
  }
  return readings;
}

/**
 * Public fixed-cosmic placement helper for natal and transit readings. It uses
 * moving geocentric bodies in the permanent J2000 ecliptic frame; venue values
 * are neutral placeholders and cannot affect returned fixed placements.
 */
export function generateFixedJ2000PlanetReadings(date: Date) {
  return buildPlanetReadings(date, { latitude: 0, longitude: 0 }, "fixed-j2000-kp");
}

function layerWinner(scoreA: number, scoreB: number): "A" | "B" | "TIE" {
  if (Math.abs(scoreA - scoreB) < 0.001) return "TIE";
  return scoreA > scoreB ? "A" : "B";
}

function territorialVerdict(planets: PlanetReading[], ascendantLongitude: number, lotHouseFromLongitude: (longitude: number) => number): LayerVerdict {
  const restored = calculateRestoredTerritorial(planets, ascendantLongitude, lotHouseFromLongitude);
  const rationale = restored.evidence.layers.map((layer) => `${layer.name}: ${layer.scoreA >= 0 ? "+" : ""}${layer.scoreA.toFixed(2)} Ascendant / ${layer.scoreB >= 0 ? "+" : ""}${layer.scoreB.toFixed(2)} Descendant. ${layer.detail}`);
  return { scoreA: restored.scoreA, scoreB: restored.scoreB, winner: layerWinner(restored.scoreA, restored.scoreB), rationale, evidence: restored.evidence };
}

function fixedClusterSignifications(planet: string, positionHouse: number) {
  const significations = new Set<number>([positionHouse]);
  const ownership: Record<string, number[]> = {
    Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11], Rahu: [11], Ketu: [8],
  };
  ownership[planet]?.forEach((house) => significations.add(house));
  significations.add(((positionHouse + 5) % 12) + 1);
  if (planet === "Rahu" || planet === "Ketu") {
    [4, 6, 8].forEach((offset) => significations.add(((positionHouse + offset - 1) % 12) + 1));
  }
  return Array.from(significations).sort((left, right) => left - right);
}

function clusterDensityVerdict(planets: PlanetReading[]): LayerVerdict {
  const densityFor = (cluster: readonly number[]) => {
    const cuspSubLords = cluster.map((house) => {
      const cusp = kpDetailsFromCanonicalLongitude((house - 1) * 30, new Date("2000-01-01T12:00:00Z"), false);
      const placement = planets.find((planet) => planet.planet === cusp.subLord) ?? planets[0]!;
      const significations = fixedClusterSignifications(cusp.subLord, placement.house);
      const connections = significations.filter((signification) => cluster.includes(signification)).length;
      return { house, subLord: cusp.subLord, connections, significations };
    });
    const densityPercent = Number((cuspSubLords.reduce((total, cusp) => total + cusp.connections, 0) / (cluster.length ** 2) * 100).toFixed(2));
    return { houses: [...cluster], densityPercent, normalizedPeerScore: Number((densityPercent / 10).toFixed(2)), cuspSubLords };
  };
  const ascendant = densityFor(ASCENDANT_CLUSTER);
  const descendant = densityFor(DESCENDANT_CLUSTER);
  const differentialPercent = Number((descendant.densityPercent - ascendant.densityPercent).toFixed(2));
  const result = differentialPercent > 2 ? "DESCENDANT" : differentialPercent < -2 ? "ASCENDANT" : "NEUTRAL";
  const evidence: KPClusterDensityEvidence = {
    coordinateFrame: "fixed-j2000-ecliptic",
    thresholdPercent: 2,
    ascendant,
    descendant,
    differentialPercent,
    result,
  };
  return {
    scoreA: ascendant.normalizedPeerScore,
    scoreB: descendant.normalizedPeerScore,
    winner: result === "ASCENDANT" ? "A" : result === "DESCENDANT" ? "B" : "TIE",
    rationale: [
      `Fixed J2000 KP cluster density: Ascendant ${ascendant.densityPercent.toFixed(2)}% across H1/H3/H6/H10/H11; Descendant ${descendant.densityPercent.toFixed(2)}% across H7/H9/H12/H4/H5.`,
      `Descendant minus Ascendant density = ${differentialPercent >= 0 ? "+" : ""}${differentialPercent.toFixed(2)}%; the fixed ±2.00% threshold resolves ${result.toLowerCase()}.`,
      "Each cusp uses its fixed Nakshatra Sub-Lord; significations combine fixed-sector occupancy, traditional fixed-sign rulership, seventh aspect, and node fifth/seventh/ninth aspects. Density is retained as raw evidence and divided by 10 only for equal-peer synthesis with Territorial Control.",
    ],
    clusterDensity: evidence,
  };
}

function subSubClusterDensityExperiment(planets: PlanetReading[]): KPSubSubClusterDensityEvidence {
  const densityFor = (cluster: readonly number[]) => {
    const cuspSubSubLords = cluster.map((house) => {
      const cusp = kpSubSubDetailsFromCanonicalLongitude((house - 1) * 30, new Date("2000-01-01T12:00:00Z"), false);
      const placement = planets.find((planet) => planet.planet === cusp.subSubLord) ?? planets[0]!;
      const significations = fixedClusterSignifications(cusp.subSubLord, placement.house);
      const connections = significations.filter((signification) => cluster.includes(signification)).length;
      return { house, subLord: cusp.subLord, subSubLord: cusp.subSubLord, connections, significations };
    });
    const densityPercent = Number((cuspSubSubLords.reduce((total, cusp) => total + cusp.connections, 0) / (cluster.length ** 2) * 100).toFixed(2));
    return { houses: [...cluster], densityPercent, cuspSubSubLords };
  };
  const ascendant = densityFor(ASCENDANT_CLUSTER);
  const descendant = densityFor(DESCENDANT_CLUSTER);
  const differentialPercent = Number((descendant.densityPercent - ascendant.densityPercent).toFixed(2));
  return {
    coordinateFrame: "fixed-j2000-ecliptic",
    thresholdPercent: 2,
    ascendant,
    descendant,
    differentialPercent,
    result: differentialPercent > 2 ? "DESCENDANT" : differentialPercent < -2 ? "ASCENDANT" : "NEUTRAL",
  };
}

function familySupport(significations: number[], targetSide: "A" | "B"): KPFamilySupport {
  const targetCluster = targetSide === "A" ? ASCENDANT_CLUSTER : DESCENDANT_CLUSTER;
  const opposingCluster = targetSide === "A" ? DESCENDANT_CLUSTER : ASCENDANT_CLUSTER;
  const favorableHouses = significations.filter((house) => targetCluster.includes(house as never));
  const opposingHouses = significations.filter((house) => opposingCluster.includes(house as never));
  const score = favorableHouses.length - opposingHouses.length;
  const direction: KPFamilyDirection = score > 0 ? "favorable" : score < 0 ? "unfavorable" : "neutral";
  return { significations, favorableHouses, opposingHouses, direction, score };
}

function resolveMovingMatrixLord(lord: string, planets: PlanetReading[]): MovingKPMatrixLordTrace {
  const placement = planets.find((planet) => planet.planet === lord) ?? planets[0]!;
  const significations = fixedClusterSignifications(lord, placement.house);
  const ascendantConnections = significations.filter((house) => ASCENDANT_CLUSTER.includes(house as never));
  const descendantConnections = significations.filter((house) => DESCENDANT_CLUSTER.includes(house as never));
  const supportConnections = significations.filter((house) => NEUTRAL_HOUSES.includes(house as never));
  const target = ascendantConnections.length > descendantConnections.length
    ? "A"
    : descendantConnections.length > ascendantConnections.length
      ? "B"
      : "NEUTRAL";
  return { lord, currentHouse: placement.house, significations, ascendantConnections, descendantConnections, supportConnections, target };
}

const FIXED_SIGN_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const FIXED_OWNERSHIP: Record<string, number[]> = {
  Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11],
};

function resolveFullKPFamilyLord(lord: string, planets: PlanetReading[]): KPFullFamilyEvidence {
  const placement = planets.find((planet) => planet.planet === lord) ?? planets[0]!;
  const ownershipHouses = [...(FIXED_OWNERSHIP[lord] ?? [])];
  let nodeDispositor: KPFullFamilyEvidence["nodeDispositor"];
  const significations = new Set<number>([placement.house, ...ownershipHouses]);
  if (lord === "Rahu" || lord === "Ketu") {
    const dispositorLord = FIXED_SIGN_RULERS[placement.sign] ?? "Mars";
    const dispositor = planets.find((planet) => planet.planet === dispositorLord) ?? planets[0]!;
    const dispositorOwnership = [...(FIXED_OWNERSHIP[dispositorLord] ?? [])];
    nodeDispositor = { lord: dispositorLord, sign: placement.sign, occupationHouse: dispositor.house, ownershipHouses: dispositorOwnership };
    significations.add(dispositor.house);
    dispositorOwnership.forEach((house) => significations.add(house));
  }
  const all = Array.from(significations).sort((left, right) => left - right);
  const ascendantHouses = all.filter((house) => ASCENDANT_CLUSTER.includes(house as never));
  const descendantHouses = all.filter((house) => DESCENDANT_CLUSTER.includes(house as never));
  const supportHouses = all.filter((house) => NEUTRAL_HOUSES.includes(house as never));
  const target = ascendantHouses.length > descendantHouses.length
    ? "A"
    : descendantHouses.length > ascendantHouses.length
      ? "B"
      : "NEUTRAL";
  return { lord, occupationHouse: placement.house, ownershipHouses, nodeDispositor, significations: all, ascendantHouses, descendantHouses, supportHouses, target };
}

function movingMatrixCoreValue(subTarget: MovingKPMatrixLordTrace["target"], subSubTarget: MovingKPMatrixLordTrace["target"]) {
  if (subTarget === "A" && subSubTarget === "A") return { coreValue: 2 as const, state: "A_CONFIRMED" as const };
  if (subTarget === "B" && subSubTarget === "B") return { coreValue: -2 as const, state: "B_CONFIRMED" as const };
  if (subTarget === "A" && subSubTarget === "B") return { coreValue: 0 as const, state: "A_BLOCKED" as const };
  if (subTarget === "B" && subSubTarget === "A") return { coreValue: 0 as const, state: "B_BLOCKED" as const };
  if (subTarget === "A") return { coreValue: 1 as const, state: "A_UNCONFIRMED" as const };
  if (subTarget === "B") return { coreValue: -1 as const, state: "B_UNCONFIRMED" as const };
  return { coreValue: 0 as const, state: "NEUTRAL" as const };
}

export function classifyKPResonanceState(subFamily: KPFamilySupport, subSubFamily: KPFamilySupport, config: KPResonanceConfig): KPResonanceState {
  if (subFamily.direction === "neutral" || subSubFamily.direction === "neutral") return "NEUTRAL";
  if (subFamily.direction === subSubFamily.direction) {
    const subHouses = subFamily.direction === "favorable" ? subFamily.favorableHouses : subFamily.opposingHouses;
    const subSubHouses = subSubFamily.direction === "favorable" ? subSubFamily.favorableHouses : subSubFamily.opposingHouses;
    const sharedHouse = subHouses.some((house) => subSubHouses.includes(house));
    return !config.familyCompatibilityRules.strongReinforcementRequiresSharedFavorableHouse || sharedHouse ? "STRONG_REINFORCEMENT" : "REINFORCEMENT";
  }
  const directOpposition = subSubFamily.favorableHouses.length === 0 && subSubFamily.opposingHouses.length >= 2;
  return config.familyCompatibilityRules.contradictionRequiresExclusiveOpposition && directOpposition ? "CONTRADICTION" : "WEAKENING";
}

function emptyResonanceStateCounts(): Record<KPResonanceState, number> {
  return { STRONG_REINFORCEMENT: 0, REINFORCEMENT: 0, NEUTRAL: 0, WEAKENING: 0, CONTRADICTION: 0 };
}

function resolveKPResonanceConfig(override?: Partial<KPResonanceConfig>): KPResonanceConfig {
  return {
    ...DEFAULT_KP_RESONANCE_CONFIG,
    ...override,
    resonanceModifiers: { ...DEFAULT_KP_RESONANCE_CONFIG.resonanceModifiers, ...override?.resonanceModifiers },
    familyCompatibilityRules: { ...DEFAULT_KP_RESONANCE_CONFIG.familyCompatibilityRules, ...override?.familyCompatibilityRules },
  };
}

function resonanceAuditForSide(planets: PlanetReading[], targetSide: "A" | "B", config: KPResonanceConfig, cuspOffset = 0, applyKpShift = false) {
  const cluster = targetSide === "A" ? ASCENDANT_CLUSTER : DESCENDANT_CLUSTER;
  const auditChain = cluster.map((house) => {
    const cuspLongitude = normalize(cuspOffset + (house - 1) * 30);
    const details = kpSubSubDetailsFromCanonicalLongitude(cuspLongitude, new Date("2000-01-01T12:00:00Z"), applyKpShift);
    const subPlacement = planets.find((planet) => planet.planet === details.subLord) ?? planets[0]!;
    const subSubPlacement = planets.find((planet) => planet.planet === details.subSubLord) ?? planets[0]!;
    const subLordFamily = familySupport(fixedClusterSignifications(details.subLord, subPlacement.house), targetSide);
    const subSubLordFamily = familySupport(fixedClusterSignifications(details.subSubLord, subSubPlacement.house), targetSide);
    const resonance = classifyKPResonanceState(subLordFamily, subSubLordFamily, config);
    const primarySubLordContribution = subLordFamily.score * config.subLordWeight;
    const primaryDirection = Math.sign(primarySubLordContribution || subLordFamily.score);
    const subSubLordAdjustment = config.enabled ? primaryDirection * config.resonanceModifiers[resonance] : 0;
    return {
      house,
      teamSide: targetSide,
      cuspLongitude,
      starLord: details.starLord,
      subLord: details.subLord,
      subLordInterval: { startLongitude: details.subStartLongitude, endLongitude: details.subEndLongitude, widthDegrees: details.subWidthDegrees },
      subLordFamily,
      subSubLord: details.subSubLord,
      subSubLordInterval: { startLongitude: details.subSubStartLongitude, endLongitude: details.subSubEndLongitude, widthDegrees: details.subSubWidthDegrees },
      subSubLordFamily,
      resonance,
      primarySubLordContribution,
      subSubLordAdjustment,
      finalContribution: primarySubLordContribution + subSubLordAdjustment,
    } satisfies KPCuspResonanceAudit;
  });
  const resonanceStates = emptyResonanceStateCounts();
  auditChain.forEach((entry) => { resonanceStates[entry.resonance] += 1; });
  return {
    familyScore: auditChain.reduce((sum, entry) => sum + entry.subLordFamily.score, 0),
    subLordScore: auditChain.reduce((sum, entry) => sum + entry.primarySubLordContribution, 0),
    subSubLordAdjustment: auditChain.reduce((sum, entry) => sum + entry.subSubLordAdjustment, 0),
    finalKPWinFit: auditChain.reduce((sum, entry) => sum + entry.finalContribution, 0),
    resonanceStates,
    auditChain,
  };
}

function kpVerdict(houses: HouseReading[], planets: PlanetReading[], domeModel: DomeModel): LayerVerdict {
  if (domeModel === "fixed-j2000-kp") return clusterDensityVerdict(planets);
  let scoreA = 0;
  let scoreB = 0;
  const rationale: string[] = [];
  for (const house of houses.filter((item) => item.cluster !== "neutral")) {
    const points = house.subLordAllegiance === "supports" ? 2 : house.subLordAllegiance === "opposes" ? -2 : 0;
    if (house.cluster === "ascendant") scoreA += points;
    if (house.cluster === "descendant") scoreB += points;
    rationale.push(`H${house.house} cusp ${house.subLord} resolves ${house.subLordAllegiance} through H${house.subLordHouse}.`);
  }
  return { scoreA, scoreB, winner: layerWinner(scoreA, scoreB), rationale };
}

export function generatePredictionForModel(input: GameInput, domeModel: DomeModel): Prediction {
  const venue = input.coordinates
    ? { label: input.location, latitude: input.coordinates.latitude, longitude: input.coordinates.longitude, inferred: false }
    : resolveVenue(input.location);
  const planets = buildPlanetReadings(input.startTime, venue, domeModel);
  const ascendantLongitude = calculateAscendantLongitude(input.startTime, venue.latitude, venue.longitude);
  const ascendantSignStart = Math.floor(ascendantLongitude / 30) * 30;
  const planetsByName = new Map(planets.map((planet) => [planet.planet, planet]));
  const houses = Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const cuspLongitude = (ascendantSignStart + index * 30) % 360;
    const stellar = kpDetailsFromCanonicalLongitude(cuspLongitude, input.startTime, domeModel !== "unified-ephemeris");
    const subLordPlacement = planetsByName.get(stellar.subLord) ?? planets[0];
    const cluster = clusterForHouse(house);
    return {
      house,
      cluster,
      cuspLongitude,
      sign: signForLongitude(cuspLongitude),
      starLord: stellar.starLord,
      pada: stellar.pada,
      subLord: stellar.subLord,
      subLordHouse: subLordPlacement.house,
      subLordAllegiance: cluster === "neutral" ? "neutral" : allegiance(subLordPlacement.house, cluster),
    };
  });
  const lotHouseFromLongitude = (longitude: number) => {
    return fixedEclipticHouseFromLongitude(longitude - ascendantSignStart).house;
  };
  const territorial = territorialVerdict(planets, ascendantLongitude, lotHouseFromLongitude);
  const kpStellar = kpVerdict(houses, planets, domeModel);
  const territorialWeight = 0.4;
  const kpWeight = 0.6;
  const combinedScoreA = territorial.scoreA * territorialWeight + kpStellar.scoreA * kpWeight;
  const combinedScoreB = territorial.scoreB * territorialWeight + kpStellar.scoreB * kpWeight;
  const combinedWinner = layerWinner(combinedScoreA, combinedScoreB);
  const agreement = territorial.winner === "TIE" || kpStellar.winner === "TIE"
    ? "TIE"
    : territorial.winner === kpStellar.winner ? "AGREE" : "DIVERGE";
  const confidence = Math.min(95, Math.round(50 + Math.abs(combinedScoreA - combinedScoreB) * 5 + (agreement === "AGREE" ? 12 : 0)));
  return {
    input,
    domeModel,
    venue,
    localSiderealTime: normalize(Astronomy.SiderealTime(Astronomy.MakeTime(input.startTime)) * 15 + venue.longitude),
    kpAyanamsa: 0,
    ascendantLongitude,
    planets,
    houses,
    territorial,
    kpStellar,
    combined: {
      scoreA: combinedScoreA,
      scoreB: combinedScoreB,
      winner: combinedWinner,
      confidence,
      agreement,
      rationale: [
        "KP Stellar leads the synthesis at 60%; Territorial Control contributes the remaining 40% as an independent challenger layer.",
        agreement === "DIVERGE" ? "The layers diverge; inspect the house-by-house KP chain before treating the call as high-conviction." : "The layers are aligned in the final reading.",
      ],
    },
  };
}

/** Active fixed dome: raw zero-tilt longitude mapped to permanent sectors. */
export function generatePrediction(input: GameInput) {
  return generatePredictionForModel(input, "polaris-fixed-ra");
}

/** Legacy comparison: topocentric azimuth assigned to Fixed Dome sectors. */
export function generateAzimuthLegacyPrediction(input: GameInput) {
  return generatePredictionForModel(input, "azimuth");
}

/** Explicit access to the active Polaris-centered fixed-RA Pure Clock model. */
export function generatePolarisFixedRAPrediction(input: GameInput) {
  return generatePredictionForModel(input, "polaris-fixed-ra");
}

/** Experimental model: raw ephemeris longitude assigned directly to fixed sign-house sectors. */
export function generateFixedEclipticPrediction(input: GameInput) {
  return generatePredictionForModel(input, "fixed-ecliptic");
}

/**
 * Clean literal-ephemeris experiment: one raw longitude is shared by the
 * permanent dome sector and the complete KP stellar chain, with zero offset.
 */
export function generateUnifiedEphemerisPrediction(input: GameInput) {
  return generatePredictionForModel(input, "unified-ephemeris");
}

/**
 * Fixed-Firmament KP Event Engine: moving geocentric bodies projected into a
 * permanent J2000 ecliptic, fixed 0° Aries, fixed Nakshatras, and zero ayanamsa.
 */
export function generateFixedJ2000KPPrediction(input: GameInput) {
  return generatePredictionForModel(input, "fixed-j2000-kp");
}

/**
 * Deeper Fixed J2000 KP inspection path. It remains read-only and does not
 * feed Territorial Control, active Sub-Lord density, or combined scoring.
 */
export function runFixedJ2000KPSubSubExperiment(input: GameInput): FixedJ2000KPSubSubExperiment {
  const activePrediction = generateFixedJ2000KPPrediction(input);
  return {
    status: "experimental-read-only",
    coordinateFrame: "fixed-j2000-ecliptic",
    input,
    activeFixedKPWinner: activePrediction.kpStellar.winner,
    activeCombinedWinner: activePrediction.combined.winner,
    subSubDensity: subSubClusterDensityExperiment(activePrediction.planets),
  };
}

/**
 * Read-only full 12-cusp God View experiment. Cusps stay permanent while each
 * cusp anchor's exact current Star → Sub → Sub–Sub chain refreshes by game time.
 */
export function runGodViewMovingKPMatrixExperiment(input: GameInput): GodViewMovingKPMatrixExperiment {
  const activePrediction = generateFixedJ2000KPPrediction(input);
  const primaryHouseWeight = 1;
  const supportHouseWeight = 0.35;
  const noCallThreshold = 0.5;
  const rows = Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const cuspLongitude = index * 30;
    const cusp = kpSubSubDetailsFromCanonicalLongitude(cuspLongitude, new Date("2000-01-01T12:00:00Z"), false);
    const anchor = activePrediction.planets.find((planet) => planet.planet === cusp.subLord) ?? activePrediction.planets[0]!;
    const moving = kpSubSubDetailsFromCanonicalLongitude(anchor.fixedJ2000EclipticLongitude, input.startTime, false);
    const starLord = resolveMovingMatrixLord(moving.starLord, activePrediction.planets);
    const subLord = resolveMovingMatrixLord(moving.subLord, activePrediction.planets);
    const subSubLord = resolveMovingMatrixLord(moving.subSubLord, activePrediction.planets);
    const { coreValue, state } = movingMatrixCoreValue(subLord.target, subSubLord.target);
    const houseRole = NEUTRAL_HOUSES.includes(house as never) ? "SUPPORT" as const : "PRIMARY" as const;
    const houseWeight = houseRole === "SUPPORT" ? supportHouseWeight : primaryHouseWeight;
    return {
      house,
      cuspLongitude,
      cuspSign: signForLongitude(cuspLongitude),
      houseRole,
      houseWeight,
      anchorPlanet: anchor.planet,
      anchorLongitude: anchor.fixedJ2000EclipticLongitude,
      anchorHouse: anchor.house,
      nakshatra: moving.nakshatra,
      starLord,
      subLord,
      subSubLord,
      coreValue,
      finalValue: Number((coreValue * houseWeight).toFixed(2)),
      state,
    } satisfies GodViewMovingKPMatrixRow;
  });
  const net = Number(rows.reduce((sum, row) => sum + row.finalValue, 0).toFixed(2));
  const ascendantStrength = Number(rows.reduce((sum, row) => sum + Math.max(row.finalValue, 0), 0).toFixed(2));
  const descendantStrength = Number(rows.reduce((sum, row) => sum + Math.max(-row.finalValue, 0), 0).toFixed(2));
  const supportContribution = Number(rows.filter((row) => row.houseRole === "SUPPORT").reduce((sum, row) => sum + row.finalValue, 0).toFixed(2));
  const winner = net > noCallThreshold ? "A" : net < -noCallThreshold ? "B" : "TIE";
  return {
    status: "experimental-read-only",
    coordinateFrame: "fixed-j2000-ecliptic",
    input,
    activeFixedKPWinner: activePrediction.kpStellar.winner,
    activeCombinedWinner: activePrediction.combined.winner,
    rules: { primaryHouseWeight, supportHouseWeight, noCallThreshold, starLordIsAuditableOnly: true },
    rows,
    totals: { ascendantStrength, descendantStrength, supportContribution, net, winner, noCall: winner === "TIE" },
  };
}

/**
 * Full read-only KP family-house audit. It expands every permanent cusp into
 * occupation, ownership, cusp lord, moving anchor-chain, node-dispositor, and
 * Sub–Sub confirmation evidence without adding a new score or public verdict.
 */
export function runGodViewFullKPFamilyExperiment(input: GameInput): GodViewFullKPFamilyExperiment {
  const activePrediction = generateFixedJ2000KPPrediction(input);
  const rows = Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const cuspLongitude = index * 30;
    const fixed = kpSubSubDetailsFromCanonicalLongitude(cuspLongitude, new Date("2000-01-01T12:00:00Z"), false);
    const cuspSign = signForLongitude(cuspLongitude);
    const signLord = FIXED_SIGN_RULERS[cuspSign]!;
    const anchor = activePrediction.planets.find((planet) => planet.planet === fixed.subLord) ?? activePrediction.planets[0]!;
    const moving = kpSubSubDetailsFromCanonicalLongitude(anchor.fixedJ2000EclipticLongitude, input.startTime, false);
    const movingStar = resolveFullKPFamilyLord(moving.starLord, activePrediction.planets);
    const movingSub = resolveFullKPFamilyLord(moving.subLord, activePrediction.planets);
    const movingSubSub = resolveFullKPFamilyLord(moving.subSubLord, activePrediction.planets);
    return {
      house,
      cuspLongitude,
      cuspSign,
      fixedCusp: { signLord, starLord: fixed.starLord, subLord: fixed.subLord, subSubLord: fixed.subSubLord },
      cuspSignLord: resolveFullKPFamilyLord(signLord, activePrediction.planets),
      cuspStarLord: resolveFullKPFamilyLord(fixed.starLord, activePrediction.planets),
      cuspSubLord: resolveFullKPFamilyLord(fixed.subLord, activePrediction.planets),
      cuspSubSubLord: resolveFullKPFamilyLord(fixed.subSubLord, activePrediction.planets),
      movingAnchor: {
        planet: anchor.planet,
        longitude: anchor.fixedJ2000EclipticLongitude,
        house: anchor.house,
        nakshatra: moving.nakshatra,
        starLord: movingStar,
        subLord: movingSub,
        subSubLord: movingSubSub,
      },
      cuspConnection: {
        starLordMatches: moving.starLord === fixed.starLord,
        subLordMatches: moving.subLord === fixed.subLord,
        subSubLordMatches: moving.subSubLord === fixed.subSubLord,
        movingSubSignifiesCusp: movingSub.significations.includes(house),
        movingSubSubSignifiesCusp: movingSubSub.significations.includes(house),
      },
    } satisfies GodViewFullKPFamilyRow;
  });
  return {
    status: "experimental-read-only",
    coordinateFrame: "fixed-j2000-ecliptic",
    input,
    activeFixedKPWinner: activePrediction.kpStellar.winner,
    activeCombinedWinner: activePrediction.combined.winner,
    method: "occupation-ownership-star-sub-cusp-subsub",
    rows,
  };
}

function fixedFamilyForHouse(house: number): "A" | "B" | "SUPPORT" {
  if (ASCENDANT_CLUSTER.includes(house as never)) return "A";
  if (DESCENDANT_CLUSTER.includes(house as never)) return "B";
  return "SUPPORT";
}

function scoreFullFamilyEvidence(label: string, evidence: KPFullFamilyEvidence, baseWeight: number, supportHouseIncrement: number): KPFamilyScoreContribution {
  const supportContribution = evidence.target === "NEUTRAL" ? 0 : evidence.supportHouses.length * supportHouseIncrement;
  const magnitude = evidence.target === "NEUTRAL" ? 0 : baseWeight + supportContribution;
  return {
    label,
    lord: evidence.lord,
    target: evidence.target,
    baseWeight,
    supportContribution,
    total: evidence.target === "A" ? magnitude : evidence.target === "B" ? -magnitude : 0,
  };
}

function scoreCuspConnection(label: string, applies: boolean, target: KPFullFamilyEvidence["target"], baseWeight: number, cuspFamily: "A" | "B" | "SUPPORT"): KPFamilyScoreContribution {
  const multiplier = cuspFamily === "SUPPORT" ? 0.35 : 1;
  const directedTarget = applies ? target : "NEUTRAL";
  const magnitude = directedTarget === "NEUTRAL" ? 0 : baseWeight * multiplier;
  return {
    label,
    lord: "cusp connection",
    target: directedTarget,
    baseWeight: baseWeight * multiplier,
    supportContribution: 0,
    total: directedTarget === "A" ? magnitude : directedTarget === "B" ? -magnitude : 0,
  };
}

/** Quantifies the full disclosed family evidence per fixed cusp without creating a public verdict. */
export function runGodViewPerCuspFamilyScoreExperiment(input: GameInput): GodViewPerCuspFamilyScoreExperiment {
  const family = runGodViewFullKPFamilyExperiment(input);
  const sourceWeights = {
    "Fixed Sign Lord": 0.5,
    "Fixed Cusp Star-Lord": 0.75,
    "Fixed Cusp Sub-Lord": 1.25,
    "Fixed Cusp Sub–Sub-Lord": 0.75,
    "Moving Star-Lord": 1,
    "Moving Sub-Lord": 2,
    "Moving Sub–Sub-Lord": 1.25,
  };
  const connectionBonuses = {
    "Star match": 0.25,
    "Sub match": 0.5,
    "Sub–Sub match": 0.75,
    "Moving Sub signifies cusp": 0.5,
    "Moving Sub–Sub signifies cusp": 0.75,
  };
  const supportHouseIncrement = 0.35;
  const noCallThreshold = 1;
  const rows = family.rows.map((row) => {
    const cuspFamily = fixedFamilyForHouse(row.house);
    const sourceContributions = [
      scoreFullFamilyEvidence("Fixed Sign Lord", row.cuspSignLord, sourceWeights["Fixed Sign Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Star-Lord", row.cuspStarLord, sourceWeights["Fixed Cusp Star-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Sub-Lord", row.cuspSubLord, sourceWeights["Fixed Cusp Sub-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Sub–Sub-Lord", row.cuspSubSubLord, sourceWeights["Fixed Cusp Sub–Sub-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Moving Star-Lord", row.movingAnchor.starLord, sourceWeights["Moving Star-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Moving Sub-Lord", row.movingAnchor.subLord, sourceWeights["Moving Sub-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Moving Sub–Sub-Lord", row.movingAnchor.subSubLord, sourceWeights["Moving Sub–Sub-Lord"], supportHouseIncrement),
    ];
    const connectionContributions = [
      scoreCuspConnection("Star match", row.cuspConnection.starLordMatches, row.movingAnchor.starLord.target, connectionBonuses["Star match"], cuspFamily),
      scoreCuspConnection("Sub match", row.cuspConnection.subLordMatches, row.movingAnchor.subLord.target, connectionBonuses["Sub match"], cuspFamily),
      scoreCuspConnection("Sub–Sub match", row.cuspConnection.subSubLordMatches, row.movingAnchor.subSubLord.target, connectionBonuses["Sub–Sub match"], cuspFamily),
      scoreCuspConnection("Moving Sub signifies cusp", row.cuspConnection.movingSubSignifiesCusp, row.movingAnchor.subLord.target, connectionBonuses["Moving Sub signifies cusp"], cuspFamily),
      scoreCuspConnection("Moving Sub–Sub signifies cusp", row.cuspConnection.movingSubSubSignifiesCusp, row.movingAnchor.subSubLord.target, connectionBonuses["Moving Sub–Sub signifies cusp"], cuspFamily),
    ];
    const sourceSubtotal = sourceContributions.reduce((total, contribution) => total + contribution.total, 0);
    const connectionSubtotal = connectionContributions.reduce((total, contribution) => total + contribution.total, 0);
    return { house: row.house, cuspSign: row.cuspSign, cuspFamily, sourceContributions, connectionContributions, sourceSubtotal, connectionSubtotal, total: sourceSubtotal + connectionSubtotal };
  });
  const net = rows.reduce((total, row) => total + row.total, 0);
  const ascendantStrength = rows.reduce((total, row) => total + Math.max(row.total, 0), 0);
  const descendantStrength = rows.reduce((total, row) => total + Math.max(-row.total, 0), 0);
  const supportContribution = rows.filter((row) => row.cuspFamily === "SUPPORT").reduce((total, row) => total + row.total, 0);
  const winner = net >= noCallThreshold ? "A" : net <= -noCallThreshold ? "B" : "TIE";
  return {
    status: "experimental-read-only",
    coordinateFrame: "fixed-j2000-ecliptic",
    input,
    activeFixedKPWinner: family.activeFixedKPWinner,
    activeCombinedWinner: family.activeCombinedWinner,
    rules: { sourceWeights, supportHouseIncrement, connectionBonuses, noCallThreshold },
    rows,
    totals: { ascendantStrength, descendantStrength, supportContribution, net, winner, noCall: winner === "TIE" },
  };
}

/** Keeps each fixed cusp visible while counting current moving evidence once per anchor planet. */
export function runGodViewDeduplicatedAnchorScoreExperiment(input: GameInput): GodViewDeduplicatedAnchorScoreExperiment {
  const family = runGodViewFullKPFamilyExperiment(input);
  const base = runGodViewPerCuspFamilyScoreExperiment(input);
  const { sourceWeights, supportHouseIncrement, connectionBonuses, noCallThreshold } = base.rules;
  const fixedRows = family.rows.map((row) => {
    const fixedContributions = [
      scoreFullFamilyEvidence("Fixed Sign Lord", row.cuspSignLord, sourceWeights["Fixed Sign Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Star-Lord", row.cuspStarLord, sourceWeights["Fixed Cusp Star-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Sub-Lord", row.cuspSubLord, sourceWeights["Fixed Cusp Sub-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Fixed Cusp Sub–Sub-Lord", row.cuspSubSubLord, sourceWeights["Fixed Cusp Sub–Sub-Lord"], supportHouseIncrement),
    ];
    return { house: row.house, cuspSign: row.cuspSign, cuspFamily: fixedFamilyForHouse(row.house), fixedContributions, total: fixedContributions.reduce((total, entry) => total + entry.total, 0) };
  });
  const grouped = new Map<string, GodViewFullKPFamilyRow[]>();
  for (const row of family.rows) grouped.set(row.movingAnchor.planet, [...(grouped.get(row.movingAnchor.planet) ?? []), row]);
  const anchorGroups = Array.from(grouped.entries()).map(([anchor, members]) => {
    const representative = members[0];
    const movingContributions = [
      scoreFullFamilyEvidence("Moving Star-Lord", representative.movingAnchor.starLord, sourceWeights["Moving Star-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Moving Sub-Lord", representative.movingAnchor.subLord, sourceWeights["Moving Sub-Lord"], supportHouseIncrement),
      scoreFullFamilyEvidence("Moving Sub–Sub-Lord", representative.movingAnchor.subSubLord, sourceWeights["Moving Sub–Sub-Lord"], supportHouseIncrement),
    ];
    const candidates: KPFamilyScoreContribution[] = members.flatMap((row: GodViewFullKPFamilyRow) => {
      const cuspFamily = fixedFamilyForHouse(row.house);
      return [
        scoreCuspConnection("Star match", row.cuspConnection.starLordMatches, row.movingAnchor.starLord.target, connectionBonuses["Star match"], cuspFamily),
        scoreCuspConnection("Sub match", row.cuspConnection.subLordMatches, row.movingAnchor.subLord.target, connectionBonuses["Sub match"], cuspFamily),
        scoreCuspConnection("Sub–Sub match", row.cuspConnection.subSubLordMatches, row.movingAnchor.subSubLord.target, connectionBonuses["Sub–Sub match"], cuspFamily),
        scoreCuspConnection("Moving Sub signifies cusp", row.cuspConnection.movingSubSignifiesCusp, row.movingAnchor.subLord.target, connectionBonuses["Moving Sub signifies cusp"], cuspFamily),
        scoreCuspConnection("Moving Sub–Sub signifies cusp", row.cuspConnection.movingSubSubSignifiesCusp, row.movingAnchor.subSubLord.target, connectionBonuses["Moving Sub–Sub signifies cusp"], cuspFamily),
      ];
    });
    const selectedConnections = ["Star match", "Sub match", "Sub–Sub match", "Moving Sub signifies cusp", "Moving Sub–Sub signifies cusp"].flatMap((label) => {
      const matches = candidates.filter((entry: KPFamilyScoreContribution) => entry.label === label && entry.total !== 0);
      return matches.length ? [matches.reduce((best: KPFamilyScoreContribution, entry: KPFamilyScoreContribution) => Math.abs(entry.total) > Math.abs(best.total) ? entry : best)] : [];
    });
    const total = [...movingContributions, ...selectedConnections].reduce((sum, entry) => sum + entry.total, 0);
    return { anchor, memberHouses: members.map((row: GodViewFullKPFamilyRow) => row.house), movingChain: { starLord: representative.movingAnchor.starLord.lord, subLord: representative.movingAnchor.subLord.lord, subSubLord: representative.movingAnchor.subSubLord.lord }, movingContributions, selectedConnections, total };
  });
  const fixedSubtotal = fixedRows.reduce((total, row) => total + row.total, 0);
  const movingAnchorSubtotal = anchorGroups.reduce((total, group) => total + group.total, 0);
  const net = fixedSubtotal + movingAnchorSubtotal;
  const winner = net >= noCallThreshold ? "A" : net <= -noCallThreshold ? "B" : "TIE";
  return { status: "experimental-read-only", coordinateFrame: "fixed-j2000-ecliptic", input, activeFixedKPWinner: family.activeFixedKPWinner, activeCombinedWinner: family.activeCombinedWinner, rules: { sourceWeights, supportHouseIncrement, connectionBonuses, noCallThreshold, movingAnchorPolicy: "count-once-per-planet" }, fixedRows, anchorGroups, totals: { fixedSubtotal, movingAnchorSubtotal, net, winner, noCall: winner === "TIE" } };
}

/**
 * Configurable multi-level inspection path. The existing Territorial result,
 * active Sub-Lord KP density, and active combined prediction are preserved;
 * this function only exposes a proposed close-matchup resolution for audit.
 */
export function runFixedJ2000KPTerritorialResonanceExperiment(
  input: GameInput,
  configOverride?: Partial<KPResonanceConfig>,
): KPTerritorialResonanceExperiment {
  const config = resolveKPResonanceConfig(configOverride);
  const activePrediction = generateFixedJ2000KPPrediction(input);
  const ascendant = resonanceAuditForSide(activePrediction.planets, "A", config);
  const descendant = resonanceAuditForSide(activePrediction.planets, "B", config);
  const territorialMargin = Number(Math.abs(activePrediction.territorial.scoreA - activePrediction.territorial.scoreB).toFixed(2));
  const classification = territorialMargin <= config.closeTerritorialMargin ? "CLOSE_TERRITORIAL_MATCHUP" : "CLEAR_TERRITORIAL_ADVANTAGE";
  const kpWinner = layerWinner(ascendant.finalKPWinFit, descendant.finalKPWinFit);
  const overallConflict = activePrediction.territorial.winner !== "TIE" && kpWinner !== "TIE" && activePrediction.territorial.winner !== kpWinner;
  const proposedWinner = !config.enabled
    ? activePrediction.combined.winner
    : classification === "CLOSE_TERRITORIAL_MATCHUP"
      ? kpWinner
      : activePrediction.territorial.winner;
  return {
    status: "experimental-read-only",
    coordinateFrame: "fixed-j2000-ecliptic",
    config,
    territorial: {
      scoreA: activePrediction.territorial.scoreA,
      scoreB: activePrediction.territorial.scoreB,
      margin: territorialMargin,
      classification,
      winner: activePrediction.territorial.winner,
      evidence: activePrediction.territorial.evidence!,
    },
    ascendant: { team: input.teamA, ...ascendant },
    descendant: { team: input.teamB, ...descendant },
    resolution: {
      kpWinner,
      proposedWinner,
      overallConflict,
      activeCombinedWinner: activePrediction.combined.winner,
      note: config.enabled
        ? "Experimental only: Sub–Sub-Lord modifies the primary Sub-Lord through configurable resonance and proposes a result only for close Territorial matchups. Active prediction weights are unchanged."
        : "Disabled configuration: the proposed result is the unchanged active combined prediction; all resonance audit fields remain inspectable.",
    },
  };
}

/**
 * Observer-local comparison path. It intentionally uses a moving Ascendant,
 * local event coordinates, and ecliptic-of-date positions; it therefore remains
 * separate from the permanent Fixed J2000 production coordinate frame.
 */
export function runAscendantHouseResonanceSimulation(input: GameInput, configOverride?: Partial<KPResonanceConfig>): AscendantHouseResonanceSimulation {
  const config = resolveKPResonanceConfig(configOverride);
  const source = generatePredictionForModel(input, "azimuth");
  const ascendantLongitude = source.ascendantLongitude;
  const localPlanets = source.planets.map((planet) => {
    const localPosition = fixedEclipticHouseFromLongitude(planet.ofDateEclipticLongitude - ascendantLongitude);
    const signPosition = fixedEclipticHouseFromLongitude(planet.ofDateEclipticLongitude);
    return {
      ...planet,
      tropicalLongitude: planet.ofDateEclipticLongitude,
      house: localPosition.house,
      degreeInHouse: localPosition.degreeInHouse,
      sign: signPosition.sign,
      degreeInSign: signPosition.degreeInHouse,
    };
  });
  const territorial = territorialVerdict(localPlanets, ascendantLongitude, (longitude) => fixedEclipticHouseFromLongitude(longitude - ascendantLongitude).house);
  const ascendant = resonanceAuditForSide(localPlanets, "A", config, ascendantLongitude, true);
  const descendant = resonanceAuditForSide(localPlanets, "B", config, ascendantLongitude, true);
  const margin = Number(Math.abs(territorial.scoreA - territorial.scoreB).toFixed(2));
  const classification = margin <= config.closeTerritorialMargin ? "CLOSE_TERRITORIAL_MATCHUP" : "CLEAR_TERRITORIAL_ADVANTAGE";
  const kpWinner = layerWinner(ascendant.finalKPWinFit, descendant.finalKPWinFit);
  const overallConflict = territorial.winner !== "TIE" && kpWinner !== "TIE" && territorial.winner !== kpWinner;
  const proposedWinner = !config.enabled ? territorial.winner : classification === "CLOSE_TERRITORIAL_MATCHUP" ? kpWinner : territorial.winner;
  return {
    status: "experimental-read-only",
    coordinateFrame: "observer-local-ascendant-whole-sign",
    ascendantLongitude,
    config,
    territorial: { scoreA: territorial.scoreA, scoreB: territorial.scoreB, margin, classification, winner: territorial.winner, evidence: territorial.evidence! },
    ascendant: { team: input.teamA, ...ascendant },
    descendant: { team: input.teamB, ...descendant },
    resolution: {
      kpWinner,
      proposedWinner,
      overallConflict,
      activeCombinedWinner: source.combined.winner,
      note: "Observer-local simulation only: local time, longitude, latitude, moving Ascendant, and ecliptic-of-date positions are used. It does not modify the Fixed J2000 production model.",
    },
  };
}

/**
 * Parallel read-only event-chart audit. Both frames use the same seven
 * Territorial layers and the same KP Sub-Lord/Sub–Sub-Lord resonance chain;
 * only the coordinate frame and house rule differ. It exposes both frame
 * resolutions without adding a cross-frame weight or a public call.
 */
export function runAgentGodFullLayerExperiment(
  input: GameInput,
  configOverride?: Partial<KPResonanceConfig>,
): AgentGodFullLayerExperiment {
  const config = resolveKPResonanceConfig({ ...configOverride, enabled: true });
  const godSource = runFixedJ2000KPTerritorialResonanceExperiment(input, config);
  const agentSource = runAscendantHouseResonanceSimulation(input, config);
  const buildFrame = (
    source: KPTerritorialResonanceExperiment | AscendantHouseResonanceSimulation,
    houseRule: FullLayerFrameAudit["houseRule"],
  ): FullLayerFrameAudit => ({
    coordinateFrame: source.coordinateFrame,
    houseRule,
    ascendantLongitude: "ascendantLongitude" in source ? source.ascendantLongitude : undefined,
    territorial: source.territorial,
    kp: {
      ascendant: source.ascendant,
      descendant: source.descendant,
      resolution: source.resolution,
    },
  });
  return {
    status: "experimental-read-only",
    input,
    config,
    territorialLayers: [
      "Cluster territory & house-lord placement",
      "Nakshatra influence",
      "Essential dignity",
      "Chaldean Decans",
      "Planetary war",
      "Arabic Lots",
      "Nine-planet influence",
    ],
    god: buildFrame(godSource, "permanent-aries-zero-whole-sign"),
    agent: buildFrame(agentSource, "local-moving-ascendant-whole-sign"),
    boundary: "Read-only evidence experiment: the two frames retain their separate Territorial and KP resolutions. No cross-frame score, winner, live prediction, model weight, or validation record is changed.",
  };
}

export const SAMPLE_BACKTEST = [
  { teamA: "Blue Jays", teamB: "Red Sox", actual: "Blue Jays", city: "Toronto", latitude: 43.65, longitude: -79.38, date: "2026-08-10", time: "23:07" },
  { teamA: "Yankees", teamB: "White Sox", actual: "Yankees", city: "New York", latitude: 40.71, longitude: -74, date: "2026-08-10", time: "22:10" },
  { teamA: "Orioles", teamB: "Angels", actual: "Angels", city: "Baltimore", latitude: 39.29, longitude: -76.61, date: "2026-08-10", time: "22:35" },
  { teamA: "Cubs", teamB: "Giants", actual: "Cubs", city: "Chicago", latitude: 41.87, longitude: -87.62, date: "2026-08-10", time: "23:40" },
  { teamA: "Braves", teamB: "Mets", actual: "Braves", city: "Atlanta", latitude: 33.74, longitude: -84.38, date: "2026-08-10", time: "01:10" },
  { teamA: "CWS", teamB: "Astros", actual: "Astros", city: "Chicago", latitude: 41.87, longitude: -87.62, date: "2026-08-10", time: "01:20" },
  { teamA: "Rangers", teamB: "Mariners", actual: "Mariners", city: "Arlington", latitude: 32.73, longitude: -97.1, date: "2026-08-10", time: "02:10" },
  { teamA: "Diamondbacks", teamB: "Padres", actual: "Padres", city: "Phoenix", latitude: 33.44, longitude: -112.07, date: "2026-08-10", time: "02:40" },
  { teamA: "Athletics", teamB: "Dodgers", actual: "Dodgers", city: "San Francisco", latitude: 37.77, longitude: -122.41, date: "2026-08-10", time: "02:45" },
  { teamA: "Phillies", teamB: "Marlins", actual: "Phillies", city: "Philadelphia", latitude: 39.95, longitude: -75.16, date: "2026-08-11", time: "23:05" },
  { teamA: "Red Sox", teamB: "Rays", actual: "Red Sox", city: "Boston", latitude: 42.36, longitude: -71.05, date: "2026-08-11", time: "23:10" },
  { teamA: "Nationals", teamB: "Cardinals", actual: "Cardinals", city: "Washington", latitude: 38.89, longitude: -77.03, date: "2026-08-11", time: "22:35" },
  { teamA: "Brewers", teamB: "Reds", actual: "Brewers", city: "Milwaukee", latitude: 43.03, longitude: -87.91, date: "2026-08-11", time: "23:40" },
  { teamA: "Astros", teamB: "Guardians", actual: "Astros", city: "Houston", latitude: 29.76, longitude: -95.36, date: "2026-08-11", time: "00:10" },
  { teamA: "Royals", teamB: "Tigers", actual: "Royals", city: "Kansas City", latitude: 39.09, longitude: -94.57, date: "2026-08-11", time: "01:05" },
  { teamA: "Twins", teamB: "Pirates", actual: "Twins", city: "Minneapolis", latitude: 44.97, longitude: -93.26, date: "2026-08-11", time: "01:10" },
  { teamA: "Rockies", teamB: "Mets", actual: "Mets", city: "Denver", latitude: 39.73, longitude: -104.99, date: "2026-08-11", time: "02:10" },
  { teamA: "Padres", teamB: "Nationals", actual: "Padres", city: "San Diego", latitude: 32.71, longitude: -117.16, date: "2026-08-11", time: "02:20" },
  { teamA: "Angels", teamB: "Yankees", actual: "Yankees", city: "Los Angeles", latitude: 34.05, longitude: -118.24, date: "2026-08-11", time: "02:40" },
  { teamA: "Mariners", teamB: "Orioles", actual: "Mariners", city: "Seattle", latitude: 47.6, longitude: -122.33, date: "2026-08-11", time: "02:45" },
  { teamA: "Mets", teamB: "Rockies", actual: "Mets", city: "New York", latitude: 40.71, longitude: -74, date: "2026-08-11", time: "17:35" },
  { teamA: "Marlins", teamB: "Phillies", actual: "Phillies", city: "Miami", latitude: 25.76, longitude: -80.19, date: "2026-08-11", time: "18:10" },
  { teamA: "Reds", teamB: "Brewers", actual: "Brewers", city: "Cincinnati", latitude: 39.1, longitude: -84.51, date: "2026-08-11", time: "19:05" },
  { teamA: "Guardians", teamB: "Astros", actual: "Astros", city: "Cleveland", latitude: 41.49, longitude: -81.69, date: "2026-08-11", time: "19:10" },
  { teamA: "Cardinals", teamB: "Cubs", actual: "Cubs", city: "St. Louis", latitude: 38.62, longitude: -90.19, date: "2026-08-11", time: "19:20" },
] as const;

function runBacktestForModel(domeModel: DomeModel) {
  const games = SAMPLE_BACKTEST.map((game) => {
    const input = {
      teamA: game.teamA,
      teamB: game.teamB,
      location: game.city,
      coordinates: { latitude: game.latitude, longitude: game.longitude },
      gameType: "MLB",
      startTime: new Date(`${game.date}T${game.time}:00.000Z`),
    } as const;
    const prediction = domeModel === "polaris-fixed-ra"
      ? generatePolarisFixedRAPrediction(input)
      : domeModel === "fixed-ecliptic"
      ? generateFixedEclipticPrediction(input)
      : domeModel === "unified-ephemeris"
        ? generateUnifiedEphemerisPrediction(input)
        : domeModel === "fixed-j2000-kp"
          ? generateFixedJ2000KPPrediction(input)
        : generateAzimuthLegacyPrediction(input);
    const pick = (winner: "A" | "B" | "TIE") => winner === "A" ? game.teamA : winner === "B" ? game.teamB : "Tie";
    const territorial = pick(prediction.territorial.winner);
    const kp = pick(prediction.kpStellar.winner);
    const combined = pick(prediction.combined.winner);
    return {
      matchup: `${game.teamA} vs. ${game.teamB}`,
      date: game.date,
      actual: game.actual,
      territorial,
      kp,
      combined,
      outcome: combined === game.actual ? "Hit" : "Miss",
      territorialLayers: prediction.territorial.evidence?.layers ?? [],
    };
  });
  const rate = (key: "territorial" | "kp" | "combined") => Number((games.filter((game) => game[key] === game.actual).length / games.length * 100).toFixed(1));
  const territorialLayerAverages = games[0]?.territorialLayers.map((layer, index) => ({
    name: layer.name,
    scoreA: Number((games.reduce((sum, game) => sum + (game.territorialLayers[index]?.scoreA ?? 0), 0) / games.length).toFixed(2)),
    scoreB: Number((games.reduce((sum, game) => sum + (game.territorialLayers[index]?.scoreB ?? 0), 0) / games.length).toFixed(2)),
    detail: layer.detail,
  })) ?? [];
  return {
    domeModel,
    metrics: { territorial: rate("territorial"), kpStellar: rate("kp"), combined: rate("combined"), sampleSize: games.length },
    games,
    territorialLayerAverages,
    methodology: "Each row is recalculated from the verified Aug. 10–11, 2026 MLB slate. Territorial Control includes the restored house-lord cluster, Nakshatra influence, dignity, planetary-war, Arabic-Lot, and nine-planet influence layers. The combined score remains the arithmetic mean of Territorial Control and KP Stellar; no layer is a multiplier or gate.",
  };
}

/** Active verified report: Polaris-centered fixed J2000 RA Pure Clock. */
export function runVerifiedBacktest() {
  return runBacktestForModel("polaris-fixed-ra");
}

/** Preserved comparison report: former topocentric azimuth baseline. */
export function runAzimuthLegacyBacktest() {
  return runBacktestForModel("azimuth");
}

/** Experimental report: the same verified games, but direct ephemeris Fixed Ecliptic placement. */
export function runFixedEclipticBacktest() {
  return runBacktestForModel("fixed-ecliptic");
}

/** Same slate, but raw ephemeris longitude feeds both literal dome and KP lookup with no shift. */
export function runUnifiedEphemerisBacktest() {
  return runBacktestForModel("unified-ephemeris");
}

/** Same verified slate through the fixed zero-tilt dome KP path. */
export function runFixedJ2000KPBacktest() {
  return runBacktestForModel("fixed-j2000-kp");
}

export function runDomeModelComparisonBacktest() {
  const polarisFixedRA = runVerifiedBacktest();
  const azimuth = runAzimuthLegacyBacktest();
  const fixedEcliptic = runFixedEclipticBacktest();
  const unifiedEphemeris = runUnifiedEphemerisBacktest();
  const fixedJ2000KP = runFixedJ2000KPBacktest();
  return {
    polarisFixedRA,
    azimuth,
    fixedEcliptic,
    unifiedEphemeris,
    fixedJ2000KP,
    legacyAzimuthDifferences: {
      territorial: Number((azimuth.metrics.territorial - polarisFixedRA.metrics.territorial).toFixed(1)),
      kpStellar: Number((azimuth.metrics.kpStellar - polarisFixedRA.metrics.kpStellar).toFixed(1)),
      combined: Number((azimuth.metrics.combined - polarisFixedRA.metrics.combined).toFixed(1)),
    },
    differences: {
      territorial: Number((fixedEcliptic.metrics.territorial - polarisFixedRA.metrics.territorial).toFixed(1)),
      kpStellar: Number((fixedEcliptic.metrics.kpStellar - polarisFixedRA.metrics.kpStellar).toFixed(1)),
      combined: Number((fixedEcliptic.metrics.combined - polarisFixedRA.metrics.combined).toFixed(1)),
    },
    unifiedDifferences: {
      territorial: Number((unifiedEphemeris.metrics.territorial - polarisFixedRA.metrics.territorial).toFixed(1)),
      kpStellar: Number((unifiedEphemeris.metrics.kpStellar - polarisFixedRA.metrics.kpStellar).toFixed(1)),
      combined: Number((unifiedEphemeris.metrics.combined - polarisFixedRA.metrics.combined).toFixed(1)),
    },
    fixedJ2000KpDifferences: {
      territorial: Number((fixedJ2000KP.metrics.territorial - polarisFixedRA.metrics.territorial).toFixed(1)),
      kpStellar: Number((fixedJ2000KP.metrics.kpStellar - polarisFixedRA.metrics.kpStellar).toFixed(1)),
      combined: Number((fixedJ2000KP.metrics.combined - polarisFixedRA.metrics.combined).toFixed(1)),
    },
  };
}
