import { useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronUp, CloudLightning, MapPin, RefreshCw, Waves } from "lucide-react";
import type { ChartResult } from "../../../server/astronomy";

type Body = { name: string; longitude: number; house?: number };
const aspects = [
  { angle: 0, name: "Conjunction", tone: 0 },
  { angle: 60, name: "Sextile", tone: 1 },
  { angle: 90, name: "Square", tone: -1 },
  { angle: 120, name: "Trine", tone: 1 },
  { angle: 180, name: "Opposition", tone: -1 },
] as const;
const planets = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
const orbWeight = (orb: number) => orb <= 1.25 ? 1 : orb <= 2.5 ? .8 : orb <= 3.75 ? .6 : .4;
function calculateFlow(chart: ChartResult) {
  const natal = chart.movingBodies.filter((p): p is Body => planets.has(p.name) && Number.isFinite(p.longitude));
  const transits = chart.transits.filter((p): p is Body => planets.has(p.name) && Number.isFinite(p.longitude));
  const hits: { label: string; orb: number; weight: number; tone: number; house?: number }[] = [];
  for (const t of transits) for (const n of natal) {
    const diff = Math.abs(t.longitude - n.longitude) % 360;
    const distance = Math.min(diff, 360 - diff);
    for (const a of aspects) {
      const orb = Math.abs(distance - a.angle);
      if (orb > 5) continue;
      // Conjunctions are shown as intensified/mixed, not assumed benefic or malefic.
      const weight = orbWeight(orb);
      hits.push({ label: `${t.name} ${a.name.toLowerCase()} natal ${n.name}`, orb, weight, tone: a.tone, house: n.house });
    }
  }
  const supportive = hits.filter(h => h.tone > 0).reduce((s,h) => s+h.weight,0);
  const challenging = hits.filter(h => h.tone < 0).reduce((s,h) => s+h.weight,0);
  const denominator = supportive + challenging;
  const ratio = denominator ? supportive / denominator : .5;
  const state = !denominator ? "mixed" : ratio >= .6 ? "flow" : ratio <= .4 ? "friction" : "mixed";
  return { hits: hits.sort((a,b)=>b.weight-a.weight || a.orb-b.orb), state, ratio, supportive, challenging };
}

export function PersonalCosmicForecast({ chart, calculating, onRefresh, locationLabel, onUsePhoneLocation, locationStatus }: {
  chart: ChartResult | null; calculating: boolean; onRefresh?: () => void;
  locationLabel?: string; onUsePhoneLocation?: () => void; locationStatus?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const result = useMemo(() => chart ? calculateFlow(chart) : null, [chart]);
  const state = result?.state;
  const color = state === "flow" ? "text-emerald-300" : state === "friction" ? "text-rose-300" : "text-amber-300";
  const title = state === "flow" ? "Easy Flow" : state === "friction" ? "Friction" : "Mixed Flow";
  const summary = state === "flow"
    ? "Supportive astrological connections are more prominent in your current chart."
    : state === "friction" ? "Challenging astrological connections are more prominent. Consider giving yourself extra room to respond thoughtfully."
    : "Your sky contains a mixture of supportive and challenging connections.";
  return <section aria-label="Personal Cosmic Forecast" className="relative overflow-hidden rounded-3xl border border-cyan-300/60 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,.18),transparent_60%),linear-gradient(135deg,#0b1630,#100c25)] p-5 text-white shadow-[0_0_30px_rgba(34,211,238,.14)] sm:p-7">
    <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">Firmament Guardian · Personal Cosmic Forecast</p><h2 className="mt-1 font-serif text-2xl">Feel the Flow. See What's Ahead.</h2></div><Activity className="shrink-0 text-cyan-300" size={26}/></div>
    <p className="mt-2 text-xs text-slate-300">Your natal chart × current transits · traditional symbolic interpretation</p>
    {!chart ? <p className="mt-5 text-sm text-amber-200" role="status">{calculating ? "Calculating your personal sky…" : "Your personal transit chart is not available yet."}</p> : <>
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-current/30 bg-white/5 shadow-[0_0_30px_rgba(56,189,248,.22)] ${color}`}>{state === "friction" ? <CloudLightning size={32}/> : <Waves size={32}/>}</div>
        <div><p className="text-xs text-slate-300">Your current harmonic outlook</p><p className={`font-serif text-3xl ${color}`}>{title}</p><p className="mt-1 text-sm leading-6 text-slate-200">{summary}</p></div>
      </div>
      <p className="mt-3 text-xs text-slate-300">{result?.hits.length ? `${result.hits.length} natal-to-transit aspects within 5° · 100/80/60/40 strength bands` : "No major close aspects detected in this simplified aspect layer."}</p>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">This is a symbolic aspect balance, not a prediction of luck, danger, or outcomes. Future shift times require separate timed chart calculations.</p>
      <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-fuchsia-300/50 bg-fuchsia-500/10 px-4 py-3 text-left text-sm font-semibold text-fuchsia-100">{expanded ? "Hide the astrology" : "Why am I seeing this?"}{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
      {expanded && <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-300">Supportive aspects symbolize cooperation and ease; challenging aspects symbolize competing pressures. Conjunctions are intensified but not automatically classified as good or bad.</p>{result?.hits.slice(0,10).map((h,i)=><div key={i} className="flex justify-between gap-3 border-b border-white/10 py-2 text-xs"><span>{h.label}{h.house ? ` · natal house ${h.house}` : ""}</span><span className="shrink-0 text-cyan-200">{h.orb.toFixed(2)}° · {Math.round(h.weight*100)}%</span></div>)}</div>}
    </>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{locationLabel || "Transit location not set"}</span><div className="flex gap-2">{onUsePhoneLocation && <button type="button" onClick={onUsePhoneLocation} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-cyan-100">Use phone location</button>}{onRefresh && <button type="button" disabled={calculating} onClick={onRefresh} className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/40 px-3 py-2 text-cyan-100"><RefreshCw size={13}/> Refresh</button>}</div></div>
    {locationStatus && <p role="status" className="mt-2 text-xs text-amber-200">{locationStatus}</p>}
  </section>;
}
