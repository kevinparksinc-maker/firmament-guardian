import { useState } from "react";
import type { ChartResult } from "../../../server/astronomy";
import { trpc } from "@/lib/trpc";

const DIVISIONS = ["D1", "D2", "D3", "D9", "D10"] as const;

/** Profile chart already exists. Query only projects its natal positions. */
export function VedicDivisionalCharts({ chart }: { chart: ChartResult }) {
  const [selected, setSelected] = useState<(typeof DIVISIONS)[number]>("D1");
  const { data, isLoading, error } = trpc.vedic.divisionalCharts.useQuery({ chart }, { retry: false });
  const active = data?.find(item => item.division === selected);
  return (
    <section aria-label="Vedic divisional charts" className="rounded-2xl border border-amber-400/30 bg-slate-950/70 p-4 space-y-4">
      <div>
        <h2 className="font-serif text-xl font-bold text-amber-100">Vedic Divisional Charts</h2>
        <p className="text-sm text-slate-300">All divisions are derived from your active natal chart. No second birth calculation.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select divisional chart">
        {DIVISIONS.map(division => <button type="button" key={division} aria-pressed={selected === division}
          className={`rounded-lg border px-3 py-2 text-sm ${selected === division ? "border-amber-400 bg-amber-400/20 text-amber-100" : "border-white/20 text-slate-300"}`}
          onClick={() => setSelected(division)}>{division}</button>)}
      </div>
      {isLoading && <p className="text-sm text-slate-300">Deriving divisional charts from your natal positions…</p>}
      {error && <p role="alert" className="text-sm text-rose-300">Unable to derive charts: {error.message}</p>}
      {active && <>
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-100">{active.division} — {active.name}</h3>
          <p className="text-sm text-slate-300">{active.purpose}</p>
          <p className="text-xs text-slate-400">{active.formula}</p>
          <p className="text-sm">Divisional Ascendant: {active.ascendant.sign} ({active.ascendant.longitude.toFixed(3)}°)</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Twelve divisional houses">
          {active.houses.map(house => <div key={house.house} className="rounded-lg border border-white/15 bg-slate-900/70 p-3">
            <p className="text-sm font-semibold text-amber-100">House {house.house} · {house.sign}</p>
            <p className="text-xs text-slate-300">{house.planets.join(", ") || "—"}</p>
          </div>)}
        </div>
        <details className="text-sm text-slate-300"><summary className="cursor-pointer">Show planetary calculations</summary>
          <div className="mt-2 space-y-2">{active.placements.map(planet => <p key={planet.body}>
            <strong>{planet.body}</strong>: {planet.sourceSign} → {planet.sign}, part {planet.divisionPart}, House {planet.house}, derived {planet.longitude.toFixed(3)}°
          </p>)}</div>
        </details>
        <p className="text-xs text-slate-400">House list is functional; the dedicated North Indian diamond renderer is still pending.</p>
      </>}
    </section>
  );
}
