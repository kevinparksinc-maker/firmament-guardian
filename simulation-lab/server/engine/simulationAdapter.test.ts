import { describe, expect, it } from "vitest";
import { runSimulationBatch, runSimulationEvent, verdictFor } from "./simulationAdapter";

const fixture = {
  id: "fixture-dodgers-giants",
  teamA: "Los Angeles Dodgers",
  teamB: "San Francisco Giants",
  sport: "MLB" as const,
  location: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
  startTime: "2024-06-15T19:10:00.000Z",
  actualWinner: "A" as const,
};

describe("simulation adapter", () => {
  it("does not score a no-signal tie against a real winner as a miss", () => {
    expect(verdictFor("TIE", "A")).toBe("unverified");
    expect(verdictFor("TIE", "B")).toBe("unverified");
    expect(verdictFor("TIE", "TIE")).toBe("tie");
    expect(verdictFor("A", "TIE")).toBe("miss");
  });

  it("returns the full chart and both frame outputs from the Firmament engine", () => {
    const result = runSimulationEvent(fixture);

    expect(result.engine.source).toBe("firmament-engine");
    expect(result.engine.hamalAnchor).toContain("13° Aries");
    expect(result.chart.godView.planets).toHaveLength(9);
    expect(result.chart.godView.houses).toHaveLength(12);
    expect(result.chart.agentView.planets).toHaveLength(9);
    expect(result.godView.name).toBe("God View");
    expect(result.agentView.name).toBe("Agent’s View");
    expect(result.godView.allLayers.length).toBeGreaterThan(0);
    expect(result.agentView.allLayers.length).toBeGreaterThan(0);
  });

  it("labels each layer against the verified historical winner", () => {
    const result = runSimulationEvent(fixture);
    const verdicts = new Set(result.godView.allLayers.map((layer) => layer.verdict));

    expect(verdicts).toContain("hit");
    expect(verdicts).toContain("miss");
    expect(result.baseline.verdict).toBe("miss");
    expect(result.comparison.verified).toBe(true);
  });

  it("keeps unverified events separate from accuracy calculations", () => {
    const result = runSimulationBatch([fixture, { ...fixture, id: "unverified", actualWinner: undefined }]);

    expect(result.summary.total).toBe(2);
    expect(result.summary.verified).toBe(1);
    expect(result.summary.unverified).toBe(1);
    expect(result.summary.baselineAccuracy).toBe(0);
    expect(result.results[1]?.baseline.verdict).toBe("unverified");
  });

  it("produces byte-identical output for the same fixture in one process", () => {
    const first = runSimulationEvent(fixture);
    const second = runSimulationEvent(fixture);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
