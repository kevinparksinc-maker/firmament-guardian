import { calculateChart, type ChartInput, type ChartResult } from "./astronomy";

/**
 * Shared chart-result access for routes and interpreters.
 * Cache is process-local, bounded and versioned: it is NOT persistent profile storage.
 * The same input and engine contract share a single in-flight computation/result.
 * A durable Master Natal repository remains necessary across deployments/restarts.
 */
export const CHART_SNAPSHOT_VERSION = "acif-chart-snapshot-2026.2";
const MAX_SNAPSHOTS = 128;
const snapshots = new Map<string, Promise<ChartResult>>();

function snapshotKey(input: ChartInput): string {
  // Normalize object property order (including externally supplied XYZ maps).
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, canonical(entry)])
      );
    }
    return value;
  }
  return JSON.stringify([CHART_SNAPSHOT_VERSION, canonical(input)]);
}

/** All callers should retrieve the same immutable snapshot for identical inputs. */
export async function getChartSnapshot(input: ChartInput): Promise<ChartResult> {
  const key = snapshotKey(input);
  const found = snapshots.get(key);
  if (found) {
    snapshots.delete(key);
    snapshots.set(key, found);
    return found;
  }
  const pending = calculateChart(input);
  snapshots.set(key, pending);
  while (snapshots.size > MAX_SNAPSHOTS) {
    const oldest = snapshots.keys().next().value;
    if (oldest === undefined) break;
    snapshots.delete(oldest);
  }
  try {
    return await pending;
  } catch (error) {
    if (snapshots.get(key) === pending) snapshots.delete(key);
    throw error;
  }
}
