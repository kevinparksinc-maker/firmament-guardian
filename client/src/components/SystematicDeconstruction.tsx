import React from "react";
import { useState } from "react";
import { placementRows } from "@shared/placementMiniReadings";
import {
  usePlacementMiniReadings,
  MiniReadingContent,
} from "./PlacementMiniReading";
import type { ChartResult } from "../../../server/astronomy";

export function SystematicDeconstruction({
  chart,
  mode = "natal",
  onInterpretBody,
}: {
  chart: ChartResult;
  mode?: "natal" | "transit" | "combined";
  onInterpretBody?: (name: string) => void;
}) {
  const result = usePlacementMiniReadings(chart);
  const [filter, setFilter] = useState("All");
  const rows = placementRows(chart).filter(
    row =>
      filter === "All" ||
      (filter === "Luminaries"
        ? ["Sun", "Moon"].includes(row.name)
        : filter === "Nodes"
          ? row.name.endsWith("Node")
          : ["Ascendant", "Descendant"].includes(row.name))
  );
  return (
    <section aria-label="Planetary placement meanings" className="space-y-4">
      <header>
        <h2 className="font-serif text-2xl font-bold text-white">
          Your placement mini readings
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          One connected reading for each placement, combining its calculated
          methods.
        </p>
      </header>
      {result.isPending && (
        <p role="status" className="text-sm text-cyan-200">
          Synthesizing your placement summaries…
        </p>
      )}
      {result.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/40 p-4 text-rose-200"
        >
          <p>Placement summaries could not be completed.</p>
          <p className="mt-2 break-words text-sm">{result.error.message}</p>
          <button
            type="button"
            onClick={() => result.refetch()}
            className="mt-3 rounded-lg border border-rose-300/40 px-3 py-2 text-sm"
          >
            Retry summaries
          </button>
        </div>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter placements"
      >
        {["All", "Luminaries", "Angles", "Nodes"].map(value => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full border px-3 py-1.5 text-xs ${filter === value ? "border-cyan-300/40 bg-cyan-300 text-slate-950" : "border-white/10 bg-slate-900 text-slate-300"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(body => {
          const summary = result.data?.placements.find(
            p => p.name === body.name
          );
          return (
            <article
              key={body.name}
              className="space-y-3 rounded-2xl border border-cyan-200/15 bg-[linear-gradient(135deg,#0b1725,#080d17)] p-5"
            >
              <header>
                <h3 className="font-serif text-xl font-bold text-white">
                  {body.name} · {body.display}
                </h3>
                <p className="mt-1 text-xs text-amber-200">
                  House {body.house}
                  {body.agentHouse != null && body.godHouse != null
                    ? ` · Agent H${body.agentHouse} / God H${body.godHouse}`
                    : ""}
                  {body.retrograde ? " · Retrograde" : ""}
                </p>
              </header>
              {summary ? (
                <MiniReadingContent summary={summary} />
              ) : (
                !result.error && (
                  <p role="status" className="text-sm text-cyan-200">
                    Preparing {body.name}’s mini reading…
                  </p>
                )
              )}
              {onInterpretBody && (
                <button
                  type="button"
                  onClick={() => onInterpretBody(body.name)}
                  className="text-xs text-cyan-200 underline"
                >
                  Inspect {body.name} calculations
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
