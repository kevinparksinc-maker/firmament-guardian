import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

type Mode = "natal" | "transit" | "combined";
type Depth = "quick" | "mini" | "standard" | "full";

/** Mini readings use the full Master Chart ledger; only final narrative length changes. */
export function CanonicalMiniReadings({ chart, mode }: { chart: ChartResult; mode: Mode }) {
  const [depth, setDepth] = useState<Depth>("mini");
  const [selected, setSelected] = useState<string | null>(null);
  const reading = trpc.interpretation.miniReading.useMutation();
  const focusItems = [
    ...chart.movingBodies.map(body => ({ key: `planet-${body.name}`, label: body.name, focus: `Interpret ${body.name} in the natal foundation${mode === "natal" ? "" : " and its relationship to the current transit sky"} using all applicable calculated methods, houses, rulers, aspects, receptions, mansions, stars and cross-method evidence.` })),
    ...chart.houses.map((_, i) => ({ key: `house-${i + 1}`, label: `House ${i + 1}`, focus: `Interpret natal house ${i + 1}, its ruler, occupants, aspects and all applicable method relationships from the complete chart ledger.` })),
    ...(mode === "natal" ? [] : chart.transits.map(body => ({ key: `transit-${body.name}`, label: `Transit ${body.name}`, focus: `Interpret transit ${body.name} against the natal and God View evidence, considering all applicable calculated methods and timing.` }))),
  ];
  const activeFocus = focusItems.find(item => item.key === selected)?.focus;
  const resultIsCurrent = reading.data?.focus === activeFocus && !reading.isPending;
  const run = (item: (typeof focusItems)[number]) => {
    setSelected(item.key);
    reading.reset();
    reading.mutate({ chart, mode, focus: item.focus, outputDepth: depth });
  };
  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-950/70 p-4 space-y-3" aria-label="Canonical Mini Readings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Planet, House & Transit Mini Readings</h3>
          <p className="text-xs text-slate-400">Full calculated evidence; only the final answer length changes.</p>
        </div>
        <label className="text-xs text-slate-200">Reading depth{" "}
          <select aria-label="Mini reading depth" className="rounded border border-white/20 bg-slate-900 p-2" value={depth} onChange={e => setDepth(e.target.value as Depth)}>
            <option value="quick">Quick · 2–4 sentences</option>
            <option value="mini">Mini · 1–2 paragraphs</option>
            <option value="standard">Standard · 3–5 paragraphs</option>
            <option value="full">Full synthesis</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {focusItems.map(item => <button key={item.key} type="button" disabled={reading.isPending} onClick={() => run(item)} className={`rounded-lg border px-3 py-2 text-xs transition disabled:opacity-50 ${selected === item.key ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 text-slate-200 hover:border-cyan-300/50"}`}>{item.label}</button>)}
      </div>
      {reading.isPending && <p role="status" className="text-sm text-cyan-200">Interpreting complete Master Chart evidence…</p>}
      {reading.error && <p role="alert" className="text-sm text-rose-300">{reading.error.message}</p>}
      {reading.data && resultIsCurrent && !reading.error && (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{reading.data.reading}</p>
          <p className="text-xs text-slate-400">Master snapshot: {reading.data.snapshotId} · Calculated methods: {reading.data.methodLedgerSummary.computedWithResult}/{reading.data.methodLedgerSummary.totalEvaluated} · Pre-AI evidence audit: {reading.data.qualityAudit.passed ? "passed" : "incomplete"} · AI narrative coverage not independently verified</p>
        </div>
      )}
    </section>
  );
}
