import { readingProse } from "@shared/readingProse";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import {
  placementMiniIdentity,
  placementRows,
} from "@shared/placementMiniReadings";
import type { ChartResult } from "../../../server/astronomy";

type MiniBatch = Awaited<
  ReturnType<
    typeof import("../../../server/chartPageReading").buildChartPageReading
  >
>;
const storagePrefix = "absolute:placement-minis:";

export function usePlacementMiniReadings(
  chart: ChartResult,
  layer: "natal" | "transit" = "natal",
  names: string[] = ["Sun", "Moon"],
  enabled = true
) {
  const generate = trpc.interpretation.chartPageStart.useMutation();
  const trpcUtils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const identity = placementMiniIdentity(
    chart,
    layer,
    me.data?.openId || "guest"
  );
  return useQuery({
    queryKey: ["placement-mini-readings", identity, ...names],
    enabled: enabled && !me.isPending,
    queryFn: async () => {
      // One persisted batch per exact natal chart/framework/account. Live sky
      // refreshes do not spend another natal interpretation request.
      const batchKey = storagePrefix + identity + ":batch:" + names.join(",");
      try {
        const cachedBatch = JSON.parse(
          localStorage.getItem(batchKey) || "null"
        ) as MiniBatch | null;
        if (
          cachedBatch?.snapshotId &&
          cachedBatch.placements?.length === names.length &&
          names.every(name => cachedBatch.placements.some(p => p.name === name))
        )
          return cachedBatch;
      } catch {
        /* Storage is optional. */
      }
      const keyFor = (name: string) => storagePrefix + identity + ":" + name;
      const saved = names.map(name => {
        try {
          const value = JSON.parse(
            localStorage.getItem(keyFor(name)) || "null"
          ) as MiniBatch | null;
          return value?.snapshotId &&
            value.placements?.length === 1 &&
            value.placements[0].name === name &&
            value.placements[0].paragraph?.length >= 120 &&
            Array.isArray(value.placements[0].evidence)
            ? value
            : null;
        } catch {
          return null;
        }
      });
      if (saved.every(Boolean))
        return {
          snapshotId: saved[0]!.snapshotId,
          placements: saved.flatMap(value => value!.placements),
        };
      // Start NVIDIA synthesis in the server and poll short-lived HTTP calls.
      // Holding a mutation open during generation causes Render HTML 502s.
      const { jobId } = await generate.mutateAsync({ chart, mode: layer, names });
      let result: MiniBatch | undefined;
      for (let poll = 0; poll < 90; poll++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await trpcUtils.interpretation.chartPageStatus.fetch({ jobId });
        if (status.state === "error")
          throw new Error(status.error);
        if (status.state === "done") {
          result = status.result as MiniBatch;
          break;
        }
      }
      if (!result)
        throw new Error("READING_JOB_TIMEOUT: The planet reading exceeded the polling window. Retry it.");
      try {
        // The server includes a complete 19-method ledger in every response.
        // Never persist that huge repeated ledger 14 times: store only the
        // finished narrative and its exact per-planet evidence.
        const compact = {
          snapshotId: result.snapshotId,
          placements: result.placements,
        };
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(storagePrefix)
        );
        // Purge stale prior-version readings that may contain full ledgers.
        for (const old of keys.filter(k => !k.startsWith(storagePrefix + identity + ":")))
          localStorage.removeItem(old);
        for (const placement of result.placements)
          localStorage.setItem(
            keyFor(placement.name),
            JSON.stringify({
              snapshotId: result.snapshotId,
              placements: [placement],
            })
          );
        localStorage.setItem(batchKey, JSON.stringify(compact));
      } catch {
        /* Storage is optional, the completed reading still displays. */
      }
      return result;
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function MiniReadingContent({
  summary,
}: {
  summary: MiniBatch["placements"][number];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-7 text-slate-200">
        {readingProse(summary.paragraph)}
      </p>
      <details className="rounded-xl border border-cyan-200/10 bg-black/15 px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer text-cyan-200">
          Why this reading · calculated evidence
        </summary>
        <div className="mt-3 space-y-3">
          {summary.evidence.map(fact => {
            const value = fact.value as {
              judgment?: string;
              mechanism?: string;
              display?: string;
              house?: number;
              sources?: string[];
              limitation?: string;
            };
            return (
              <div
                key={`${fact.layerId}:${fact.id}`}
                className="space-y-1 border-t border-white/5 pt-2"
              >
                <p className="font-medium text-slate-200">
                  {fact.layerId.replaceAll("-", " ")}
                </p>
                <p>
                  {value.judgment || `${value.display} · House ${value.house}`}
                </p>
                {value.mechanism && <p>{value.mechanism}</p>}
                {value.limitation && (
                  <p className="text-amber-200">{value.limitation}</p>
                )}
                {value.sources?.map(source => (
                  <p key={source} className="text-slate-500">
                    {source}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

/** Used only in individual placement boxes; full reading surfaces keep their format. */
export function PlacementMiniReading({
  chart,
  name,
  layer = "natal",
  autoGenerate = true,
}: {
  chart: ChartResult;
  name: string;
  layer?: "natal" | "transit";
  autoGenerate?: boolean;
}) {
  const [opened, setOpened] = useState(autoGenerate);
  const result = usePlacementMiniReadings(chart, layer, [name], opened);
  const summary = result.data?.placements.find(p => p.name === name);
  if (!opened)
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="mt-3 rounded-lg border border-cyan-200/25 px-3 py-2 text-sm text-cyan-200"
      >
        Read {name}’s mini reading
      </button>
    );
  if (result.error)
    return (
      <div role="alert" className="mt-3 space-y-2 text-sm text-rose-200">
        <p>{result.error.message}</p>
        <button
          type="button"
          onClick={() => result.refetch()}
          className="underline"
        >
          Retry mini reading
        </button>
      </div>
    );
  return (
    <div className="mt-4 border-t border-cyan-200/10 pt-4">
      {summary ? (
        <MiniReadingContent summary={summary} />
      ) : (
        <p role="status" className="text-sm text-cyan-200">
          Synthesizing {name}’s placement…
        </p>
      )}
    </div>
  );
}
