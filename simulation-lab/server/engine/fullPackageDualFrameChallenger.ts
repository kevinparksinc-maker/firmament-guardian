import {
  fixedEclipticHouseFromLongitude,
  generateFixedJ2000KPPrediction,
  generatePredictionForModel,
  runAgentGodFullLayerExperiment,
  type GameInput,
  type PlanetReading,
} from "./firmamentEngine";
import { calculateRestoredTerritorial, type TerritorialPlanet } from "./territorialStack";

type Side = "A" | "B" | "neutral";
type Winner = "A" | "B" | "TIE";
type FrameName = "God View" | "Agent’s View";
/**
 * SHARED — describes overall chart/environment; cannot move the A-vs-B differential by itself
 * (must contribute 0/0, never an identical non-zero amount to both sides).
 * SIDE_SPECIFIC — favors or penalizes one side based on that side's own placement.
 * ROLE_MODIFIER — applies because of a defined role (querent/player vs opponent), not the raw condition.
 * OUTCOME — a comparative technique evaluated across both sides at once (translation, KP fit, net aspect pattern).
 */
export type RuleClass = "SHARED" | "SIDE_SPECIFIC" | "ROLE_MODIFIER" | "OUTCOME";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
const SIGN_RULERS: Record<(typeof SIGNS)[number], string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const ASCENDANT_HOUSES = new Set([1, 2, 3, 6, 10, 11]);
const DESCENDANT_HOUSES = new Set([4, 5, 7, 8, 9, 12]);
const MALEFICS = new Set(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
const ARCHIVE_STARS = [
  { name: "Regulus", longitude: 135, nature: "benefic", group: "royal" },
  { name: "Aldebaran", longitude: 45, nature: "benefic", group: "royal" },
  { name: "Antares", longitude: 225, nature: "malefic", group: "royal" },
  { name: "Fomalhaut", longitude: 315, nature: "malefic", group: "royal" },
  { name: "Sirius", longitude: 104, nature: "benefic", group: "major" },
  { name: "Polaris", longitude: 0, nature: "benefic", group: "major" },
  { name: "Spica", longitude: 173.833, nature: "benefic", group: "major" },
  { name: "Arcturus", longitude: 164.183, nature: "benefic", group: "major" },
  { name: "Denebola", longitude: 182, nature: "malefic", group: "major" },
  { name: "Algol", longitude: 56.683, nature: "malefic", group: "minor" },
  { name: "Bellatrix", longitude: 162, nature: "malefic", group: "minor" },
] as const;

export const FULL_PACKAGE_ADDED_LAYERS = [
  "Fixed-star amplifications",
  "Retrograde condition",
  "Lunar flow",
  "Chart-wide aspects",
  "Moon phase / VOC",
  "Nodes (Rahu/Ketu)",
  "Upachaya growth",
  "Via Combusta",
  "Besiegement",
  "Mutual reception",
  "Translation of light",
  "Harmonious vs friction aspects",
  "KP Star → Sub → Sub–Sub chain",
] as const;

export type FullPackageLayerEvidence = {
  name: (typeof FULL_PACKAGE_ADDED_LAYERS)[number];
  scoreA: number;
  scoreB: number;
  ruleClass: RuleClass;
  detail: string;
  source: "recovered-archive-master" | "recovered-archive-horary" | "current-full-kp";
  limitation?: string;
};

export type FullPackageFoundationLayerEvidence = {
  name: string;
  scoreA: number;
  scoreB: number;
  ruleClass: RuleClass;
  detail: string;
  source: "current-seven-layer-territorial";
};

export type FullPackageFrame = {
  name: FrameName;
  coordinateFrame: "fixed-j2000-ecliptic" | "observer-local-ascendant-whole-sign";
  houseRule: "permanent-aries-zero-whole-sign" | "local-moving-ascendant-whole-sign";
  ascendantLongitude: number;
  foundation: { scoreA: number; scoreB: number; layers: FullPackageFoundationLayerEvidence[] };
  foundationError?: string;
  addedLayers: FullPackageLayerEvidence[];
  synthesis: { scoreA: number; scoreB: number; margin: number; winner: Winner; noCall: boolean; formula: string };
};

export type FullPackageDualFrameChallenger = {
  status: "experimental-read-only";
  method: "sandbox-current-foundation-plus-recovered-extensions-v1";
  input: GameInput;
  recoveredArchiveLayers: readonly string[];
  god: FullPackageFrame;
  agent: FullPackageFrame;
  agreement: { state: "agree" | "split" | "no-call"; winner: Winner };
  boundary: string;
};

type FramePlanet = TerritorialPlanet & { longitude: number };
type HouseLordEntry = { house: number; ruledSide: Exclude<Side, "neutral">; lord: string; placement: FramePlanet };

export type AgentViewRotationMode = "none" | "ascendant-only" | "whole-chart";
export type DualFrameRunOptions = { agentViewRotation?: AgentViewRotationMode };

function normalize(value: number) { return ((value % 360) + 360) % 360; }
function round(value: number) { return Number(value.toFixed(2)); }
function angularDistance(first: number, second: number) { const diff = Math.abs(normalize(first) - normalize(second)); return diff > 180 ? 360 - diff : diff; }
function sideForHouse(house: number): Side { return ASCENDANT_HOUSES.has(house) ? "A" : DESCENDANT_HOUSES.has(house) ? "B" : "neutral"; }
function sideScore(side: Side, amount: number) { return side === "A" ? [amount, 0] as const : side === "B" ? [0, amount] as const : [0, 0] as const; }
function layerWinner(scoreA: number, scoreB: number): Winner { return scoreA === scoreB ? "TIE" : scoreA > scoreB ? "A" : "B"; }
function signAt(longitude: number) { return SIGNS[Math.floor(normalize(longitude) / 30)]!; }
function aspectType(first: number, second: number) {
  const separation = angularDistance(first, second);
  if (separation <= 8) return "conjunction" as const;
  if (Math.abs(separation - 60) <= 6) return "sextile" as const;
  if (Math.abs(separation - 90) <= 8) return "square" as const;
  if (Math.abs(separation - 120) <= 8) return "trine" as const;
  if (Math.abs(separation - 180) <= 8) return "opposition" as const;
  return null;
}

function planetsForGod(input: GameInput): { ascendantLongitude: number; planets: FramePlanet[] } {
  const source = generateFixedJ2000KPPrediction(input);
  return {
    ascendantLongitude: 0,
    planets: source.planets.map((planet) => {
      const position = fixedEclipticHouseFromLongitude(planet.fixedJ2000EclipticLongitude);
      return {
        planet: planet.planet,
        longitude: planet.fixedJ2000EclipticLongitude,
        tropicalLongitude: planet.fixedJ2000EclipticLongitude,
        house: position.house,
        sign: position.sign,
        degreeInHouse: position.degreeInHouse,
        degreeInSign: position.degreeInHouse,
        altitude: planet.altitude,
        isRetrograde: planet.isRetrograde,
        nakshatra: planet.nakshatra,
      };
    }),
  };
}

function planetsForAgent(input: GameInput, rotationMode: AgentViewRotationMode = "none"): { ascendantLongitude: number; planets: FramePlanet[] } {
  const source = generatePredictionForModel(input, "azimuth");
  const rotation = rotationMode === "none" ? 0 : 180;
  const ascendantLongitude = normalize(source.ascendantLongitude + rotation);
  return {
    ascendantLongitude,
    planets: source.planets.map((planet) => {
      const longitude = rotationMode === "whole-chart" ? normalize(planet.ofDateEclipticLongitude + rotation) : planet.ofDateEclipticLongitude;
      const local = fixedEclipticHouseFromLongitude(longitude - ascendantLongitude);
      const sign = fixedEclipticHouseFromLongitude(longitude);
      return {
        planet: planet.planet,
        longitude,
        tropicalLongitude: longitude,
        house: local.house,
        sign: sign.sign,
        degreeInHouse: local.degreeInHouse,
        degreeInSign: sign.degreeInHouse,
        altitude: planet.altitude,
        isRetrograde: planet.isRetrograde,
        nakshatra: planet.nakshatra,
      };
    }),
  };
}

function houseLords(planets: FramePlanet[], ascendantLongitude: number): HouseLordEntry[] {
  const byName = new Map(planets.map((planet) => [planet.planet, planet]));
  const entries: HouseLordEntry[] = [];
  for (let house = 1; house <= 12; house += 1) {
    const ruledSide = sideForHouse(house);
    if (ruledSide === "neutral") continue;
    const cuspSign = signAt(ascendantLongitude + (house - 1) * 30);
    const lord = SIGN_RULERS[cuspSign];
    const placement = byName.get(lord);
    if (placement) entries.push({ house, ruledSide, lord, placement });
  }
  return entries;
}

function fixedStarLayer(entries: HouseLordEntry[]): FullPackageLayerEvidence {
  let scoreA = 0;
  let scoreB = 0;
  const hits: string[] = [];
  for (const entry of entries) {
    const side = sideForHouse(entry.placement.house);
    if (side === "neutral") continue;
    for (const star of ARCHIVE_STARS) {
      if (angularDistance(entry.placement.longitude, star.longitude) > 1) continue;
      const score = star.group === "royal" ? (star.nature === "benefic" ? 2 : -2.5) : star.group === "major" ? (star.nature === "benefic" ? 1 : -1.5) : -0.75;
      const [a, b] = sideScore(side, score);
      scoreA += a;
      scoreB += b;
      hits.push(`H${entry.house} ${entry.lord} / ${star.name} ${score > 0 ? "+" : ""}${score}`);
    }
  }
  return { name: "Fixed-star amplifications", scoreA: round(scoreA), scoreB: round(scoreB), ruleClass: "SIDE_SPECIFIC", detail: hits.length ? hits.join("; ") : "No recovered-archive fixed-star conjunctions within the stated 1° orb.", source: "recovered-archive-master" };
}

const RETROGRADE_PENALTY = -1;

function retrogradeLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const planet of planets.filter((candidate) => candidate.isRetrograde)) {
    const side = sideForHouse(planet.house);
    const [a, b] = sideScore(side, RETROGRADE_PENALTY);
    scoreA += a;
    scoreB += b;
    if (side !== "neutral") details.push(`${planet.planet} H${planet.house}: ${RETROGRADE_PENALTY}`);
  }
  return { name: "Retrograde condition", scoreA: round(scoreA), scoreB: round(scoreB), ruleClass: "SIDE_SPECIFIC", detail: details.length ? details.join("; ") : "No retrograde planets occupied a scoring cluster.", source: "recovered-archive-horary" };
}

function lunarLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  const moon = planets.find((planet) => planet.planet === "Moon");
  if (!moon) return { name: "Lunar flow", scoreA: 0, scoreB: 0, ruleClass: "SIDE_SPECIFIC", detail: "Moon unavailable.", source: "recovered-archive-master" };
  const side = sideForHouse(moon.house);
  const score = [1, 4, 7, 10].includes(moon.house) ? 8 : 5;
  const [scoreA, scoreB] = sideScore(side, score);
  return { name: "Lunar flow", scoreA, scoreB, ruleClass: "SIDE_SPECIFIC", detail: side === "neutral" ? `Moon in neutral H${moon.house}.` : `Moon in ${side} H${moon.house}: +${score}.`, source: "recovered-archive-master" };
}

function chartAspectLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  let net = 0;
  const details: string[] = [];
  const weights: Record<NonNullable<ReturnType<typeof aspectType>>, number> = { conjunction: 0, sextile: 1, square: -2, trine: 2, opposition: -2 };
  for (let left = 0; left < planets.length; left += 1) {
    for (let right = left + 1; right < planets.length; right += 1) {
      const kind = aspectType(planets[left]!.longitude, planets[right]!.longitude);
      if (!kind) continue;
      const score = weights[kind] * 0.5;
      net += score;
      if (score !== 0) details.push(`${planets[left]!.planet}-${planets[right]!.planet} ${kind}: ${score > 0 ? "+" : ""}${score}`);
    }
  }
  return { name: "Chart-wide aspects", scoreA: round(net / 2), scoreB: round(-net / 2), ruleClass: "OUTCOME", detail: details.length ? details.join("; ") : "No scored major aspects.", source: "recovered-archive-master", limitation: "The archive halves separating aspects. Applying/separating is not present in the current event payload, so this sandbox conservatively applies that half-strength treatment." };
}

function moonPhaseLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  const sun = planets.find((planet) => planet.planet === "Sun");
  const moon = planets.find((planet) => planet.planet === "Moon");
  if (!sun || !moon) return { name: "Moon phase / VOC", scoreA: 0, scoreB: 0, ruleClass: "SHARED", detail: "Sun or Moon unavailable.", source: "recovered-archive-master" };
  const separation = normalize(moon.longitude - sun.longitude);
  const phase = separation < 30 || separation >= 330 ? "new" : Math.abs(separation - 180) <= 15 ? "full" : separation < 180 ? "waxing" : "waning";
  return {
    name: "Moon phase / VOC",
    scoreA: 0,
    scoreB: 0,
    ruleClass: "SHARED",
    detail: `${phase} Moon at ${round(separation)}° solar separation; void-of-course remains false / 0 points. Recorded as chart-environment context only — no known rule ties this phase to one side specifically, so it does not count toward the winner.`,
    source: "recovered-archive-master",
    limitation: "The recovered archive adapter itself hard-coded isVoidOfCourse = false with a TODO to calculate it. No historical VOC rule can be reconstructed from the source currently available.",
  };
}

function nodesLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const node of planets.filter((planet) => planet.planet === "Rahu" || planet.planet === "Ketu")) {
    const side = sideForHouse(node.house);
    const score = [1, 4, 7, 10].includes(node.house) ? 2 : 1;
    const [a, b] = sideScore(side, score);
    scoreA += a;
    scoreB += b;
    if (side !== "neutral") details.push(`${node.planet} H${node.house}: +${score} ${side}`);
  }
  return { name: "Nodes (Rahu/Ketu)", scoreA: round(scoreA), scoreB: round(scoreB), ruleClass: "SIDE_SPECIFIC", detail: details.length ? details.join("; ") : "Both nodes in neutral houses.", source: "recovered-archive-master" };
}

const UPACHAYA_HOUSES = new Set([3, 6, 10, 11]);

function upachayaLayer(planets: FramePlanet[]): FullPackageLayerEvidence {
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const planet of planets.filter((candidate) => MALEFICS.has(candidate.planet) && UPACHAYA_HOUSES.has(candidate.house))) {
    const side = sideForHouse(planet.house);
    const [a, b] = sideScore(side, 1);
    scoreA += a;
    scoreB += b;
    if (side !== "neutral") details.push(`${planet.planet} H${planet.house}: +1 ${side}`);
  }
  return { name: "Upachaya growth", scoreA, scoreB, ruleClass: "SIDE_SPECIFIC", detail: details.length ? details.join("; ") : "No malefic occupies an Upachaya house (3/6/10/11) in a scoring cluster.", source: "recovered-archive-master" };
}

function viaCombustaLayer(entries: HouseLordEntry[]): FullPackageLayerEvidence {
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const entry of entries) {
    if (entry.placement.longitude < 195 || entry.placement.longitude >= 225) continue;
    const [a, b] = sideScore(entry.ruledSide, -3);
    scoreA += a;
    scoreB += b;
    details.push(`H${entry.house} ${entry.lord}: -3`);
  }
  return { name: "Via Combusta", scoreA, scoreB, ruleClass: "SIDE_SPECIFIC", detail: details.length ? details.join("; ") : "No scoring house lord in 15° Libra–15° Scorpio.", source: "recovered-archive-master" };
}

function besiegementLayer(entries: HouseLordEntry[], planets: FramePlanet[]): FullPackageLayerEvidence {
  const saturn = planets.find((planet) => planet.planet === "Saturn");
  const mars = planets.find((planet) => planet.planet === "Mars");
  if (!saturn || !mars) return { name: "Besiegement", scoreA: 0, scoreB: 0, ruleClass: "SIDE_SPECIFIC", detail: "Mars or Saturn unavailable.", source: "recovered-archive-master" };
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const entry of entries) {
    if (entry.lord === "Saturn" || entry.lord === "Mars") continue;
    if (angularDistance(entry.placement.longitude, saturn.longitude) > 8 || angularDistance(entry.placement.longitude, mars.longitude) > 8) continue;
    const [a, b] = sideScore(entry.ruledSide, -2);
    scoreA += a;
    scoreB += b;
    details.push(`H${entry.house} ${entry.lord}: -2`);
  }
  return { name: "Besiegement", scoreA, scoreB, ruleClass: "SIDE_SPECIFIC", detail: details.length ? details.join("; ") : "No cluster lord lies within 8° of both Mars and Saturn.", source: "recovered-archive-master" };
}

function mutualReceptionLayer(entries: HouseLordEntry[]): FullPackageLayerEvidence {
  const sideA = entries.filter((entry) => entry.ruledSide === "A");
  const sideB = entries.filter((entry) => entry.ruledSide === "B");
  const details: string[] = [];
  for (const left of sideA) for (const right of sideB) {
    if (SIGN_RULERS[right.placement.sign as (typeof SIGNS)[number]] !== left.lord || SIGN_RULERS[left.placement.sign as (typeof SIGNS)[number]] !== right.lord) continue;
    details.push(`${left.lord} ↔ ${right.lord}: mutual reception (strengthens both, favors neither)`);
  }
  return { name: "Mutual reception", scoreA: 0, scoreB: 0, ruleClass: "SHARED", detail: (details.length ? details.join("; ") : "No cross-cluster mutual reception.") + " Recorded as evidence only — mutual reception strengthens both placements equally by definition, so it does not count toward the winner.", source: "recovered-archive-master" };
}

function translationLayer(entries: HouseLordEntry[], planets: FramePlanet[]): FullPackageLayerEvidence {
  const sideA = entries.filter((entry) => entry.ruledSide === "A");
  const sideB = entries.filter((entry) => entry.ruledSide === "B");
  const lordNames = new Set(entries.map((entry) => entry.lord));
  let scoreA = 0;
  let scoreB = 0;
  const details: string[] = [];
  for (const translator of planets.filter((planet) => !lordNames.has(planet.planet))) {
    const closest = (candidates: HouseLordEntry[]) => candidates.map((entry) => ({ entry, distance: angularDistance(translator.longitude, entry.placement.longitude) })).filter((candidate) => aspectType(translator.longitude, candidate.entry.placement.longitude)).sort((left, right) => left.distance - right.distance)[0];
    const closestA = closest(sideA);
    const closestB = closest(sideB);
    if (!closestA || !closestB) continue;
    if (closestA.distance < closestB.distance) { scoreA += 3; details.push(`${translator.planet} → A: +3`); }
    else { scoreB += 3; details.push(`${translator.planet} → B: +3`); }
  }
  return { name: "Translation of light", scoreA, scoreB, ruleClass: "OUTCOME", detail: details.length ? details.join("; ") : "No third planet connected to both clusters by a major aspect.", source: "recovered-archive-master", limitation: "The recovered archive called this a geometric approximation because exact separating/applying speed data was unavailable." };
}

function frictionLayer(entries: HouseLordEntry[]): FullPackageLayerEvidence {
  const sideA = entries.filter((entry) => entry.ruledSide === "A");
  const sideB = entries.filter((entry) => entry.ruledSide === "B");
  const details: string[] = [];
  for (const left of sideA) for (const right of sideB) {
    const kind = aspectType(left.placement.longitude, right.placement.longitude);
    if (kind === "trine" || kind === "sextile") details.push(`${left.lord}-${right.lord} ${kind}: harmonious (affects both, favors neither)`);
    if (kind === "square" || kind === "opposition") details.push(`${left.lord}-${right.lord} ${kind}: friction (affects both, favors neither)`);
  }
  return { name: "Harmonious vs friction aspects", scoreA: 0, scoreB: 0, ruleClass: "SHARED", detail: (details.length ? details.join("; ") : "No cross-cluster harmonious or friction aspect.") + " Recorded as evidence only — without separating/applying data there's no rule to assign this to one side, so it does not count toward the winner.", source: "recovered-archive-master" };
}

function kpLayer(kp: { ascendant: { finalKPWinFit: number }; descendant: { finalKPWinFit: number } }): FullPackageLayerEvidence {
  return { name: "KP Star → Sub → Sub–Sub chain", scoreA: round(kp.ascendant.finalKPWinFit), scoreB: round(kp.descendant.finalKPWinFit), ruleClass: "OUTCOME", detail: "Current complete KP family/resonance audit contributes its unmodified A/B final win-fit values to the sandbox synthesis.", source: "current-full-kp" };
}

function buildFrame(
  name: FrameName,
  input: GameInput,
  raw: { ascendantLongitude: number; planets: FramePlanet[] },
  kp: { ascendant: { finalKPWinFit: number }; descendant: { finalKPWinFit: number } },
): FullPackageFrame {
  const mode = name === "God View" ? "god" : "agent";
  let foundation: ReturnType<typeof calculateRestoredTerritorial>;
  let foundationError: string | undefined;
  try {
    foundation = calculateRestoredTerritorial(raw.planets, raw.ascendantLongitude, (longitude) => fixedEclipticHouseFromLongitude(longitude - raw.ascendantLongitude).house, mode);
  } catch (error) {
    foundationError = error instanceof Error ? error.message : String(error);
    foundation = { scoreA: 0, scoreB: 0, evidence: { layers: [], houseLords: [], planetaryWars: [], arabicLots: [], ninePlanetInfluence: [], decans: [] } };
  }
  const entries = houseLords(raw.planets, raw.ascendantLongitude);
  const addedLayers = [
    fixedStarLayer(entries), retrogradeLayer(raw.planets), lunarLayer(raw.planets), chartAspectLayer(raw.planets), moonPhaseLayer(raw.planets), nodesLayer(raw.planets), upachayaLayer(raw.planets), viaCombustaLayer(entries), besiegementLayer(entries, raw.planets), mutualReceptionLayer(entries), translationLayer(entries, raw.planets), frictionLayer(entries), kpLayer(kp),
  ];
  const scoreA = round(foundation.scoreA + addedLayers.filter((layer) => layer.ruleClass !== "SHARED").reduce((sum, layer) => sum + layer.scoreA, 0));
  const scoreB = round(foundation.scoreB + addedLayers.filter((layer) => layer.ruleClass !== "SHARED").reduce((sum, layer) => sum + layer.scoreB, 0));
  const margin = round(Math.abs(scoreA - scoreB));
  const winner = margin < 1.5 ? "TIE" : layerWinner(scoreA, scoreB);
  return {
    name,
    coordinateFrame: name === "God View" ? "fixed-j2000-ecliptic" : "observer-local-ascendant-whole-sign",
    houseRule: name === "God View" ? "permanent-aries-zero-whole-sign" : "local-moving-ascendant-whole-sign",
    ascendantLongitude: round(raw.ascendantLongitude),
    foundation: {
      scoreA: foundation.scoreA,
      scoreB: foundation.scoreB,
      // All seven Territorial foundation layers are placement-driven and differ by side by construction.
      layers: foundation.evidence.layers.map((layer) => ({ ...layer, source: "current-seven-layer-territorial" as const, ruleClass: "SIDE_SPECIFIC" as const })),
    },
    foundationError,
    addedLayers,
    synthesis: { scoreA, scoreB, margin, winner, noCall: winner === "TIE", formula: "Current seven-layer Territorial foundation + each recovered archive addition + current full KP win-fit; all coefficients are fixed at 1.0 and were not tuned to outcomes." },
  };
}

/**
 * Sandbox-only expansion. It deliberately keeps the permanent fixed-house and
 * moving-Ascendant frames separate and does not write validation rows or alter
 * a live prediction path. Its foundation is the current Territorial stack, not
 * a claimed byte-for-byte execution of the separately recovered master engine.
 */
export function runFullPackageDualFrameChallenger(input: GameInput, options: DualFrameRunOptions = {}): FullPackageDualFrameChallenger {
  const existing = runAgentGodFullLayerExperiment(input);
  const god = buildFrame("God View", input, planetsForGod(input), existing.god.kp);
  const rotationMode = options.agentViewRotation ?? "none";
  const agent = buildFrame("Agent’s View", input, planetsForAgent(input, rotationMode), existing.agent.kp);
  const agreement = god.synthesis.winner === "TIE" || agent.synthesis.winner === "TIE"
    ? { state: "no-call" as const, winner: "TIE" as const }
    : god.synthesis.winner === agent.synthesis.winner
      ? { state: "agree" as const, winner: god.synthesis.winner }
      : { state: "split" as const, winner: "TIE" as const };
  return {
    status: "experimental-read-only",
    method: "sandbox-current-foundation-plus-recovered-extensions-v1",
    input,
    recoveredArchiveLayers: FULL_PACKAGE_ADDED_LAYERS,
    god,
    agent,
    agreement,
    boundary: `Sandbox-only current-foundation-plus-archive-extensions challenger (${rotationMode} AgentView rotation). It combines the current seven-layer Territorial foundation and full KP chain with recovered archive additions under each frame’s own house rule. The recovered master source uses a distinct canonical territorial foundation, so this is not an exact master-engine replay. No live winner, live weight, validation model version, frozen run, or outcome is changed. It is not claimed to be the missing Tyson–Douglas or 70–78% method.`,
  };
}

export type LayerDiagnostic = {
  name: string;
  ruleClass: RuleClass;
  scoreA: number;
  scoreB: number;
  /** scoreA - scoreB for this layer alone. Zero for every SHARED layer by construction. */
  differential: number;
  countedTowardWinner: boolean;
};

export type FrameDiagnostic = {
  frame: FrameName;
  sideAContribution: number;
  sideBContribution: number;
  differential: number;
  winner: Winner;
  /** Absolute margin between the two sides — how decisively this frame calls it, not a 0-1 probability. */
  confidence: number;
  foundationError?: string;
  /** Layers that actually moved the differential, sorted by how much they moved it. */
  rulesThatMovedTheWinner: LayerDiagnostic[];
  /** SHARED layers — recorded as evidence/flavor but mathematically inert on the winner. */
  rulesSharedAndCanceled: LayerDiagnostic[];
};

function diagnoseFrame(frame: FullPackageFrame): FrameDiagnostic {
  const allLayers: LayerDiagnostic[] = [
    ...frame.foundation.layers.map((layer) => ({
      name: layer.name,
      ruleClass: layer.ruleClass,
      scoreA: layer.scoreA,
      scoreB: layer.scoreB,
      differential: round(layer.scoreA - layer.scoreB),
      countedTowardWinner: layer.ruleClass !== "SHARED",
    })),
    ...frame.addedLayers.map((layer) => ({
      name: layer.name,
      ruleClass: layer.ruleClass,
      scoreA: layer.scoreA,
      scoreB: layer.scoreB,
      differential: round(layer.scoreA - layer.scoreB),
      countedTowardWinner: layer.ruleClass !== "SHARED",
    })),
  ];
  return {
    frame: frame.name,
    sideAContribution: frame.synthesis.scoreA,
    sideBContribution: frame.synthesis.scoreB,
    differential: round(frame.synthesis.scoreA - frame.synthesis.scoreB),
    winner: frame.synthesis.winner,
    confidence: frame.synthesis.margin,
    foundationError: frame.foundationError,
    rulesThatMovedTheWinner: allLayers
      .filter((layer) => layer.countedTowardWinner)
      .sort((left, right) => Math.abs(right.differential) - Math.abs(left.differential)),
    rulesSharedAndCanceled: allLayers.filter((layer) => !layer.countedTowardWinner),
  };
}

/**
 * Layer-by-layer audit trail for one game: Side A / Side B / differential per frame,
 * which individual rules actually moved that differential (ranked by impact), which
 * rules were SHARED and therefore mathematically inert, the final call, and the
 * margin as a confidence/strength figure. Does not alter any live prediction path.
 */
export function runFullPackageDiagnostic(input: GameInput): { god: FrameDiagnostic; agent: FrameDiagnostic; agreement: FullPackageDualFrameChallenger["agreement"] } {
  const result = runFullPackageDualFrameChallenger(input);
  return { god: diagnoseFrame(result.god), agent: diagnoseFrame(result.agent), agreement: result.agreement };
}
