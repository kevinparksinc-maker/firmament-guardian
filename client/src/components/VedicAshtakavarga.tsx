import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const AVERAGE_SAV = 337 / 12;
const HOUSE_TOPICS = [
  "identity and the body", "resources, speech and family", "effort, courage and siblings",
  "home and foundations", "learning, creativity and children", "service, work and conflict",
  "partnerships and agreements", "shared resources and transformation", "dharma and higher learning",
  "vocation and public standing", "gains and networks", "expenses and retreat",
];
type BAVRow = { planet: string; scores: number[]; total: number };
type SAVRow = { sign: string; score: number };
function rankLabel(score: number) {
  if (score >= 32) return "Above the usual SAV reference level";
  if (score >= 28) return "Near the usual SAV reference level";
  return "Below the usual SAV reference level";
}
function scoreMeaning(score: number) {
  if (score >= 32) return "This sign receives comparatively higher aggregate bindu support in this chart's SAV calculation.";
  if (score >= 28) return "This sign is near or slightly above the traditional aggregate reference average.";
  return "This sign receives comparatively lower aggregate bindu support and deserves closer contextual review.";
}
export function VedicAshtakavarga({ chart }: { chart: ChartResult }) {
  const { data, isLoading, error, refetch, isFetching } = trpc.vedic.ashtakavargaVisual.useQuery({ chart }, {
    retry: 2, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), staleTime: 60_000,
  });
  const [selectedPlanet, setSelectedPlanet] = useState<string>("Sun");
  const [showAllSigns, setShowAllSigns] = useState(false);
  const ascSignIndex = chart.ascendant ? Math.floor((((chart.ascendant.longitude % 360) + 360) % 360) / 30) : null;
  const savRank = useMemo(() => data?.available ? [...data.sav].sort((a, b) => b.score - a.score) : [], [data]);
  const activeBav = data?.available ? data.bav.find(row => row.planet === selectedPlanet) : undefined;
  return <section className="space-y-4 rounded-2xl border border-amber-400/30 bg-slate-950/70 p-4" aria-label="Ashtakavarga strength chart">
    <div><h2 className="font-serif text-xl font-bold text-amber-100">Ashtakavarga · Planetary and Sign Strength</h2>
      <p className="text-sm text-slate-300">Classical Bhinnashtakavarga (BAV) and Sarvashtakavarga (SAV), calculated from the same natal planetary positions supplied to the reading engine.</p></div>
    {isLoading && <p role="status">Calculating and validating bindu strengths…</p>}
    {error && <div role="alert" className="rounded-lg border border-rose-300/20 bg-rose-950/20 p-3 text-sm text-rose-200 space-y-2">
      <p>Ashtakavarga request failed: {error.message}</p>
      <p className="text-xs text-rose-100/80">“Failed to fetch” means the browser did not receive a usable API response. Check server availability, deployment URL and network/CORS configuration. No replacement scores are generated.</p>
      <button type="button" onClick={() => void refetch()} disabled={isFetching} className="rounded-lg border border-rose-200/30 px-3 py-2 text-xs disabled:opacity-50">{isFetching ? "Retrying…" : "Retry Ashtakavarga calculation"}</button>
    </div>}
    {data && !data.available && <div className="rounded-lg border border-amber-300/20 p-3 text-sm text-amber-100"><strong>Scores withheld by validation.</strong><p className="mt-1 text-slate-300">{data.reason}</p></div>}
    {data?.available && <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.sav.map(({ sign, score }) => {
          const house = ascSignIndex === null ? null : ((SIGNS.indexOf(sign) - ascSignIndex + 12) % 12) + 1;
          return <div key={sign} className="rounded-lg border border-white/20 p-3">
            <div className="flex items-center justify-between gap-2 text-sm"><strong>{sign}</strong><span className="tabular-nums">{score}</span></div>
            <p className="mt-1 text-[11px] text-slate-400">{house ? `House ${house}` : "House unavailable"} · {rankLabel(score)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-amber-400" style={{ width: `${Math.min(100, score / 56 * 100)}%` }} /></div>
          </div>;
        })}
      </div>
      <p className="text-sm font-semibold text-amber-100">SAV checksum: {data.total} / 337 bindus</p>
      <p className="text-xs text-slate-400">Reference average: {AVERAGE_SAV.toFixed(2)} bindus per sign (337 ÷ 12). This is a comparative scoring framework, not a probability or guaranteed outcome.</p>
      <div className="rounded-xl border border-amber-300/20 p-3 space-y-2">
        <h3 className="font-semibold text-amber-100">SAV: highest and lowest sign totals</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Highest scoring</p>{savRank.slice(0, 3).map(row => <p key={row.sign} className="text-sm text-slate-200">{row.sign}: {row.score} · {rankLabel(row.score)}</p>)}</div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-rose-200">Lowest scoring</p>{savRank.slice(-3).reverse().map(row => <p key={row.sign} className="text-sm text-slate-200">{row.sign}: {row.score} · {rankLabel(row.score)}</p>)}</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <caption className="mb-2 text-left text-sm font-semibold text-amber-100">BAV · Seven classical planetary contributions across twelve signs</caption>
          <thead><tr><th className="p-2 text-left">Planet</th>{data.sav.map(x => <th key={x.sign} className="p-2" title={x.sign}>{x.sign.slice(0, 3)}</th>)}<th className="p-2">Total</th></tr></thead>
          <tbody>{data.bav.map((row: BAVRow) => <tr key={row.planet} className="border-t border-white/15"><th className="p-2 text-left">{row.planet}</th>{row.scores.map((score, i) => <td key={i} className="p-2 text-center tabular-nums">{score}</td>)}<td className="p-2 text-center font-semibold">{row.total}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="space-y-3 rounded-xl border border-cyan-300/20 bg-cyan-950/15 p-3">
        <h3 className="font-semibold text-cyan-100">Planet-by-planet BAV interpretation</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select BAV planet">
          {data.bav.map((row: BAVRow) => <button type="button" key={row.planet} onClick={() => setSelectedPlanet(row.planet)} aria-pressed={selectedPlanet === row.planet}
            className={`rounded-md border px-3 py-2 text-xs ${selectedPlanet === row.planet ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/20 text-slate-300"}`}>{row.planet}</button>)}
        </div>
        {activeBav && (() => {
          const highest = Math.max(...activeBav.scores);
          const lowest = Math.min(...activeBav.scores);
          const highSigns = activeBav.scores.map((score, i) => score === highest ? SIGNS[i] : null).filter(Boolean);
          const lowSigns = activeBav.scores.map((score, i) => score === lowest ? SIGNS[i] : null).filter(Boolean);
          return <div className="space-y-2">
            <p className="text-sm text-slate-200">{activeBav.planet} contributes {activeBav.total} bindus across the twelve signs. Its highest contribution is {highest} in {highSigns.join(", ")}; its lowest is {lowest} in {lowSigns.join(", ")}.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{activeBav.scores.map((score, i) => <div key={SIGNS[i]} className="rounded-lg border border-white/10 p-2">
              <p className="text-xs text-slate-400">{SIGNS[i]}</p><p className="text-sm font-semibold text-white">{score} bindus</p>
            </div>)}</div>
          </div>;
        })()}
      </div>
      <div className="space-y-2">
        <button type="button" onClick={() => setShowAllSigns(value => !value)} aria-expanded={showAllSigns} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200">
          {showAllSigns ? "Hide" : "Open"} sign-by-sign SAV interpretation
        </button>
        {showAllSigns && <div className="space-y-2">{data.sav.map((row: SAVRow) => {
          const house = ascSignIndex === null ? null : ((SIGNS.indexOf(row.sign) - ascSignIndex + 12) % 12) + 1;
          return <article key={row.sign} className="rounded-lg border border-white/10 p-3 space-y-1">
            <strong className="text-sm text-amber-100">{row.sign} · {row.score} bindus{house ? ` · Natal House ${house}` : ""}</strong>
            <p className="text-sm text-slate-300">{scoreMeaning(row.score)}</p>
            <p className="text-xs text-slate-400">{house ? `In the supplied natal Ascendant frame, this sign corresponds to House ${house}: ${HOUSE_TOPICS[house - 1]}.` : "The natal Ascendant is unavailable, so this sign cannot be mapped to a natal house here."} Interpret this score together with the planets occupying or ruling the sign and the relevant timing period.</p>
          </article>;
        })}</div>}
      </div>
      <p className="text-xs text-slate-400">Evidence: {data.evidenceId}. Classical BAV totals and the 337-point SAV checksum are validated before display. Higher totals indicate comparatively greater bindu support within this scoring method, not certainty about an event.</p>
    </>}
  </section>;
}
