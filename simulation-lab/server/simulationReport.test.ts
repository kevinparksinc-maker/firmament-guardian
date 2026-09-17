import { describe, expect, it } from "vitest";
import { buildSimulationReport, reportToCsv, runAndBuildSimulationReport } from "./simulationReport";

const fixture = {
  id: "report-fixture",
  teamA: "Los Angeles Dodgers",
  teamB: "San Francisco Giants",
  sport: "MLB" as const,
  location: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
  startTime: "2024-06-15T19:10:00.000Z",
  actualWinner: "A" as const,
};

describe("terminal simulation report", () => {
  it("preserves all 40 frame-method evaluations for a game", () => {
    const report = runAndBuildSimulationReport([fixture]);
    expect(report.games).toHaveLength(1);
    expect(report.games[0]?.godView.methods).toHaveLength(20);
    expect(report.games[0]?.agentView.methods).toHaveLength(20);
    expect(report.games[0]?.totalEvaluations).toBe(40);
    expect(report.methodAggregates).toHaveLength(40);
  });

  it("sorts aggregate methods by hit rate and exposes summary statistics", () => {
    const report = runAndBuildSimulationReport([fixture, { ...fixture, id: "report-fixture-2", actualWinner: "B" as const }]);
    expect(report.summary.overallHitPercentage).toBeGreaterThanOrEqual(0);
    expect(report.methodAggregates[0]!.hitRate).toBeGreaterThanOrEqual(report.methodAggregates.at(-1)!.hitRate);
    expect(report.summary.bestPerformingMethod).not.toBeNull();
    expect(report.summary.worstPerformingMethod).not.toBeNull();
    expect(report.summary.bestPerformingMethod!.hits + report.summary.bestPerformingMethod!.misses).toBeGreaterThan(0);
    expect(report.summary.worstPerformingMethod!.hits + report.summary.worstPerformingMethod!.misses).toBeGreaterThan(0);
    expect(report.summary.methodsWithZeroHits.every((method) => method.misses > 0)).toBe(true);
    expect(report.summary.unusuallyHighHitRateMethods.every((method) => method.hits + method.misses >= 2)).toBe(true);
  });

  it("exports one CSV row per method per frame evaluation", () => {
    const report = buildSimulationReport([]);
    const csv = reportToCsv(report);
    expect(csv.split("\n")[0]).toBe("game_number,game_id,view,method,result,hit,prediction,actual_result,score_a,score_b,detail");
  });

  it("does not classify an unverified game as a miss", () => {
    const report = runAndBuildSimulationReport([{ ...fixture, id: "unverified-report-fixture", actualWinner: undefined }]);
    const methods = report.games[0]!.godView.methods;
    expect(methods.every((method) => method.result === "NOT EVALUABLE")).toBe(true);
    expect(report.games[0]!.godView.notEvaluable).toBe(20);
    expect(report.games[0]!.godView.misses).toBe(0);
  });
});
