import { Link } from "wouter";
import { ChartObservatory2050 } from "@/components/ChartObservatory2050";
import { CelestialDegreeWheel } from "@/components/CelestialDegreeWheel";
import type { ChartResult } from "../../../server/astronomy";
import type { ReadingScope, Worldview } from "../../../server/astrologyCore";

const frames: ReadonlyArray<{ value: Worldview; label: string }> = [
  { value: "god", label: "God View" },
  { value: "agent", label: "Agent View" },
  { value: "agent-vs-god", label: "God's View of the Agent" },
];

const scopes: ReadonlyArray<{ value: ReadingScope; label: string }> = [
  { value: "natal", label: "Natal Chart" },
  { value: "transit", label: "Transit Chart" },
  { value: "combined", label: "Natal + Transit" },
];

export type ProfileChartScreenProps = {
  chart: ChartResult | null;
  calculating: boolean;
  worldview: Worldview;
  readingMode: ReadingScope;
  onWorldviewChange: (value: Worldview) => void;
  onReadingModeChange: (value: ReadingScope) => void;
  error?: string;
};

export function ProfileChartScreen({
  chart, calculating, worldview, readingMode, onWorldviewChange, onReadingModeChange, error,
}: ProfileChartScreenProps) {
  if (!chart) {
    return <section role="status" className="rounded-2xl border border-amber-300/30 bg-slate-950/80 p-6 text-amber-100">
      <h1 className="font-serif text-xl">Your calculated diamond chart</h1>
      <p className="mt-2 text-sm">{calculating
        ? "Calculating real planetary positions…"
        : "Calculated positions are unavailable. This screen will not show illustrative placements as calculated evidence."}</p>
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
    </section>;
  }

  return <section id="chart-observatory" className="mb-8 scroll-mt-24" aria-label="Primary calculated divine diamond observatory">

    <CelestialDegreeWheel
      referenceFrame="Aldebaran-anchored geocentric · canonical"
      points={chart.movingBodies.map(body => ({
        id: body.name, label: body.name,
        glyph: ({ Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇" } as Record<string,string>)[body.name] ?? "✦",
        longitude: body.longitude,
      }))}
      houseCusps={chart.houses}
    />
    <div className="mt-4 overflow-x-auto rounded-xl border border-amber-300/20 bg-slate-950/90 p-3">
      <h2 className="mb-2 font-serif text-lg text-amber-100">Exact calculated placements</h2>
      <table className="w-full min-w-[440px] text-left text-sm text-slate-200">
        <thead><tr className="border-b border-amber-300/20 text-amber-200"><th className="p-2">Body</th><th className="p-2">Zodiac degree</th><th className="p-2">House</th><th className="p-2">Nakshatra</th><th className="p-2">Decan</th></tr></thead>
        <tbody>{chart.movingBodies.map(body => <tr key={body.name} className="border-b border-white/10"><td className="p-2">{body.name}</td><td className="p-2">{body.display}</td><td className="p-2">{body.house}</td><td className="p-2">{body.overlay.nakshatra}</td><td className="p-2">{body.overlay.decan}</td></tr>)}</tbody>
      </table>
    </div>
    <ChartObservatory2050 key={`${chart.worldview}:${chart.utc}`} chart={chart} />
    <div className="mt-3 flex flex-wrap gap-3">
      <Link href="/reading" className="inline-flex min-h-11 items-center rounded-xl border border-violet-300/40 bg-violet-300/10 px-5 text-sm font-semibold text-violet-100">Open the Master Interpreter →</Link>
      <Link href="/guide?tab=blueprint" className="inline-flex min-h-11 items-center rounded-xl border border-cyan-300/30 px-5 text-sm font-semibold text-cyan-100">Inspect all chart evidence →</Link>
    </div>
    <details className="mt-4 rounded-xl border border-cyan-200/20 bg-black/30 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Chart and reading settings</summary>
      <p className="mb-3 mt-2 text-xs text-slate-400">Choose a calculation frame and reading scope. The saved birth profile remains unchanged.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {frames.map(item => <button key={item.value} type="button" aria-pressed={worldview === item.value}
          className={`min-h-11 rounded-lg border p-3 text-left text-xs ${worldview === item.value ? "border-cyan-300/70 bg-cyan-300/15 text-white" : "border-white/15 text-slate-300"}`}
          onClick={() => onWorldviewChange(item.value)}>{item.label}</button>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {scopes.map(item => <button key={item.value} type="button" aria-pressed={readingMode === item.value}
          className={`min-h-11 rounded-lg border p-3 text-left text-xs ${readingMode === item.value ? "border-violet-300/70 bg-violet-300/15 text-white" : "border-white/15 text-slate-300"}`}
          onClick={() => onReadingModeChange(item.value)}>{item.label}</button>)}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
    </details>
  </section>;
}
