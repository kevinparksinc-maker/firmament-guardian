import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SimulationEventInput } from "./engine/simulationAdapter";
import { runSimulationBatch } from "./engine/simulationAdapter";

type SimulationResult = ReturnType<typeof runSimulationBatch>["results"][number];
type ViewName = "God View" | "Agent View";

export type MethodGameRow = {
  gameNumber: number;
  gameId: string;
  view: ViewName;
  method: string;
  result: "HIT" | "MISSED" | "NOT EVALUABLE";
  rawVerdict: string;
  hit: boolean;
  prediction: "A" | "B" | "TIE";
  actualResult: "A" | "B" | "TIE" | "UNVERIFIED";
  scoreA: number;
  scoreB: number;
  detail: string;
};

export type MethodAggregate = {
  view: ViewName;
  method: string;
  hits: number;
  misses: number;
  notEvaluable: number;
  hitRate: number;
  gamesTested: number;
};

export type SimulationReport = {
  generatedAt: string;
  gameCount: number;
  games: Array<{
    gameNumber: number;
    gameId: string;
    teamA: string;
    teamB: string;
    matchup: string;
    sport: string;
    location: string;
    startTime: string;
    finalSimulatedResult: string;
    baselineVerdict: string;
    godView: { hits: number; misses: number; notEvaluable: number; total: number; hitRate: number; evaluableHitRate: number; methods: MethodGameRow[] };
    agentView: { hits: number; misses: number; notEvaluable: number; total: number; hitRate: number; evaluableHitRate: number; methods: MethodGameRow[] };
    totalHits: number;
    totalMisses: number;
    totalNotEvaluable: number;
    totalEvaluations: number;
    totalHitPercentage: number;
    evaluableHitPercentage: number;
  }>;
  methodAggregates: MethodAggregate[];
  summary: {
    averageTotalHitsPerGame: number;
    averageGodViewHitsPerGame: number;
    averageAgentViewHitsPerGame: number;
    averageEvaluableMethodsPerGame: number;
    overallHitPercentage: number;
    bestPerformingMethod: MethodAggregate | null;
    worstPerformingMethod: MethodAggregate | null;
    methodsWithZeroHits: MethodAggregate[];
    unusuallyHighHitRateMethods: MethodAggregate[];
  };
  rawResults: SimulationResult[];
};

function methodRows(result: SimulationResult, gameNumber: number, view: ViewName, layers: SimulationResult["godView"]["allLayers"]): MethodGameRow[] {
  const actualResult = result.comparison.actualWinner ?? "UNVERIFIED";
  return layers.map((layer) => ({
    gameNumber,
    gameId: result.id,
    view,
    method: layer.name,
    result: layer.verdict === "hit" ? "HIT" : layer.verdict === "miss" ? "MISSED" : "NOT EVALUABLE",
    rawVerdict: layer.verdict,
    hit: layer.verdict === "hit",
    prediction: layer.winner,
    actualResult,
    scoreA: layer.scoreA,
    scoreB: layer.scoreB,
    detail: layer.detail,
  }));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function aggregateRows(rows: MethodGameRow[]): MethodAggregate[] {
  const grouped = new Map<string, MethodAggregate>();
  for (const row of rows) {
    const key = `${row.view}\u0000${row.method}`;
    const current = grouped.get(key) ?? { view: row.view, method: row.method, hits: 0, misses: 0, notEvaluable: 0, hitRate: 0, gamesTested: 0 };
    current.hits += row.hit ? 1 : 0;
    current.misses += row.rawVerdict === "miss" ? 1 : 0;
    current.notEvaluable += row.rawVerdict === "hit" || row.rawVerdict === "miss" ? 0 : 1;
    current.gamesTested += 1;
    current.hitRate = round((current.hits / Math.max(current.hits + current.misses, 1)) * 100);
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).sort((a, b) => b.hitRate - a.hitRate || b.hits - a.hits || a.view.localeCompare(b.view) || a.method.localeCompare(b.method));
}

export function buildSimulationReport(results: SimulationResult[]): SimulationReport {
  const gameRows = results.map((result, index) => {
    const gameNumber = index + 1;
    const godMethods = methodRows(result, gameNumber, "God View", result.godView.allLayers);
    const agentMethods = methodRows(result, gameNumber, "Agent View", result.agentView.allLayers);
    const allMethods = [...godMethods, ...agentMethods];
    const godHits = godMethods.filter((row) => row.hit).length;
    const agentHits = agentMethods.filter((row) => row.hit).length;
    const godMisses = godMethods.filter((row) => row.rawVerdict === "miss").length;
    const agentMisses = agentMethods.filter((row) => row.rawVerdict === "miss").length;
    const godNotEvaluable = godMethods.length - godHits - godMisses;
    const agentNotEvaluable = agentMethods.length - agentHits - agentMisses;
    const totalHits = godHits + agentHits;
    const totalMisses = godMisses + agentMisses;
    const totalNotEvaluable = godNotEvaluable + agentNotEvaluable;
    return {
      gameNumber,
      gameId: result.id,
      teamA: result.input.teamA,
      teamB: result.input.teamB,
      matchup: `${result.input.teamA} vs ${result.input.teamB}`,
      sport: result.input.sport,
      location: result.input.location,
      startTime: result.input.startTime,
      finalSimulatedResult: result.baseline.winner === "A" ? result.input.teamA : result.baseline.winner === "B" ? result.input.teamB : "No clear winner",
      baselineVerdict: result.baseline.verdict,
      godView: { hits: godHits, misses: godMisses, notEvaluable: godNotEvaluable, total: godMethods.length, hitRate: round((godHits / Math.max(godMethods.length, 1)) * 100), evaluableHitRate: round((godHits / Math.max(godHits + godMisses, 1)) * 100), methods: godMethods },
      agentView: { hits: agentHits, misses: agentMisses, notEvaluable: agentNotEvaluable, total: agentMethods.length, hitRate: round((agentHits / Math.max(agentMethods.length, 1)) * 100), evaluableHitRate: round((agentHits / Math.max(agentHits + agentMisses, 1)) * 100), methods: agentMethods },
      totalHits,
      totalMisses,
      totalNotEvaluable,
      totalEvaluations: allMethods.length,
      totalHitPercentage: round((totalHits / Math.max(allMethods.length, 1)) * 100),
      evaluableHitPercentage: round((totalHits / Math.max(totalHits + totalMisses, 1)) * 100),
    };
  });
  const rows = gameRows.flatMap((game) => [...game.godView.methods, ...game.agentView.methods]);
  const methodAggregates = aggregateRows(rows);
  const totalEvaluations = rows.length;
  const totalHits = rows.filter((row) => row.hit).length;
  const rankable = methodAggregates.filter((method) => method.hits + method.misses > 0);
  const best = rankable[0] ?? null;
  const worst = rankable.at(-1) ?? null;
  return {
    generatedAt: new Date().toISOString(),
    gameCount: results.length,
    games: gameRows,
    methodAggregates,
    summary: {
      averageTotalHitsPerGame: round(gameRows.reduce((sum, game) => sum + game.totalHits, 0) / Math.max(gameRows.length, 1)),
      averageGodViewHitsPerGame: round(gameRows.reduce((sum, game) => sum + game.godView.hits, 0) / Math.max(gameRows.length, 1)),
      averageAgentViewHitsPerGame: round(gameRows.reduce((sum, game) => sum + game.agentView.hits, 0) / Math.max(gameRows.length, 1)),
      averageEvaluableMethodsPerGame: round(gameRows.reduce((sum, game) => sum + game.totalHits + game.totalMisses, 0) / Math.max(gameRows.length, 1)),
      overallHitPercentage: round((totalHits / Math.max(totalHits + rows.filter((row) => row.rawVerdict === "miss").length, 1)) * 100),
      bestPerformingMethod: best,
      worstPerformingMethod: worst,
      methodsWithZeroHits: methodAggregates.filter((method) => method.hits === 0 && method.misses > 0),
      unusuallyHighHitRateMethods: methodAggregates.filter((method) => method.hits + method.misses >= 2 && method.hitRate >= 75),
    },
    rawResults: results,
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportRows(report: SimulationReport): MethodGameRow[] {
  return report.games.flatMap((game) => [...game.godView.methods, ...game.agentView.methods]);
}

export function reportToCsv(report: SimulationReport) {
  const headers = ["game_number", "game_id", "view", "method", "result", "hit", "prediction", "actual_result", "score_a", "score_b", "detail"];
  const lines = [headers.join(",")];
  for (const row of reportRows(report)) {
    lines.push([row.gameNumber, row.gameId, row.view, row.method, row.result, row.hit, row.prediction, row.actualResult, row.scoreA, row.scoreB, row.detail].map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function formatSimulationReport(report: SimulationReport) {
  const lines: string[] = [];
  lines.push("FIRMAMENT SIMULATION REPORT");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Games simulated: ${report.gameCount}`);
  lines.push("");
  for (const game of report.games) {
    lines.push(`=== GAME ${game.gameNumber}: ${game.matchup} ===`);
    lines.push(`Game ID: ${game.gameId} | ${game.sport} | ${game.location} | ${game.startTime}`);
    lines.push(`Final simulated result: ${game.finalSimulatedResult} | Baseline: ${game.baselineVerdict.toUpperCase()}`);
    lines.push(`Total hits: ${game.totalHits}/${game.totalEvaluations} (${game.totalHitPercentage}% of all evaluations)`);
    lines.push(`Missed: ${game.totalMisses} | Not evaluable: ${game.totalNotEvaluable} | Evaluable hit rate: ${game.evaluableHitPercentage}%`);
    lines.push(`God View hits: ${game.godView.hits}/${game.godView.total} (${game.godView.evaluableHitRate}% of evaluable methods) | Missed: ${game.godView.misses} | Not evaluable: ${game.godView.notEvaluable}`);
    lines.push(`Agent View hits: ${game.agentView.hits}/${game.agentView.total} (${game.agentView.evaluableHitRate}% of evaluable methods) | Missed: ${game.agentView.misses} | Not evaluable: ${game.agentView.notEvaluable}`);
    lines.push("");
    lines.push("God View methods:");
    for (const row of game.godView.methods) lines.push(`  ${row.result.padEnd(4)} ${row.method} | prediction=${row.prediction === "A" ? game.teamA : row.prediction === "B" ? game.teamB : "TIE"} (${row.prediction}) | scores A:${row.scoreA} B:${row.scoreB}`);
    lines.push("");
    lines.push("Agent View methods:");
    for (const row of game.agentView.methods) lines.push(`  ${row.result.padEnd(4)} ${row.method} | prediction=${row.prediction === "A" ? game.teamA : row.prediction === "B" ? game.teamB : "TIE"} (${row.prediction}) | scores A:${row.scoreA} B:${row.scoreB}`);
    lines.push("");
  }
  lines.push("=== AGGREGATE REPORT ===");
  lines.push(`Average total hits per game: ${report.summary.averageTotalHitsPerGame}`);
  lines.push(`Average God View hits per game: ${report.summary.averageGodViewHitsPerGame}`);
  lines.push(`Average Agent View hits per game: ${report.summary.averageAgentViewHitsPerGame}`);
  lines.push(`Average evaluable methods per game: ${report.summary.averageEvaluableMethodsPerGame}`);
  lines.push(`Overall hit percentage among evaluable methods: ${report.summary.overallHitPercentage}%`);
  lines.push(`Best-performing method: ${report.summary.bestPerformingMethod ? `${report.summary.bestPerformingMethod.view} / ${report.summary.bestPerformingMethod.method} (${report.summary.bestPerformingMethod.hitRate}%)` : "N/A"}`);
  lines.push(`Worst-performing method: ${report.summary.worstPerformingMethod ? `${report.summary.worstPerformingMethod.view} / ${report.summary.worstPerformingMethod.method} (${report.summary.worstPerformingMethod.hitRate}%)` : "N/A"}`);
  lines.push(`Methods with 0 hits: ${report.summary.methodsWithZeroHits.length ? report.summary.methodsWithZeroHits.map((method) => `${method.view} / ${method.method}`).join("; ") : "None"}`);
  lines.push(`Unusually high hit rates (>=75%): ${report.summary.unusuallyHighHitRateMethods.length ? report.summary.unusuallyHighHitRateMethods.map((method) => `${method.view} / ${method.method} (${method.hitRate}%)`).join("; ") : "None"}`);
  lines.push("");
  lines.push("Method ranking (highest to lowest hit rate):");
  lines.push("View | Method | Hits | Misses | Not evaluable | Hit rate | Games tested");
  for (const method of report.methodAggregates) lines.push(`${method.view} | ${method.method} | ${method.hits} | ${method.misses} | ${method.notEvaluable} | ${method.hitRate}% | ${method.gamesTested}`);
  return `${lines.join("\n")}\n`;
}

export async function writeSimulationExports(report: SimulationReport, outputDirectory = join(process.cwd(), "simulation-results")) {
  await mkdir(outputDirectory, { recursive: true });
  const date = new Date(report.generatedAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  const jsonPath = join(outputDirectory, `simulation-results-${stamp}.json`);
  const csvPath = join(outputDirectory, `simulation-results-${stamp}.csv`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(csvPath, reportToCsv(report), "utf8");
  return { jsonPath, csvPath };
}

export function runAndBuildSimulationReport(events: SimulationEventInput[]) {
  return buildSimulationReport(runSimulationBatch(events).results);
}
