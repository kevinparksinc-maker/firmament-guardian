import type { ChartResult, ChartRow } from "../../../server/astronomy";

type Props = {
  natal?: ChartResult;
  transit: ChartResult;
  god: ChartResult;
};

const colors: Record<string, string> = { Sun: "#f4c95d", Moon: "#f4f1e8", Mercury: "#67e8f9", Venus: "#f0a6ca", Mars: "#fb7185", Jupiter: "#c4b5fd", Saturn: "#94a3b8", Uranus: "#5eead4", Neptune: "#818cf8", Pluto: "#d8b4fe", "North Node": "#86efac", "South Node": "#fdba74" };
const point = (longitude: number, radius: number, center: number) => { const angle = (longitude - 90) * Math.PI / 180; return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }; };
const shortName = (name: string) => name === "North Node" ? "NN" : name === "South Node" ? "SN" : name.slice(0, 2);
const bodies = (chart?: ChartResult) => chart?.movingBodies.filter(row => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node", "South Node"].includes(row.name)) ?? [];

function LayerLegend({ color, title, detail }: { color: string; title: string; detail: string }) {
  return <div className="flex items-start gap-2"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} /><div><div className="text-xs font-semibold text-slate-100">{title}</div><div className="text-[11px] leading-4 text-slate-500">{detail}</div></div></div>;
}

function Ring({ rows, radius, color, labelRadius, center }: { rows: ChartRow[]; radius: number; color: string; labelRadius: number; center: number }) {
  return <>{rows.map(row => { const p = point(row.longitude, radius, center); const label = point(row.longitude, labelRadius, center); return <g key={`${radius}-${row.name}`}><circle cx={p.x} cy={p.y} r="6" fill={colors[row.name] ?? color} stroke="#07111f" strokeWidth="2" /><text x={label.x} y={label.y} fill={colors[row.name] ?? color} fontSize="11" textAnchor="middle" dominantBaseline="middle">{shortName(row.name)}</text><title>{row.name} · {row.display}</title></g>; })}</>;
}

export function HoraryOrrery({ natal, transit, god }: Props) {
  const size = 620; const center = size / 2; const natalRows = bodies(natal); const transitRows = bodies(transit); const godRows = bodies(god);
  return <section className="rounded-2xl border border-cyan-200/15 bg-[#0b1322] p-4 shadow-2xl shadow-black/20 sm:p-6">
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[.24em] text-cyan-200">Three-layer question orrery</p><h2 className="mt-2 font-serif text-2xl text-white">One question, three coordinate frames</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The rings share the question moment but keep personal experience, local activation, and whole-sky context visibly separate.</p></div><div className="text-right text-[10px] uppercase tracking-[.16em] text-slate-500">Question moment<br /><span className="font-mono normal-case tracking-normal text-slate-300">{new Date(god.transitDate).toISOString()}</span></div></div>
    <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_230px]">
      <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-white/10 bg-[#070c16] p-2"><svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Three-layer horary orrery with natal, transit, and God View rings"><circle cx={center} cy={center} r="276" fill="none" stroke="#67e8f9" strokeOpacity=".2" strokeWidth="1" strokeDasharray="3 8" /><circle cx={center} cy={center} r="220" fill="none" stroke="#c4b5fd" strokeOpacity=".55" strokeWidth="2" /><circle cx={center} cy={center} r="160" fill="none" stroke="#f4c95d" strokeOpacity=".55" strokeWidth="2" /><circle cx={center} cy={center} r="92" fill="#101a2c" stroke="#67e8f9" strokeOpacity=".25" /><text x={center} y={center - 7} fill="#f8fafc" fontSize="17" textAnchor="middle" fontFamily="Georgia, serif">Question</text><text x={center} y={center + 15} fill="#94a3b8" fontSize="10" textAnchor="middle">same moment · three views</text><Ring rows={godRows} radius={276} labelRadius={294} color="#67e8f9" center={center} /><Ring rows={transitRows} radius={220} labelRadius={238} color="#c4b5fd" center={center} /><Ring rows={natalRows} radius={160} labelRadius={142} color="#f4c95d" center={center} /></svg></div>
      <div className="space-y-5 rounded-xl border border-white/10 bg-white/[.03] p-4"><LayerLegend color="#f4c95d" title="Natal / Agent" detail={natal ? "Birth chart, local houses, and personal angles." : "Unavailable until a complete birth profile is supplied."} /><LayerLegend color="#c4b5fd" title="Transit / Question moment" detail="Question-time sky compared against the natal foundation." /><LayerLegend color="#67e8f9" title="God View / Geocentric" detail="Whole-sky positions with no observer, horizon, or local houses." /><div className="border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">Reading rule: natal houses belong only to the person layer. Transit contacts describe activation. God View supplies context, never a personal Ascendant.</div></div>
    </div>
  </section>;
}
