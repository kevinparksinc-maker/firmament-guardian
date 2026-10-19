import type { ChartRow } from "../../../server/astronomy";
import type { FrameRelationshipType } from "../../../server/astrologyCore";

type Props = {
  rows: ChartRow[];
  title?: string;
  intro?: string;
};

const labels: Record<FrameRelationshipType, string> = {
  convergence: "Same territory",
  translation: "House shift",
  tension: "Different emphasis",
  concealment: "Behind the scenes",
};

const tone: Record<FrameRelationshipType, string> = {
  convergence: "border-emerald-200/20 bg-emerald-200/[0.06] text-emerald-100",
  translation: "border-cyan-200/20 bg-cyan-200/[0.06] text-cyan-100",
  tension: "border-rose-200/20 bg-rose-200/[0.06] text-rose-100",
  concealment: "border-violet-200/20 bg-violet-200/[0.06] text-violet-100",
};

/**
 * A comparison, not a second full reading. The detailed horary judgment and
 * Master Interpreter already supply the narrative. Keep ALL available bodies
 * and both calculated house placements, with one optional explanation each.
 */
export function FrameRelationshipPanel({
  rows,
  title = "God's View of the Agent",
  intro = "One planetary longitude, two house perspectives. Compare the house shift at a glance; expand a placement only when you want its interpretation.",
}: Props) {
  const paired = rows.filter(row =>
    row.frameRelationship && row.godHouse != null && row.agentHouse != null
  );
  if (!paired.length) return null;

  const shifted = paired.filter(row => row.godHouse !== row.agentHouse).length;

  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-br from-violet-200/[0.09] via-cyan-200/[0.04] to-transparent text-slate-100">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200">House-frame comparison</p>
        <h2 className="mt-2 font-serif text-2xl text-white">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{intro}</p>
        <p className="mt-3 text-xs text-slate-300">
          {paired.length} bodies compared · {shifted} change houses · one shared astronomical position per body
        </p>
      </div>
      <div className="divide-y divide-white/10">
        {paired.map(row => {
          const relationship = row.frameRelationship!;
          const shiftedHouse = row.godHouse !== row.agentHouse;
          return (
            <details key={row.name} className="group px-4 py-3 open:bg-white/[0.035] sm:px-7">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 marker:hidden">
                <div className="min-w-[130px] flex-1">
                  <strong className="block text-sm text-white">{row.name}</strong>
                  <span className="font-mono text-xs text-slate-400">{row.display}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-lg border border-violet-200/15 bg-violet-200/[0.05] px-2.5 py-1.5 text-violet-100">God H{row.godHouse}</span>
                  <span aria-hidden="true" className="text-slate-500">→</span>
                  <span className="rounded-lg border border-cyan-200/15 bg-cyan-200/[0.05] px-2.5 py-1.5 text-cyan-100">Agent H{row.agentHouse}</span>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone[relationship.type]}`}>
                  {shiftedHouse ? labels[relationship.type] : "Same house"}
                </span>
                <span className="text-xs text-cyan-200 group-open:text-white">Details <span aria-hidden="true">⌄</span></span>
              </summary>
              <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 text-xs leading-5 sm:grid-cols-2">
                <div><strong className="text-violet-200">God House {row.godHouse}</strong><p className="text-slate-400">{relationship.godThemes.join(" · ")}</p></div>
                <div><strong className="text-cyan-200">Agent House {row.agentHouse}</strong><p className="text-slate-400">{relationship.agentThemes.join(" · ")}</p></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{relationship.translation}</p>
              {relationship.tension && <p className="mt-2 text-xs leading-5 text-rose-200">{relationship.tension}</p>}
            </details>
          );
        })}
      </div>
    </section>
  );
}
