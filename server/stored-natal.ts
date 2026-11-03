import { getDb, listSavedCharts, createSavedChart } from "./db";
import { getMasterNatalChart } from "./masterChart/builder";
import type { MasterChartInput } from "./masterChart/types";

/** Reuse the existing saved_charts table for authenticated natal snapshots. */
export async function getStoredNatal(openId: string, input: MasterChartInput) {
  if (!openId) throw new Error("Authentication required");
  if (!(await getDb())) throw new Error("Durable storage is not configured");
  const normalized: MasterChartInput = {
    location: input.location, latitude: input.latitude, longitude: input.longitude,
    timezone: input.timezone, date: input.date, time: input.time,
    mode: "natal", worldview: "agent-vs-god",
    sunriseAnchor: input.sunriseAnchor, xyzPositions: input.xyzPositions,
  };
  const records = await listSavedCharts(openId);
  const existing = records.find(row => {
    const savedInput = row.input as MasterChartInput;
    const saved = row.chart as { snapshotId?: string; validation?: { complete?: boolean }; frameConfig?: { engineVersion?: string } };
    return saved?.snapshotId && saved?.validation?.complete === true &&
      saved?.frameConfig?.engineVersion === "firmament-master-2026.1" &&
      equalInputs(savedInput, normalized);
  });
  if (existing) return existing.chart;
  const snapshot = await getMasterNatalChart(normalized);
  if (!snapshot.validation.complete) return snapshot;
  await createSavedChart({
    openId, title: "Master Natal " + snapshot.snapshotId,
    location: normalized.location, input: normalized, chart: snapshot,
  });
  return snapshot;
}

function equalInputs(a: MasterChartInput, b: MasterChartInput): boolean {
  return a?.location === b.location && a?.latitude === b.latitude && a?.longitude === b.longitude && a?.timezone === b.timezone && a?.date === b.date && a?.time === b.time && a?.mode === b.mode && a?.worldview === b.worldview && JSON.stringify(a?.sunriseAnchor) === JSON.stringify(b.sunriseAnchor) && JSON.stringify(a?.xyzPositions) === JSON.stringify(b.xyzPositions);
}
