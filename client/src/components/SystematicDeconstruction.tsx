import React from "react";
import { useState } from "react";
import { placementRows } from "@shared/placementMiniReadings";
import {
  usePlacementMiniReadings,
  MiniReadingContent,
  PlacementMiniReading,
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
  const completeReading =
    result.data && "methodOutcomes" in result.data ? result.data : undefined;
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
      {completeReading && (
        <section aria-label="Complete method synthesis" className="space-y-3 rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Complete method synthesis</p>
            <h3 className="mt-1 font-serif text-xl font-bold text-white">Every applicable method is shown below</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">The planetary cards are concise placement summaries. This ledger is the authoritative cross-method reading: each calculated method contributes its own finding judgments, evidence, and limitation before the themes are combined.</p>
          </div>
          <p className="rounded-xl border border-amber-200/20 bg-amber-100/[0.04] p-3 text-sm leading-6 text-amber-50">{completeReading.dominantConclusion}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {completeReading.methodOutcomes.map(outcome => (
              <article key={outcome.methodId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-white">{outcome.methodName}</h4>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-cyan-200/75">{outcome.tradition} · {outcome.chartScope} · {outcome.frame}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${outcome.status === "interpreted" ? "border-emerald-300/30 text-emerald-200" : "border-amber-300/30 text-amber-200"}`}>{outcome.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{outcome.judgment}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400"><span className="font-semibold text-slate-300">Contribution:</span> {outcome.contribution}</p>
                {outcome.strengthAndLimitations.length > 0 && <p className="mt-2 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-400">Limits:</span> {outcome.strengthAndLimitations.join(" · ")}</p>}
                <p className="mt-3 text-[10px] leading-4 text-slate-600">Evidence: {outcome.evidenceIds.join(", ") || "none"}</p>
              </article>
            ))}
          </div>
        </section>
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
              ) : ["Sun", "Moon"].includes(body.name) ? (
                !result.error && (
                  <p role="status" className="text-sm text-cyan-200">
                    Preparing {body.name}’s mini reading…
                  </p>
                )
              ) : (
                <PlacementMiniReading
                  chart={chart}
                  name={body.name}
                  autoGenerate={false}
                />
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
