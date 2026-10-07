import type { Tradition } from "../types";

/**
 * Epistemic separation required by Firmament architecture:
 * - FACT: Externally verifiable astronomical, mathematical, or historical fact.
 * - TRADITION: A historical astrological teaching, rule, or correspondence attributed to a specific tradition/source.
 * - FIRMAMENT_CANON: A deterministic rule, coordinate lock, or interpretive synthesis explicitly adopted by Firmament.
 */
export type EpistemicCategory = "FACT" | "TRADITION" | "FIRMAMENT_CANON";

export type ProvenanceRecord = {
  tradition: Tradition | "hellenistic" | "babylonian" | "hermetic" | "medieval";
  sourceTitle: string;
  authorOrEra?: string;
  epistemicCategory: EpistemicCategory;
  notes?: string;
  disputedOrVariantNote?: string;
};

export type EpistemicStatement = {
  category: EpistemicCategory;
  statement: string;
  provenance: ProvenanceRecord;
};

export type PlanetCanonRecord = {
  name: string;
  category: "luminary" | "classical-planet" | "modern-outer" | "lunar-node";
  astronomicalFact: EpistemicStatement;
  traditionalQualities: {
    sect: "diurnal" | "nocturnal" | "participating" | "not-applicable";
    temperament: string;
    beneficMalefic: "benefic" | "malefic" | "variable" | "modern-transpersonal";
    chaldeanOrderRank?: number;
    meanDailyMotionDeg: number;
    provenance: ProvenanceRecord;
  };
  coreMeanings: string[];
  psychologicalFunctions: {
    coreNeed: string;
    healthyExpression: string;
    defensiveStrategy: string;
    shadowExpression: string;
  };
  rulerships: {
    domiciles: string[];
    exaltationSign?: string;
    exaltationDegree?: number;
    detriments: string[];
    fallSign?: string;
    fallDegree?: number;
    houseJoy?: number;
  };
  naturalSignifications: string[];
  horaryUses: string[];
  firmamentCanonNote: EpistemicStatement;
};

export type SignCanonRecord = {
  name: string;
  index: number; // 0..11
  degreeRange: [number, number];
  astronomicalFact: EpistemicStatement;
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  polarity: "Diurnal / Masculine" | "Nocturnal / Feminine";
  domicileLord: string;
  modernCoRuler?: string;
  exaltation: { planet: string; classicalDegree: number } | null;
  detrimentLords: string[];
  fall: { planet: string; classicalDegree: number } | null;
  triplicityLords: {
    dorothean: { day: string; night: string; participating: string };
    ptolemaicNote: string;
  };
  traditionalQualities: string[];
  psychologicalTheme: string;
  firmamentGodHouse: number;
  provenance: ProvenanceRecord;
};

export type HouseCanonRecord = {
  house: number; // 1..12
  angularity: "Angular (Pivot)" | "Succedent" | "Cadent";
  traditionalTitle: string;
  LatinName: string;
  planetaryJoy: string | null;
  coreTopics: string[];
  horarySignifications: string[];
  psychologicalField: string;
  godViewDefinition: EpistemicStatement;
  agentViewDefinition: EpistemicStatement;
  godToAgentTranslationRule: EpistemicStatement;
};

export type DecanCanonRecord = {
  index: number; // 1..36
  sign: string;
  decanNumber: 1 | 2 | 3;
  degreeRange: [number, number];
  label: string;
  chaldeanFaceRuler: string; // Hellenistic / Arabic Face ruler
  triplicitySubRuler: string; // Western Triplicity sub-ruler (preserved separately, not merged)
  traditionalTitle: string;
  coreThemes: string[];
  behavioralNuance: string;
  provenance: ProvenanceRecord;
};

export type ManzilCanonRecord = {
  index: number; // 1..28
  name: string;
  transliterationVariants: string[];
  englishTranslation: string;
  degreeRange: [number, number];
  astronomicalFact: EpistemicStatement;
  traditionalQuality: "Fortunate" | "Unfortunate" | "Mixed / Conditional";
  traditionalThemes: string[];
  traditionalElections: string;
  natalAndPsychologicalMeaning: string;
  firmamentCanonNote: EpistemicStatement;
  provenance: ProvenanceRecord;
};

export type NakshatraPadaRecord = {
  pada: 1 | 2 | 3 | 4;
  navamshaSign: string;
  navamshaRuler: string;
  degreeRange: [number, number];
  emphasis: string;
};

export type NakshatraCanonRecord = {
  index: number; // 1..27
  name: string;
  degreeRange: [number, number];
  vimshottariRuler: string;
  deity: string;
  symbol: string;
  shakti: string; // Power / action
  guna: "Sattva" | "Rajas" | "Tamas";
  gana: "Deva (Divine)" | "Manushya (Human)" | "Rakshasa (Fierce/Independent)";
  motivationPuruSharthas: "Dharma" | "Artha" | "Kama" | "Moksha";
  coreMeaning: string;
  psychologicalPattern: string;
  padas: [
    NakshatraPadaRecord,
    NakshatraPadaRecord,
    NakshatraPadaRecord,
    NakshatraPadaRecord,
  ];
  epistemicNote: EpistemicStatement;
  provenance: ProvenanceRecord;
};

export type FixedStarCanonRecord = {
  name: string;
  isRoyalStar: boolean;
  watcherDirection?: "East (Vernal)" | "North (Summer)" | "West (Autumnal)" | "South (Winter)";
  constellation: string;
  firmamentLockedLongitude: number;
  astronomicalFact: EpistemicStatement;
  ptolemaicPlanetaryNature: string;
  traditionalMeaning: string;
  giftWhenIntegrated: string;
  nemesisOrTest: string;
  firmamentOrbRule: EpistemicStatement;
  provenance: ProvenanceRecord;
};

export type LotCanonRecord = {
  id: string;
  name: string;
  dayFormula: string;
  nightFormula: string;
  associatedPlanet: string;
  traditionalMeaning: string;
  psychologicalMeaning: string;
  horaryAndNatalUse: string;
  provenance: ProvenanceRecord;
};

export type HoraryMechanismRecord = {
  id:
    | "applying-aspect"
    | "separating-aspect"
    | "mutual-reception"
    | "unilateral-reception"
    | "translation-of-light"
    | "collection-of-light"
    | "prohibition"
    | "refranation"
    | "frustration"
    | "cazimi"
    | "combustion"
    | "under-the-beams"
    | "besiegement"
    | "retrograde-condition"
    | "void-of-course";
  name: string;
  category: "perfection" | "impediment" | "solar-condition" | "reception" | "motion";
  definition: string;
  astronomicalCriterion: string;
  traditionalJudgment: string;
  psychologicalAnalogue: string;
  provenance: ProvenanceRecord;
};

export type RetrievedPlacementDossier = {
  body: string;
  display: string;
  longitude: number;
  sign: string;
  displayedHouse: number;
  godHouse?: number;
  agentHouse?: number;
  planetDoctrine?: PlanetCanonRecord;
  signDoctrine?: SignCanonRecord;
  planetInSignSynthesis: string;
  houseDoctrine?: HouseCanonRecord;
  planetInHouseSynthesis: string;
  godToAgentNote?: string;
  dignityAndCondition: {
    essentialDignities: string[];
    essentialDebilities: string[];
    egyptianTermRuler?: string;
    ptolemaicTermRuler?: string;
    chaldeanFaceRuler?: string;
    dorotheanTriplicityRulers?: { day: string; night: string; participating: string };
    solarCondition: "cazimi" | "combust" | "under-the-beams" | "free-of-solar-rays" | "solar-source";
    solarDistanceDeg?: number;
    sectAlignment: string;
    accidentalCondition: string;
    conditionSummary: string;
  };
  decanRecord?: DecanCanonRecord;
  manzilRecord?: ManzilCanonRecord;
  nakshatraRecord?: NakshatraCanonRecord;
  activePada?: NakshatraPadaRecord;
  fixedStarContacts: Array<{
    star: FixedStarCanonRecord;
    orbDeg: number;
  }>;
};

export type DetectedTraditionalMechanism = {
  mechanismId: HoraryMechanismRecord["id"];
  title: string;
  involvedBodies: string[];
  statement: string;
  epistemicCategory: EpistemicCategory;
  sourceTitle: string;
};

export type ChartCanonDossier = {
  sect: "day" | "night" | "god-view-unsected";
  sectExplanation: string;
  placements: RetrievedPlacementDossier[];
  detectedMechanisms: DetectedTraditionalMechanism[];
  arabicLotsSummary: Array<{
    lot: LotCanonRecord;
    longitude: number;
    display: string;
    sign: string;
    house: number;
    houseInterpretation: string;
  }>;
  formattedSummaryForInterpreter: string;
};
