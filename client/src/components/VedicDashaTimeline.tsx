import { useMemo, useState } from "react";
import type { ChartResult } from "../../../server/astronomy";
import { trpc } from "@/lib/trpc";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const OWN: Record<string, string[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"], Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"], Saturn: ["Capricorn", "Aquarius"],
};
const EXALT: Record<string, string> = {
  Sun: "Aries", Moon: "Taurus", Mars: "Capricorn", Mercury: "Virgo",
  Jupiter: "Cancer", Venus: "Pisces", Saturn: "Libra",
};
const FALL: Record<string, string> = {
  Sun: "Libra", Moon: "Scorpio", Mars: "Cancer", Mercury: "Pisces",
  Jupiter: "Capricorn", Venus: "Virgo", Saturn: "Aries",
};
const HOUSE_TOPICS = [
  "identity, body, temperament and personal direction",
  "income, possessions, savings, family and speech",
  "initiative, courage, effort, communication and siblings",
  "home, roots, mother, property and inner foundations",
  "creativity, intelligence, children, study and discernment",
  "service, work, debts, disputes, discipline and health routines",
  "partnership, marriage, contracts and open counterparts",
  "shared resources, inheritance, vulnerability, hidden matters and transformation",
  "belief, teachers, higher learning, dharma and long journeys",
  "vocation, responsibility, public standing and action in the world",
  "gains, networks, allies, communities and fulfilled aims",
  "expenses, retreat, seclusion, release and distant places",
];
type Period = { lord: string; start: string; end: string; active: boolean; antardashas: Array<{ lord: string; start: string; end: string; active: boolean; pratyantardashas: Array<{ lord: string; start: string; end: string; active: boolean }> }> };
function norm(value: number) { return ((value % 360) + 360) % 360; }
function signAt(value: number) { return SIGNS[Math.floor(norm(value) / 30)]; }
function degree(value: number) {
  const within = norm(value) % 30;
  const d = Math.floor(within);
  return `${d}°${String(Math.floor((within - d) * 60)).padStart(2, "0")}′`;
}
function PlanetContext({ lord, chart }: { lord: string; chart: ChartResult }) {
  const row = chart.movingBodies.find(item => item.name.toLowerCase() === lord.toLowerCase());
  const asc = chart.ascendant;
  const sign = row ? signAt(row.longitude) : undefined;
  const ownSigns = OWN[lord] ?? [];
  const condition = !sign ? "No planetary longitude is available in the supplied chart payload."
    : ownSigns.includes(sign) ? "Traditional domicile: the planet occupies one of its own signs."
    : EXALT[lord] === sign ? "Traditional exaltation sign: this is a classical exaltation placement."
    : FALL[lord] === sign ? "Traditional fall sign: this is the classical fall placement."
    : "Neither domicile, exaltation nor fall is established by this sign-only check.";
  const ascSign = asc ? signAt(asc.longitude) : undefined;
  const ruled = ascSign ? Array.from({ length: 12 }, (_, i) => {
    const houseSign = SIGNS[(SIGNS.indexOf(ascSign) + i) % 12];
    return RULERS[houseSign] === lord ? i + 1 : null;
  }).filter((n): n is number => n !== null) : [];
  return <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 p-3 space-y-2">
    <h4 className="font-semibold text-cyan-100">{lord} · natal activation profile</h4>
    {row && sign ? <>
      <p className="text-sm text-slate-200">Natal placement: {sign} {degree(row.longitude)} · House {row.house}.</p>
      <p className="text-sm text-slate-300">House {row.house} connects this planet to {HOUSE_TOPICS[row.house - 1] ?? "the corresponding house topics"}.</p>
      <p className="text-sm text-slate-300">{condition}</p>
      <p className="text-sm text-slate-300">By the sign-rulership scheme used in this panel, {lord} rules natal house{ruled.length === 1 ? "" : "s"} {ruled.length ? ruled.join(", ") : "not determined from the available Ascendant"}{ruled.length ? `; these houses are also activated when this planet's period is interpreted.` : "."}</p>
    </> : <p className="text-sm text-slate-300">{condition} The period dates can still be displayed, but a placement-based interpretation is withheld.</p>}
    <p className="text-xs text-slate-400">This panel reports placement, sign-based dignity and house rulership. It does not claim an event or predict an outcome from the period lord alone.</p>
  </div>;
}

export function VedicDashaTimeline({ chart }: { chart: ChartResult }) {
  const { data, isLoading, error, refetch, isFetching } = trpc.vedic.dashaTimeline.useQuery({ chart }, {
    retry: 2, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), staleTime: 60_000,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [antar, setAntar] = useState<number | null>(null);
  const [pratyantar, setPratyantar] = useState<number | null>(null);
  const activeIndex = data?.available ? Math.max(0, data.periods.findIndex(period => period.active)) : 0;
  const index = selected ?? activeIndex;
  const period = data?.available ? data.periods[index] as Period | undefined : undefined;
  const activeAntarIndex = period ? Math.max(0, period.antardashas.findIndex(item => item.active)) : 0;
  const antarIndex = antar ?? activeAntarIndex;
  const sub = period?.antardashas[antarIndex];
  const activePratyantarIndex = sub ? Math.max(0, sub.pratyantardashas.findIndex(item => item.active)) : 0;
  const pdIndex = pratyantar ?? activePratyantarIndex;
  const pd = sub?.pratyantardashas[pdIndex];
  const dateWindow = useMemo(() => period ? `${period.start} to ${period.end}` : "", [period]);
  if (isLoading) return <section className="rounded-xl border border-amber-400/20 p-4" role="status">Calculating Vimshottari periods from the natal Moon…</section>;
  if (error) return <section className="rounded-xl border border-rose-300/20 bg-rose-950/20 p-4 space-y-2" role="alert">
    <h2 className="font-semibold text-rose-100">Dasha timeline request failed</h2><p className="text-sm text-rose-200">{error.message}</p>
    <p className="text-xs text-rose-100/80">A “Failed to fetch” message means the browser did not receive a usable API response. Check server availability, deployment URL and network/CORS configuration; it does not mean the Dasha calculation found no periods.</p>
    <button type="button" onClick={() => void refetch()} disabled={isFetching} className="rounded-lg border border-rose-200/30 px-3 py-2 text-xs disabled:opacity-50">{isFetching ? "Retrying…" : "Retry Dasha calculation"}</button>
  </section>;
  if (!data) return null;
  if (!data.available) return <section className="rounded-xl border border-amber-400/20 p-4"><h2 className="font-semibold">Vimshottari Dasha</h2><p className="text-sm text-slate-300">{data.reason}</p></section>;
  if (!period || !sub) return <section className="rounded-xl border border-amber-400/20 p-4">The Dasha data did not contain a selectable Mahadasha and Antardasha.</section>;
  return <section className="space-y-4 rounded-2xl border border-amber-400/30 bg-slate-950/70 p-4" aria-label="Vimshottari Dasha timeline">
    <div className="space-y-1">
      <h2 className="font-serif text-xl font-bold text-amber-100">Vimshottari Dasha · Life Timeline</h2>
      <p className="text-sm text-slate-300">Natal Moon {data.moonLongitude.toFixed(3)}° · Nakshatra {data.birthNakshatra} · Starting lord {data.startingLord} · Balance at birth {data.balanceYears.toFixed(2)} years</p>
      <p className="text-xs text-slate-400">Guardian fixed-zero reference · 365.25-day year · periods are calculated from the natal Moon longitude supplied to this chart.</p>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Select Mahadasha">
      {data.periods.map((p, i) => <button type="button" key={i} onClick={() => { setSelected(i); setAntar(null); setPratyantar(null); }} aria-pressed={index === i}
        className={`rounded-lg border p-2 text-left text-sm ${index === i ? "border-amber-400 bg-amber-400/20" : "border-white/20"}`}>
        <strong>{p.lord}</strong>{p.active ? " · Current" : ""}<span className="block text-xs">{p.start} – {p.end}</span>
      </button>)}
    </div>
    <div className="space-y-3 rounded-xl border border-amber-300/20 p-3">
      <div><h3 className="font-semibold text-amber-100">{period.lord} Mahadasha</h3><p className="text-xs text-slate-400">{dateWindow}{period.active ? " · Active now" : " · Selected period"}</p></div>
      <PlanetContext lord={period.lord} chart={chart} />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-amber-100">Antardasha within {period.lord} Mahadasha</h4>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select Antardasha">
          {period.antardashas.map((item, i) => <button type="button" key={i} onClick={() => { setAntar(i); setPratyantar(null); }} aria-pressed={antarIndex === i}
            className={`rounded-md border px-3 py-2 text-sm ${antarIndex === i ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/20 text-slate-300"}`}>{item.lord}{item.active ? " · Now" : ""}</button>)}
        </div>
        <p className="text-xs text-slate-400">{sub.start} to {sub.end}</p>
        <p className="text-sm text-slate-300">The Antardasha sub-period introduces {sub.lord} as the secondary time lord within the {period.lord} Mahadasha. Read the two natal placements together: the Mahadasha lord supplies the main period context, while the Antardasha lord adds its own house placement, sign condition and house rulership.</p>
        <PlanetContext lord={sub.lord} chart={chart} />
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-amber-100">Pratyantardasha within {period.lord}/{sub.lord}</h4>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select Pratyantardasha">
          {sub.pratyantardashas.map((item, i) => <button type="button" key={i} onClick={() => setPratyantar(i)} aria-pressed={pdIndex === i}
            className={`rounded-md border px-2.5 py-2 text-xs ${pdIndex === i ? "border-violet-300 bg-violet-300/15 text-violet-100" : "border-white/20 text-slate-300"}`}>{item.lord}{item.active ? " · Now" : ""}</button>)}
        </div>
        {pd && <>
          <p className="text-xs text-slate-400">{pd.start} to {pd.end}</p>
          <p className="text-sm text-slate-300">The Pratyantardasha adds {pd.lord} as the third timing layer. Its natal placement and house rulership are read alongside both larger period lords, rather than treated as an isolated prediction.</p>
          <PlanetContext lord={pd.lord} chart={chart} />
        </>}
      </div>
    </div>
    <div className="rounded-lg border border-white/10 p-3 space-y-1">
      <h4 className="font-semibold text-amber-100">How to synthesize the three lords</h4>
      <p className="text-sm text-slate-300">Start with the Mahadasha lord's natal house placement and houses ruled. Add the Antardasha lord's placement and rulership to identify the second set of topics brought into the period. Then use the Pratyantardasha lord as the narrower timing layer. Evaluate dignity, dispositors, aspects and other verified chart testimony before making a judgment. The dates alone do not establish the nature of an event.</p>
    </div>
  </section>;
}
