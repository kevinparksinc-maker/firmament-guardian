import {
  generateFixedJ2000KPPrediction,
  generatePredictionForModel,
  runFullPackageDualFrameChallenger,
  type AgentViewRotationMode,
  type GameInput,
} from "./index";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type SimulationEventInput = {
  id?: string;
  teamA: string;
  teamB: string;
  sport: GameInput["gameType"];
  location: string;
  latitude?: number;
  longitude?: number;
  startTime: string;
  actualWinner?: "A" | "B" | "TIE";
  agentViewRotation?: AgentViewRotationMode;
};

type Winner = "A" | "B" | "TIE";
export type ForecastRole = "ASCENDANT" | "DESCENDANT" | "TIE";

type LayerResult = {
  name: string;
  scoreA: number;
  scoreB: number;
  winner: Winner;
  role: ForecastRole;
  verdict: "hit" | "miss" | "tie" | "unverified";
  detail: string;
  source: string;
};

function winnerFor(scoreA: number, scoreB: number): Winner {
  if (scoreA === scoreB) return "TIE";
  return scoreA > scoreB ? "A" : "B";
}

export function roleForWinner(winner: Winner): ForecastRole {
  return winner === "A" ? "ASCENDANT" : winner === "B" ? "DESCENDANT" : "TIE";
}

function houseRole(house: number): ForecastRole {
  return [1, 2, 3, 6, 10, 11].includes(house) ? "ASCENDANT" : "DESCENDANT";
}

export function verdictFor(winner: Winner, actualWinner?: Winner): LayerResult["verdict"] {
  if (!actualWinner) return "unverified";
  if (winner === "TIE") return actualWinner === "TIE" ? "tie" : "unverified";
  if (actualWinner === "TIE") return "miss";
  return winner === actualWinner ? "hit" : "miss";
}

function engineFileChecksum() {
  try {
    const enginePath = fileURLToPath(new URL("./firmamentEngine.ts", import.meta.url));
    return createHash("sha256").update(readFileSync(enginePath)).digest("hex");
  } catch {
    return "unavailable";
  }
}

function layerFromEvidence(
  layer: { name: string; scoreA: number; scoreB: number; detail: string; source?: string },
  actualWinner?: Winner,
): LayerResult {
  const winner = winnerFor(layer.scoreA, layer.scoreB);
  return {
    name: layer.name,
    scoreA: Number(layer.scoreA.toFixed(3)),
    scoreB: Number(layer.scoreB.toFixed(3)),
    winner,
    role: roleForWinner(winner),
    verdict: verdictFor(winner, actualWinner),
    detail: layer.detail,
    source: layer.source ?? "firmament-engine",
  };
}

function chartSnapshot(prediction: ReturnType<typeof generateFixedJ2000KPPrediction>) {
  return {
    domeModel: prediction.domeModel,
    venue: prediction.venue,
    ascendantLongitude: prediction.ascendantLongitude,
    localSiderealTime: prediction.localSiderealTime,
    houses: prediction.houses.map((house) => ({
      house: house.house,
      cluster: house.cluster,
      cuspLongitude: Number(house.cuspLongitude.toFixed(4)),
      sign: house.sign,
      starLord: house.starLord,
      subLord: house.subLord,
      subLordHouse: house.subLordHouse,
      subLordAllegiance: house.subLordAllegiance,
    })),
    planets: prediction.planets.map((planet) => ({
      planet: planet.planet,
      tropicalLongitude: Number(planet.tropicalLongitude.toFixed(4)),
      fixedBackgroundLongitude: Number(planet.fixedJ2000EclipticLongitude.toFixed(4)),
      house: planet.house,
      sign: planet.sign,
      degreeInHouse: Number(planet.degreeInHouse.toFixed(4)),
      nakshatra: planet.nakshatra,
      pada: planet.pada,
      starLord: planet.starLord,
      subLord: planet.subLord,
      isRetrograde: planet.isRetrograde,
    })),
  };
}

function frameReport(
  frame: ReturnType<typeof runFullPackageDualFrameChallenger>["god"],
  actualWinner?: Winner,
) {
  const foundation = frame.foundation.layers.map((layer) => layerFromEvidence(layer, actualWinner));
  const added = frame.addedLayers.map((layer) => layerFromEvidence(layer, actualWinner));
  const allLayers = [...foundation, ...added];
  return {
    name: frame.name,
    coordinateFrame: frame.coordinateFrame,
    houseRule: frame.houseRule,
    ascendantLongitude: frame.ascendantLongitude,
    houseRoles: Array.from({ length: 12 }, (_, index) => ({ house: index + 1, role: houseRole(index + 1) })),
    synthesis: {
      ...frame.synthesis,
      role: roleForWinner(frame.synthesis.winner),
      verdict: verdictFor(frame.synthesis.winner, actualWinner),
    },
    foundation,
    added,
    allLayers,
    summary: {
      hits: allLayers.filter((layer) => layer.verdict === "hit").length,
      misses: allLayers.filter((layer) => layer.verdict === "miss").length,
      ties: allLayers.filter((layer) => layer.verdict === "tie").length,
      unverified: allLayers.filter((layer) => layer.verdict === "unverified").length,
    },
  };
}

export function runSimulationEvent(input: SimulationEventInput) {
  const startTime = new Date(input.startTime);
  if (Number.isNaN(startTime.getTime())) throw new Error("startTime must be a valid ISO date");
  const gameInput: GameInput = {
    teamA: input.teamA,
    teamB: input.teamB,
    gameType: input.sport,
    location: input.location,
    startTime,
    ...(input.latitude !== undefined && input.longitude !== undefined
      ? { coordinates: { latitude: input.latitude, longitude: input.longitude } }
      : {}),
  };

  const activePrediction = generateFixedJ2000KPPrediction(gameInput);
  const agentPrediction = generatePredictionForModel(gameInput, "azimuth");
  const dualFrame = runFullPackageDualFrameChallenger(gameInput, { agentViewRotation: input.agentViewRotation ?? "none" });
  const actualWinner = input.actualWinner;
  const baselineWinner = activePrediction.combined.winner as Winner;
  const baselineVerdict = verdictFor(baselineWinner, actualWinner);

  return {
    id: input.id ?? `${input.teamA}-${input.teamB}-${input.startTime}`,
    input: { ...input, startTime: startTime.toISOString() },
    engine: {
      source: "firmament-engine",
      engineFileChecksum: engineFileChecksum(),
      calculationPath: "generateFixedJ2000KPPrediction + runFullPackageDualFrameChallenger",
      fixedBackground: "fixed-j2000-ecliptic compatibility frame",
      hamalAnchor: "13° Aries (configuration boundary; engine adapter does not silently alter formulas)",
    },
    chart: {
      godView: chartSnapshot(activePrediction),
      agentView: chartSnapshot(agentPrediction as ReturnType<typeof generateFixedJ2000KPPrediction>),
    },
    baseline: {
      territorial: activePrediction.territorial,
      kpStellar: activePrediction.kpStellar,
      combined: activePrediction.combined,
      winner: baselineWinner,
      role: roleForWinner(baselineWinner),
      verdict: baselineVerdict,
    },
    godView: frameReport(dualFrame.god, actualWinner),
    agentView: frameReport(dualFrame.agent, actualWinner),
    comparison: {
      state: dualFrame.agreement.state,
      winner: dualFrame.agreement.winner,
      role: roleForWinner(dualFrame.agreement.winner),
      actualWinner: actualWinner ?? null,
      actualRole: actualWinner ? roleForWinner(actualWinner) : null,
      verified: Boolean(actualWinner),
    },
  };
}

export function runSimulationBatch(events: SimulationEventInput[]) {
  const results = events.map((event) => runSimulationEvent(event));
  const verified = results.filter((result) => result.comparison.verified);
  const hits = verified.filter((result) => result.baseline.verdict === "hit").length;
  return {
    results,
    summary: {
      total: results.length,
      verified: verified.length,
      unverified: results.length - verified.length,
      baselineHits: hits,
      baselineMisses: verified.length - hits,
      baselineAccuracy: verified.length ? Number(((hits / verified.length) * 100).toFixed(1)) : null,
    },
  };
}
