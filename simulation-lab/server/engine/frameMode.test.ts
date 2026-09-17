import { describe, expect, it } from "vitest";
import { generatePredictionForModel } from "./firmamentEngine";
import { runFullPackageDualFrameChallenger } from "./fullPackageDualFrameChallenger";
import { runSimulationEvent } from "./simulationAdapter";

const event = {
  teamA: "New York Yankees",
  teamB: "Houston Astros",
  gameType: "MLB",
  location: "Houston, TX",
  startTime: new Date("2024-04-01T19:10:00.000Z"),
  coordinates: { latitude: 29.7604, longitude: -95.3698 },
} as const;

describe("dual-frame house systems", () => {
  it("keeps God View fixed and derives AgentView from event time and location", () => {
    const azimuthPrediction = generatePredictionForModel(event, "azimuth");
    const result = runFullPackageDualFrameChallenger(event);

    expect(result.god.coordinateFrame).toBe("fixed-j2000-ecliptic");
    expect(result.god.houseRule).toBe("permanent-aries-zero-whole-sign");
    expect(result.god.ascendantLongitude).toBe(0);

    expect(result.agent.coordinateFrame).toBe("observer-local-ascendant-whole-sign");
    expect(result.agent.houseRule).toBe("local-moving-ascendant-whole-sign");
    expect(result.agent.ascendantLongitude).toBeCloseTo(azimuthPrediction.ascendantLongitude, 2);
    expect(result.agent.ascendantLongitude).not.toBe(result.god.ascendantLongitude);
    expect(result.agent.foundationError).toBeUndefined();
    expect(result.agent.foundation.layers.length).toBeGreaterThan(0);
    expect(
      result.agent.foundation.scoreA !== result.god.foundation.scoreA ||
        result.agent.foundation.scoreB !== result.god.foundation.scoreB,
    ).toBe(true);
  });

  it("supports explicit 180-degree AgentView experiments without changing God View", () => {
    const baseline = runFullPackageDualFrameChallenger(event);
    const ascendantOnly = runFullPackageDualFrameChallenger(event, { agentViewRotation: "ascendant-only" });
    const wholeChart = runFullPackageDualFrameChallenger(event, { agentViewRotation: "whole-chart" });
    const rotatedAscendant = (baseline.agent.ascendantLongitude + 180) % 360;

    expect(ascendantOnly.god.ascendantLongitude).toBe(baseline.god.ascendantLongitude);
    expect(wholeChart.god.synthesis).toEqual(baseline.god.synthesis);
    expect(ascendantOnly.agent.ascendantLongitude).toBeCloseTo(rotatedAscendant, 2);
    expect(wholeChart.agent.ascendantLongitude).toBeCloseTo(rotatedAscendant, 2);
    expect(ascendantOnly.agent.foundationError).toBeUndefined();
    expect(wholeChart.agent.foundationError).toBeUndefined();
    expect(ascendantOnly.agent.foundation).not.toEqual(baseline.agent.foundation);
    expect(wholeChart.agent.foundation).not.toEqual(ascendantOnly.agent.foundation);
  });

  it("passes 180-degree AgentView through the standard method evaluator", () => {
    const baseline = runSimulationEvent({ ...event, actualWinner: "B" });
    const rotated = runSimulationEvent({ ...event, actualWinner: "B", agentViewRotation: "ascendant-only" });

    expect(rotated.godView.allLayers).toHaveLength(20);
    expect(rotated.agentView.allLayers).toHaveLength(20);
    expect(rotated.agentView.ascendantLongitude).toBeCloseTo((baseline.agentView.ascendantLongitude + 180) % 360, 2);
    expect(rotated.godView.ascendantLongitude).toBe(baseline.godView.ascendantLongitude);
  });
});
