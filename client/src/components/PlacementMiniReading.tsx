import React from "react";
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
  layer: "natal" | "transit" = "natal"
) {
  const generate = trpc.interpretation.chartPage.useMutation();
  const me = trpc.auth.me.useQuery();
  const identity = placementMiniIdentity(
    chart,
    layer,
    me.data?.openId || "guest"
  );
  return useQuery({
    queryKey: ["placement-mini-readings", identity],
    enabled: !me.isPending,
    queryFn: async () => {
      // One persisted batch per exact natal chart/framework/account. Live sky
      // refreshes do not spend another natal interpretation request.
      const key = storagePrefix + identity;
      try {
        const saved = JSON.parse(
          localStorage.getItem(key) || "null"
        ) as MiniBatch | null;
        if (
          saved?.snapshotId &&
          Array.isArray(saved.placements) &&
          saved.placements.length === placementRows(chart).length &&
          new Set(saved.placements.map(p => p.name)).size ===
            placementRows(chart).length &&
          placementRows(chart).every(row =>
            saved.placements.some(p => p.name === row.name)
          ) &&
          saved.placements.every(
            p =>
              typeof p.paragraph === "string" &&
              p.paragraph.length >= 120 &&
              Array.isArray(p.evidence)
          )
        )
          return saved;
      } catch {
        /* Storage is optional; the server remains authoritative. */
      }
      const result = await generate.mutateAsync({ chart, mode: layer });
      try {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(storagePrefix)
        );
        for (const old of keys.slice(0, Math.max(0, keys.length - 7)))
          localStorage.removeItem(old);
        localStorage.setItem(key, JSON.stringify(result));
      } catch {
        /* Private browsing or a full cache must not hide the reading. */
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
      <p className="text-sm leading-7 text-slate-200">{summary.paragraph}</p>
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
}: {
  chart: ChartResult;
  name: string;
  layer?: "natal" | "transit";
}) {
  const result = usePlacementMiniReadings(chart, layer);
  const summary = result.data?.placements.find(p => p.name === name);
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
