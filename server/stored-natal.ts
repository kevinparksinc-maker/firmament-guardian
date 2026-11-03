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
  const snapshot = await getMasterNatalChart(normalized);
  const records = await listSavedCharts(openId);
  const existing = records.find(row => {
    const saved = row.chart as { snapshotId?: string; validation?: { complete?: boolean } };
    return saved?.snapshotId === snapshot.snapshotId && saved?.validation?.complete === true;
  });
  if (existing) return existing.chart;
  if (!snapshot.validation.complete) return snapshot;
  await createSavedChart({
    openId, title: "Master Natal " + snapshot.snapshotId,
    location: normalized.location, input: normalized, chart: snapshot,
  });
  return snapshot;
}
