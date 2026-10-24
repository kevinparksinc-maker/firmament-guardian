import { useMemo } from "react";
import { Activity, ArrowRight, Clock3, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Link } from "wouter";
import type { ChartResult, TransitContact } from "../../../server/astronomy";

const MAX_ORB = 5;
const aspectFlow: Record<TransitContact["aspect"], number> = {
  trine: 1, sextile: 1, square: -1, opposition: -1, conjunction: 0,
};
const percentWeight = (orb: number) =>
  orb > MAX_ORB ? 0 : orb <= 1.25 ? 100 : orb <= 2.5 ? 80 : orb <= 3.75 ? 60 : 40;

export function PersonalCosmicForecast({ chart, calculating, onRefresh }: { chart: ChartResult | null; calculating: boolean; onRefresh?: () => void }) {
  const data = useMemo(() => {
    if (!chart || chart.readingScope === "natal") return null;
    const contacts = chart.transits.flatMap(body =>
      body.natalContacts.filter(contact => Number.isFinite(contact.orb) && contact.orb <= MAX_ORB)
        .map(contact => ({ ...contact, transit: body.name, strength: percentWeight(contact.orb) }))
    );
    const flow = contacts.filter(c => aspectFlow[c.aspect] === 1).reduce((sum,c) => sum+c.strength,0);
    const friction = contacts.filter(c => aspectFlow[c.aspect] === -1).reduce((sum,c) => sum+c.strength,0);
    const neutral = contacts.filter(c => aspectFlow[c.aspect] === 0);
    const signal = !contacts.length ? "No close contacts" : flow > friction * 1.2 ? "Easy Flow" : friction > flow * 1.2 ? "Friction" : "Mixed";
    return { contacts, flow, friction, neutral, signal,
      strongest: [...contacts].sort((a,b)=>b.strength-a.strength).slice(0,3),
      moment: chart.transitDate };
  }, [chart]);

  return <section aria-label="Personal Cosmic Forecast" className="relative overflow-hidden rounded-3xl border border-cyan-300/65 bg-[radial-gradient(ellipse_at_top_right,rgba(123,78,240,.21),transparent_65%),linear-gradient(150deg,#0A152C,#080D19)] p-5 shadow-[0_0_26px_rgba(83,244,255,.15),inset_0_0_18px_rgba(83,244,255,.035)] sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Personal Harmonic Flow Clock</p>
        <h2 className="mt-1 font-serif text-2xl text-amber-100">Your Personal Cosmic Forecast</h2>
        <p className="mt-1 text-sm text-slate-300">Feel the Flow. See What’s Ahead.</p>
      </div><div className="rounded-full border border-amber-300/45 bg-amber-300/10 p-3 text-amber-200"><Activity size={25}/></div>
    </div>
    {onRefresh && <button type="button" disabled={calculating} onClick={onRefresh} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 text-sm font-semibold text-amber-100 disabled:opacity-50"><RefreshCw size={15} className={calculating ? "animate-spin" : ""}/>Refresh current energy</button>}
    {!data ? <div className="mt-5 rounded-xl border border-amber-200/25 bg-white/[.035] p-4 text-sm text-slate-200">
      {calculating ? "Calculating your personal sky…" : "Your birth chart is ready for a personal energy forecast. Open Cosmic Weather to calculate current transit contacts with your natal chart."}
      <div className="mt-3"><Link className="text-amber-200 underline underline-offset-4" href="/guide?tab=weather#main-cosmos-tabs">Open Cosmic Weather →</Link></div>
    </div> : <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-4 py-2 text-base font-semibold shadow-[0_0_20px_rgba(83,244,255,.14)] ${data.signal === "Easy Flow" ? "border-emerald-300/70 text-emerald-200" : data.signal === "Friction" ? "border-rose-300/70 text-rose-200" : "border-cyan-300/70 text-cyan-100"}`}><Zap size={16} className="mr-2 inline"/>{data.signal}</span>
        <span className="text-xs text-slate-400">{data.contacts.length} calculated contacts · 5° orb · 100/80/60/40 weighting</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200">{data.signal === "Easy Flow"
        ? "Supportive angular relationships carry more weight in this snapshot. Explore the contacts to see which parts of life are involved."
        : data.signal === "Friction"
        ? "Challenging angular relationships carry more weight in this snapshot. Friction describes symbolic tension, not inevitable events."
        : data.signal === "Mixed"
        ? "Supportive and challenging contacts are both present. The pattern can be explored through the planets and houses involved."
        : "No major natal–transit aspects fall inside your selected 5° orb in this snapshot. This is not a claim that nothing is happening."}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-300/35 bg-emerald-300/[.055] p-3"><p className="text-xs text-emerald-200">Flow weight</p><p className="mt-1 text-xl font-semibold text-white">{Math.round(data.flow)}</p></div>
        <div className="rounded-xl border border-rose-300/35 bg-rose-300/[.055] p-3"><p className="text-xs text-rose-200">Friction weight</p><p className="mt-1 text-xl font-semibold text-white">{Math.round(data.friction)}</p></div>
      </div>
      {data.strongest.length > 0 && <div className="mt-4 space-y-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200"><Sparkles size={14}/> Leading chart contacts</p>
        {data.strongest.map((c,i)=><p key={`${c.transit}-${c.natalName}-${i}`} className="rounded-lg border border-white/10 bg-white/[.035] px-3 py-2 text-sm text-slate-200">Transit {c.transit} {c.aspect} natal {c.natalName} · {c.orb.toFixed(2)}° orb</p>)}
      </div>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><Clock3 size={14} className="mt-0.5 shrink-0"/>Snapshot: {new Date(data.moment).toLocaleString()} · This displays the calculated chart moment, not an automatically updating live clock. Exact future shift times need additional time-series calculations.</p>
      <Link href="/guide?tab=weather#main-cosmos-tabs" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20">Explore your energy in depth <ArrowRight size={16}/></Link>
    </>}
  </section>;
}
