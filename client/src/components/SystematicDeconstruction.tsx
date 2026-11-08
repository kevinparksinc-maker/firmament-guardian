import React, { useEffect, useState } from "react";
import {
  placementRows,
  placementMiniIdentity,
} from "@shared/placementMiniReadings";
import {
  usePlacementMiniReadings,
  MiniReadingContent,
} from "./PlacementMiniReading";
import type { ChartResult, ChartRow } from "../../../server/astronomy";

function PlacementBatch({
  chart,
  layer,
  rows,
  active,
  onSettled,
  filter,
  showMethodEvidence,
  onInterpretBody,
}: {
  chart: ChartResult;
  layer: "natal" | "transit";
  rows: ChartRow[];
  active: boolean;
  onSettled: () => void;
  filter: string;
  showMethodEvidence: boolean;
  onInterpretBody?: (name: string) => void;
}) {
  const [methodsOpen, setMethodsOpen] = useState(false);
  const result = usePlacementMiniReadings(
    chart,
    layer,
    rows.map(row => row.name),
    active
  );
  const methods =
    result.data && "methodOutcomes" in result.data
      ? result.data.methodOutcomes
      : undefined;
  useEffect(() => {
    // A failed batch remains visible and retryable; it cannot block later planets.
    if (active && (result.isSuccess || result.isError) && !result.isFetching)
      onSettled();
  }, [active, result.isSuccess, result.isError, result.isFetching, onSettled]);
  return (
    <>
      {rows
        .filter(
          row =>
            filter === "All" ||
            (filter === "Luminaries"
              ? ["Sun", "Moon"].includes(row.name)
              : filter === "Nodes"
                ? row.name.endsWith("Node")
                : ["Ascendant", "Descendant"].includes(row.name))
        )
        .map(body => {
          const summary = result.data?.placements.find(
            p => p.name === body.name
          );
          return (
            <article
              key={body.name}
              className="min-w-0 space-y-3 rounded-2xl border border-cyan-200/15 bg-[linear-gradient(135deg,#0b1725,#080d17)] p-5"
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
              ) : result.error ? (
                <div
                  role="alert"
                  className="space-y-2 break-words text-sm text-rose-200"
                >
                  <p>{result.error.message}</p>
                  <button
                    type="button"
                    onClick={() => result.refetch()}
                    className="underline"
                  >
                    Retry this reading batch
                  </button>
                </div>
              ) : (
                <p role="status" className="text-sm text-cyan-200">
                  {active || result.isFetching
                    ? `Synthesizing ${body.name}’s placement…`
                    : `${body.name}’s reading is queued…`}
                </p>
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
      {showMethodEvidence && methods && (
        <details
          className="col-span-full min-w-0 rounded-xl border border-cyan-200/15 bg-black/20 p-4"
          onToggle={event => setMethodsOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm text-cyan-200">
            Calculated method evidence · {methods.length} recorded methods
          </summary>
          {methodsOpen && (
            <div className="mt-4 space-y-3">
              {methods.map(outcome => (
                <details
                  key={outcome.methodId}
                  className="rounded-lg border border-white/10 p-3"
                >
                  <summary className="cursor-pointer text-sm text-slate-200">
                    {outcome.methodName} · {outcome.status}
                  </summary>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                    {outcome.judgment}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {outcome.strengthAndLimitations.join(" · ")}
                  </p>
                </details>
              ))}
            </div>
          )}
        </details>
      )}
    </>
  );
}

function PlacementReadings({
  chart,
  layer,
  onInterpretBody,
}: {
  chart: ChartResult;
  layer: "natal" | "transit";
  onInterpretBody?: (name: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [activeBatch, setActiveBatch] = useState(0);
  const rows = placementRows(chart);
  // Keep the server's two-placement request budget, while covering every row.
  const batches = Array.from({ length: Math.ceil(rows.length / 2) }, (_, i) =>
    rows.slice(i * 2, i * 2 + 2)
  );
  return (
    <section
      aria-label="Planetary placement meanings"
      className="w-full min-w-0 space-y-4"
    >
      <header>
        <h2 className="font-serif text-2xl font-bold text-white">
          Your placement mini readings
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          One connected reading for each of your {rows.length} placements,
          combining its calculated methods.
        </p>
        <p role="status" className="mt-2 text-xs text-cyan-200">
          {activeBatch < batches.length
            ? `Processing placement batch ${activeBatch + 1} of ${batches.length}. Readings appear as each batch finishes.`
            : "All placement batches processed. Any failed readings show their error and a retry button."}
        </p>
      </header>
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
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        {batches.map((batch, index) => (
          <PlacementBatch
            key={index}
            chart={chart}
            layer={layer}
            rows={batch}
            active={index === activeBatch}
            onSettled={() =>
              setActiveBatch(current =>
                current === index ? current + 1 : current
              )
            }
            showMethodEvidence={index === 0}
            filter={filter}
            onInterpretBody={onInterpretBody}
          />
        ))}
      </div>
    </section>
  );
}

export function SystematicDeconstruction({
  chart,
  mode = "natal",
  onInterpretBody,
}: {
  chart: ChartResult;
  mode?: "natal" | "transit" | "combined";
  onInterpretBody?: (name: string) => void;
}) {
  const layer = mode === "transit" ? "transit" : "natal";
  return (
    <PlacementReadings
      key={placementMiniIdentity(chart, layer)}
      chart={chart}
      layer={layer}
      onInterpretBody={onInterpretBody}
    />
  );
}
