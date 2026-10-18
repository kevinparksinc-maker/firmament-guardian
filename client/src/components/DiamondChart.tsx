import { useMemo, useState } from "react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";

/**
 * A house-first diamond projection of the canonical 360-degree chart.
 * Geometry is presentation only; no longitude, house or aspect is recalculated.
 * House numbering runs counterclockwise. Transit degrees are never reversed.
 */
const normalize = (v: number) => ((v % 360) + 360) % 360;
const center = 360;
const edge = (degrees: number, radius = 305) => {
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const scale = radius / (Math.abs(cos) + Math.abs(sin));
  return { x: center + cos * scale, y: center + sin * scale };
};
const angleFor = (house: number, fraction = 0.5) => -90 - ((house - 1) + fraction) * 30;
const fmt = (n: number) => Number(n.toFixed(1));

export function DiamondChart({ chart }: { chart: ChartResult }) {
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ kind: "natal" | "transit"; row: ChartRow } | null>(null);
  const [showTransits, setShowTransits] = useState(true);
  const houses = chart.houses.slice(0, 12);
  const natalRows = useMemo(
    () => [...chart.movingBodies, chart.ascendant, chart.descendant, chart.northNode, chart.southNode]
      .filter((row): row is ChartRow => Boolean(row)),
    [chart]
  );
  const transitRows = useMemo(
    () => chart.transits.filter(row => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node", "South Node"].includes(row.name)),
    [chart]
  );
  const angleOf = (row: ChartRow) => {
    const house = Math.max(1, Math.min(12, row.house));
    const start = houses[house - 1] ?? 0;
    const span = normalize((houses[house % 12] ?? start + 30) - start) || 30;
    const fraction = Math.min(0.999, Math.max(0, normalize(row.longitude - start) / span));
    return angleFor(house, fraction);
  };
  const plotted = [
    ...natalRows.map((row, i) => ({ row, kind: "natal" as const, i })),
    ...(showTransits ? transitRows.map((row, i) => ({ row, kind: "transit" as const, i })) : []),
  ];
  const currentHouse = selectedHouse == null ? null : houses[selectedHouse - 1];
  return (
    <section className="rounded-2xl border border-amber-200/20 bg-[#14181c] p-3 sm:p-5" aria-label="Primary diamond astrology chart">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-amber-100">Diamond chart</h3>
          <p className="text-xs text-slate-400">Houses 1–12 counterclockwise · precise 360° positions retained</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-cyan-100">
          <input type="checkbox" checked={showTransits} onChange={e => setShowTransits(e.target.checked)} />
          Show transits
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_230px]">
        <svg className="mx-auto h-auto w-full max-w-[720px]" viewBox="0 0 720 720" role="group" aria-label="Twelve counterclockwise houses inside a diamond">
          <path d="M 360 55 L 665 360 L 360 665 L 55 360 Z" fill="#20282f" stroke="#d8b66b" strokeWidth="3" />
          {Array.from({ length: 12 }, (_, i) => {
            const house = i + 1;
            const start = edge(angleFor(house, 0));
            const end = edge(angleFor(house, 1));
            const mid = edge(angleFor(house), 225);
            const active = selectedHouse === house;
            return <g key={house} role="button" tabIndex={0}
              onClick={() => { setSelectedHouse(house); setSelectedPoint(null); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedHouse(house); setSelectedPoint(null); } }}
              aria-label={`Select house ${house}`} className="cursor-pointer">
              <path d={`M 360 360 L ${fmt(start.x)} ${fmt(start.y)} L ${fmt(end.x)} ${fmt(end.y)} Z`}
                fill={active ? "rgba(34,211,238,.18)" : house % 2 ? "rgba(255,255,255,.025)" : "transparent"}
                stroke="#65717c" strokeWidth="1.3" />
              <text x={mid.x} y={mid.y} fill={active ? "#67e8f9" : "#d9c59a"} textAnchor="middle" dominantBaseline="middle" fontSize="17" fontWeight="bold">{house}</text>
            </g>;
          })}
          <circle cx="360" cy="360" r="46" fill="#14181c" stroke="#c39b50" />
          <text x="360" y="355" fontSize="12" fill="#f0dca9" textAnchor="middle">360°</text>
          <text x="360" y="373" fontSize="10" fill="#9fb3c8" textAnchor="middle">Firmament</text>
          {plotted.map(({ row, kind, i }) => {
            const theta = angleOf(row);
            const radius = kind === "natal" ? 155 + (i % 3) * 17 : 96 + (i % 3) * 14;
            const radians = theta * Math.PI / 180;
            const x = center + Math.cos(radians) * radius;
            const y = center + Math.sin(radians) * radius;
            const active = selectedPoint?.kind === kind && selectedPoint.row.name === row.name;
            return <g key={`${kind}-${row.name}`} role="button" tabIndex={0}
              onClick={() => { setSelectedPoint({ kind, row }); setSelectedHouse(null); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPoint({ kind, row }); setSelectedHouse(null); } }}
              className="cursor-pointer" aria-label={`${kind} ${row.name}, ${row.display}, house ${row.house}`}>
              <circle cx={x} cy={y} r={active ? 17 : 14} fill={kind === "natal" ? "#d8b66b" : "#4ac7d4"} stroke="#101820" strokeWidth="2" />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fill="#08131c" fontSize="10" fontWeight="bold">
                {row.name === "North Node" ? "NN" : row.name === "South Node" ? "SN" : row.name === "Ascendant" ? "Asc" : row.name === "Descendant" ? "Dsc" : row.name.slice(0, 2)}
              </text>
              <title>{kind} {row.name}: {row.display} · House {row.house}</title>
            </g>;
          })}
        </svg>
        <aside className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          <h4 className="mb-3 font-semibold text-amber-100">Chart details</h4>
          {selectedPoint ? <>
            <p className="font-semibold">{selectedPoint.kind === "natal" ? "Natal" : "Transit"} {selectedPoint.row.name}</p>
            <p className="mt-2">Position: {selectedPoint.row.display}</p>
            <p>Longitude: {selectedPoint.row.longitude.toFixed(6)}°</p>
            <p>House: {selectedPoint.row.house}</p>
          </> : selectedHouse != null ? <>
            <p className="font-semibold">House {selectedHouse}</p>
            <p className="mt-2">Cusp: {currentHouse?.toFixed(6)}°</p>
            {natalRows.filter(row => row.house === selectedHouse).map(row => <p key={row.name} className="mt-1">{row.name}: {row.display}</p>)}
          </> : <p className="text-slate-400">Select a house or planet to inspect its precise calculated coordinates. Gold is natal; cyan is transit. Transits use their true degrees, including retrograde motion.</p>}
        </aside>
      </div>
    </section>
  );
}
