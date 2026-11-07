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
  const generate = trpc.interpretation.chartPage.useMutation();
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
      const result = await generate.mutateAsync({ chart, mode: layer, names });
      try {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(storagePrefix)
        );
        for (const old of keys.slice(0, Math.max(0, keys.length - 55)))
          localStorage.removeItem(old);
        for (const placement of result.placements)
          localStorage.setItem(
            keyFor(placement.name),
            JSON.stringify({
              snapshotId: result.snapshotId,
              placements: [placement],
            })
          );
      } catch {
        /* Storage is optional. */
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
