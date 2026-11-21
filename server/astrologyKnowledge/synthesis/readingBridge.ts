import { createHash } from "node:crypto";
import { formatSynthesisContext } from "./context";
import type { UnifiedMasterChartSnapshot } from "../../masterChart/types";
import type { ChartResult } from "../../astronomy";
import {
  buildUnifiedMasterChart,
  getMasterNatalChart,
} from "../../masterChart/builder";
import { synthesizeSnapshotEvidence } from "./snapshotEvidence";
import type { SynthesisResult } from "./types";

/** All ordinary chart readings enter through the same calculated method ledger. */
async function synthesizeChartForReadingUncached(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined",
  question: string
): Promise<{
  snapshot: UnifiedMasterChartSnapshot;
  synthesis: SynthesisResult;
  context: string;
  canonicalChart: ChartResult;
}> {
  const input = {
    ...chart.input,
    worldview: chart.worldview,
    mode,
    instantUtc: chart.utc,
    ...(mode === "natal" ? {} : { transitInstantUtc: chart.transitDate }),
  };
  if (
    !input.date ||
    (chart.worldview !== "god" &&
      (!input.location ||
        !input.time ||
        !input.timezone ||
        !Number.isFinite(input.latitude) ||
        !Number.isFinite(input.longitude)))
  ) {
    throw new Error(
      "MASTER_INPUT_MISSING: Resolved chart date, time, coordinates and timezone are required; no substitute data is used."
    );
  }
  const snapshot =
    mode === "natal" && chart.worldview === "agent-vs-god"
      ? await getMasterNatalChart(input)
      : await buildUnifiedMasterChart(input);
  // Do not silently interpret a second chart if an earlier client chart differs.
  for (const body of chart.movingBodies) {
    const canonical = snapshot.baseCelestialState.planets.find(
      row => row.name === body.name
    );
    if (!canonical)
      throw new Error(
        `Master Chart is missing ${body.name}; cannot synthesize a divergent reading.`
      );
    const difference = Math.abs(
      ((canonical.longitude - body.longitude + 540) % 360) - 180
    );
    if (difference > 0.01)
      throw new Error(
        `Master Chart mismatch for ${body.name}: ${difference.toFixed(4)}°. Refresh the chart before reading.`
      );
  }
  const angularDifference = (a: number, b: number) =>
    Math.abs(((a - b + 540) % 360) - 180);
  if (
    chart.ascendant &&
    (!snapshot.baseCelestialState.ascendant ||
      angularDifference(
        snapshot.baseCelestialState.ascendant.longitude,
        chart.ascendant.longitude
      ) > 0.01)
  ) {
    throw new Error(
      "Master Chart Ascendant mismatch. Refresh the chart before reading."
    );
  }
  if (
    chart.houses.length !== (snapshot.natal?.houses ?? []).length ||
    chart.houses.some(
      (cusp, index) =>
        angularDifference(cusp, snapshot.natal!.houses[index]) > 0.01
    )
  ) {
    throw new Error(
      "Master Chart equal-house cusp mismatch. Refresh the chart before reading."
    );
  }
  if (
    mode !== "natal" &&
    chart.transits.length > 0 !== Boolean(snapshot.transit?.planets.length)
  ) {
    throw new Error(
      "Master Chart transit coverage mismatch. Refresh the chart before reading."
    );
  }
  if (mode !== "natal" && chart.transits.length) {
    for (const transit of chart.transits) {
      const canonical = snapshot.transit?.planets.find(
        row => row.name === transit.name
      );
      if (
        !canonical ||
        angularDifference(canonical.longitude, transit.longitude) > 0.01
      ) {
        throw new Error(
          `Master Chart transit mismatch for ${transit.name}. Refresh the chart before reading.`
        );
      }
    }
  }
  return synthesizeMasterSnapshot(snapshot, mode, question);
}

/** Assemble reading context from a server-created snapshot without recalculating it. */
export async function synthesizeMasterSnapshot(
  snapshot: UnifiedMasterChartSnapshot,
  mode: "natal" | "transit" | "combined",
  question: string
) {
  const result = await synthesizeSnapshotEvidence(snapshot, mode, question);
  return { ...result, context: formatSynthesisContext(result.synthesis) };
}

// Reuse concurrent/repeated reads of the exact same source chart and question.
// Client-supplied method bindings are never trusted as calculation evidence.
const verifiedReadings = new Map<
  string,
  {
    expiresAt: number;
    promise: ReturnType<typeof synthesizeChartForReadingUncached>;
  }
>();
export async function synthesizeChartForReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined",
  question: string
) {
  const { methodBindings: _ignored, ...source } = chart;
  const key = createHash("sha256")
    .update(JSON.stringify({ source, mode, question }))
    .digest("hex");
  const cached = verifiedReadings.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = synthesizeChartForReadingUncached(chart, mode, question);
  verifiedReadings.set(key, { expiresAt: Date.now() + 60_000, promise });
  while (verifiedReadings.size > 8)
    verifiedReadings.delete(verifiedReadings.keys().next().value!);
  try {
    return await promise;
  } catch (error) {
    if (verifiedReadings.get(key)?.promise === promise)
      verifiedReadings.delete(key);
    throw error;
  }
}
