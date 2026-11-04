import { useMemo, useState } from "react";
import type { ChartResult } from "../../../server/astronomy";
import { trpc } from "@/lib/trpc";

const DIVISIONS = ["D1", "D2", "D3", "D9", "D10"] as const;
const HOUSE_REGIONS = [
  { n: 1, points: "200,0 100,100 200,200 300,100", x: 200, y: 95 },
  { n: 2, points: "200,0 0,0 100,100", x: 108, y: 45 },
  { n: 3, points: "0,0 0,200 100,100", x: 49, y: 105 },
  { n: 4, points: "0,200 100,100 200,200 100,300", x: 100, y: 205 },
  { n: 5, points: "0,200 0,400 100,300", x: 49, y: 302 },
  { n: 6, points: "0,400 200,400 100,300", x: 108, y: 355 },
  { n: 7, points: "200,400 100,300 200,200 300,300", x: 200, y: 305 },
  { n: 8, points: "200,400 400,400 300,300", x: 294, y: 355 },
  { n: 9, points: "400,400 400,200 300,300", x: 350, y: 302 },
  { n: 10, points: "400,200 300,300 200,200 300,100", x: 300, y: 205 },
  { n: 11, points: "400,200 400,0 300,100", x: 350, y: 105 },
  { n: 12, points: "400,0 200,0 300,100", x: 294, y: 45 },
] as const;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_LORD: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const HOUSE_THEMES = [
  "body, identity, temperament and the way life is approached",
  "resources, possessions, family speech and accumulated wealth",
  "initiative, courage, effort, skills and siblings",
  "home, mother, foundations, inner security and property",
  "children, intelligence, learning, creativity and merit",
  "work, service, debts, conflict, discipline and health routines",
  "partnership, marriage, agreements and open counterparts",
  "longevity, vulnerability, inheritance, hidden matters and transformation",
  "dharma, teachers, higher learning, fortune and long journeys",
  "work in the world, responsibility, status and public action",
  "gains, networks, fulfillment and communities",
  "expenses, retreat, isolation, release and distant places",
];
type HouseData = { house: number; sign: string; planets: string[]; cusp?: number };
type Placement = { body: string; longitude: number; sign: string; house: number; sourceSign: string; sourceLongitude: number; divisionPart: number; formula: string };
type DivisionData = {
  division: string; name: string; purpose: string; formula: string;
  ascendant: { longitude: number; sign: string; sourceLongitude: number; divisionPart: number };
  houses: HouseData[]; placements: Placement[];
};
function fmt(longitude: number) {
  const value = ((longitude % 360) + 360) % 360;
  const degree = value % 30;
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}
function VedicDiamond({ houses, division }: { houses: HouseData[]; division: string }) {
  return <svg viewBox="0 0 400 400" role="img" aria-label={`${division} North Indian diamond with 12 houses`} className="mx-auto w-full max-w-md rounded-xl bg-slate-950 text-amber-100">
    {HOUSE_REGIONS.map(region => {
      const house = houses.find(h => h.house === region.n);
      return <g key={region.n}>
        <polygon points={region.points} fill="transparent" stroke="#d4a54e" strokeWidth="1.5"/>
        <text x={region.x} y={region.y - 17} textAnchor="middle" fontSize="11" fill="#fbbf24">H{region.n} · {house?.sign ?? "?"}</text>
        {(house?.planets ?? []).map((planet, i) => <text key={planet + i} x={region.x} y={region.y + i * 13} textAnchor="middle" fontSize="11" fill="#f8fafc">{planet}</text>)}
      </g>;
    })}
  </svg>;
}
function NetworkReading({ active }: { active: DivisionData }) {
  const byBody = useMemo(() => new Map(active.placements.map(p => [p.body, p])), [active.placements]);
  const houses = useMemo(() => active.houses.map(house => {
    const lord = SIGN_LORD[house.sign];
    const lordPlacement = byBody.get(lord);
    return { ...house, lord, lordPlacement };
  }), [active.houses, byBody]);
  const occupied = active.placements.filter(p => p.house >= 1 && p.house <= 12);
  const repeated = active.placements.filter(p => p.sign === p.sourceSign);
  return <div className="space-y-4">
    <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 p-3 space-y-1">
      <h4 className="font-semibold text-cyan-100">Divisional chart architecture</h4>
      <p className="text-sm text-slate-300">This is a mathematical projection of the supplied D1 longitudes. It does not create a second birth chart or a new astronomical observation. The divisional Ascendant establishes the equal-house frame used below.</p>
      <p className="text-xs text-slate-400">Ascendant: {active.ascendant.sign} {fmt(active.ascendant.longitude)} · Source Ascendant: {fmt(active.ascendant.sourceLongitude)} · Division segment: {active.ascendant.divisionPart}</p>
    </div>
    <div className="space-y-2">
      <h4 className="font-semibold text-amber-100">House-by-house lordship analysis</h4>
      {houses.map(house => <article key={house.house} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-sm text-amber-100">House {house.house} · {house.sign}</strong>
          <span className="text-xs text-cyan-200">{house.lord} rules this sign</span>
        </div>
        <p className="text-sm text-slate-300">{HOUSE_THEMES[house.house - 1]}.</p>
        <p className="text-sm text-slate-300">{house.lordPlacement
          ? `The house ruler ${house.lord} is placed in ${house.lordPlacement.sign}, House ${house.lordPlacement.house}, at ${fmt(house.lordPlacement.longitude)}. This links the affairs of House ${house.house} with the topics of House ${house.lordPlacement.house}; the actual condition of the ruler must be considered before judging the result.`
          : `The sign ruler ${house.lord} is not present in the supplied planetary list, so its placement-based house connection cannot be assessed here.`}</p>
        <p className="text-xs text-slate-400">Planets occupying this house: {house.planets.length ? house.planets.join(", ") : "No listed planets"}</p>
      </article>)}
    </div>
    <div className="space-y-2">
      <h4 className="font-semibold text-amber-100">Planet-by-planet projection</h4>
      {active.placements.map(planet => <article key={planet.body} className="rounded-lg border border-white/10 p-3 space-y-1">
        <strong className="text-sm text-white">{planet.body} · {planet.sign} {fmt(planet.longitude)} · House {planet.house}</strong>
        <p className="text-sm text-slate-300">D1 source: {planet.sourceSign} {fmt(planet.sourceLongitude)}. Division segment: {planet.divisionPart}. The planet's divisional sign and house describe its placement in this specific varga, while the D1 source position remains the underlying natal reference.</p>
        <p className="text-xs text-slate-400">{planet.sign === planet.sourceSign
          ? "The sign repeats from D1, so the sign emphasis is retained across the two layers."
          : "The sign changes in this varga, showing a distinct sign context for the same natal planetary longitude."}</p>
      </article>)}
    </div>
    <div className="rounded-xl border border-amber-300/20 p-3 space-y-1">
      <h4 className="font-semibold text-amber-100">Cross-layer observations</h4>
      <p className="text-sm text-slate-300">{repeated.length} of {active.placements.length} listed planetary placements retain their D1 sign in this division. {occupied.length} placements are represented in the twelve-house ledger.</p>
      <p className="text-sm text-slate-300">Repeated signs identify continuity of sign placement; changed signs identify a different divisional context. Neither observation alone establishes strength or guarantees an event. Those judgments require dignity, aspects, yogas, dispositors and the relevant timing layer.</p>
    </div>
  </div>;
}

/** Projects the active natal chart only; no second birth calculation is performed. */
export function VedicDivisionalCharts({ chart }: { chart: ChartResult }) {
  const [selected, setSelected] = useState<(typeof DIVISIONS)[number]>("D1");
  const { data, isLoading, error, refetch, isFetching } = trpc.vedic.divisionalCharts.useQuery({ chart }, {
    retry: 2, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), staleTime: 60_000,
  });
  const active = data?.find(item => item.division === selected) as DivisionData | undefined;
  return <section aria-label="Vedic divisional charts" className="rounded-2xl border border-amber-400/30 bg-slate-950/70 p-4 space-y-4">
    <div>
      <h2 className="font-serif text-xl font-bold text-amber-100">Vedic Divisional Charts</h2>
      <p className="text-sm text-slate-300">D1, D2, D3, D9 and D10 are projected from the active natal chart. No second birth calculation.</p>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Select divisional chart">
      {DIVISIONS.map(division => <button type="button" key={division} aria-pressed={selected === division}
        className={`rounded-lg border px-3 py-2 text-sm ${selected === division ? "border-amber-400 bg-amber-400/20 text-amber-100" : "border-white/20 text-slate-300"}`}
        onClick={() => setSelected(division)}>{division}</button>)}
    </div>
    {isLoading && <p role="status" className="text-sm text-slate-300">Deriving divisional charts from natal positions…</p>}
    {error && <div role="alert" className="rounded-lg border border-rose-300/20 bg-rose-950/20 p-3 text-sm text-rose-200 space-y-2">
      <p>Divisional chart request failed: {error.message}</p>
      <p className="text-xs text-rose-100/80">If this says “Failed to fetch”, the browser did not receive a usable API response. Check server availability, deployment URL, and network/CORS configuration; it is not evidence that the chart has no divisional placements.</p>
      <button type="button" onClick={() => void refetch()} disabled={isFetching} className="rounded-lg border border-rose-200/30 px-3 py-2 text-xs disabled:opacity-50">{isFetching ? "Retrying…" : "Retry divisional calculation"}</button>
    </div>}
    {active && <>
      <div className="space-y-1">
        <h3 className="font-semibold text-amber-100">{active.division} — {active.name}</h3>
        <p className="text-sm text-slate-300">{active.purpose}</p>
        <p className="text-xs text-slate-400">Calculation: {active.formula}</p>
      </div>
      <VedicDiamond houses={active.houses} division={active.division} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Twelve divisional houses">
        {active.houses.map(house => <div key={house.house} className="rounded-lg border border-white/15 bg-slate-900/70 p-3">
          <p className="text-sm font-semibold text-amber-100">House {house.house} · {house.sign}</p>
          <p className="text-xs text-slate-300">{house.planets.join(", ") || "No listed planets"}</p>
        </div>)}
      </div>
      <NetworkReading active={active} />
      <details className="text-sm text-slate-300"><summary className="cursor-pointer">Show exact planetary derivations</summary>
        <div className="mt-2 space-y-2">{active.placements.map(planet => <p key={planet.body}>
          <strong>{planet.body}</strong>: source {planet.sourceSign} {fmt(planet.sourceLongitude)} → {planet.sign} {fmt(planet.longitude)}, segment {planet.divisionPart}, House {planet.house}. {planet.formula}
        </p>)}</div>
      </details>
    </>}
  </section>;
}
