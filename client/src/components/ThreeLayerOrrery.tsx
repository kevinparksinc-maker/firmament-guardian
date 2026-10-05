import { useMemo, useState } from "react";

type Layer = "natal" | "transit" | "god";

type Body = { name: string; glyph: string; longitude: number; color: string; detail: string };

const layers: Record<Layer, { label: string; short: string; color: string; description: string; bodies: Body[] }> = {
  natal: {
    label: "Natal / Agent",
    short: "NATAL",
    color: "#f6ae2d",
    description: "The person’s birth sky: local houses, angles, and the enduring foundation.",
    bodies: [
      { name: "Sun", glyph: "☉", longitude: 228, color: "#f6ae2d", detail: "Scorpio 18° · Agent House 4" },
      { name: "Moon", glyph: "☽", longitude: 44, color: "#f0f4f8", detail: "Taurus 14° · Agent House 10" },
      { name: "Venus", glyph: "♀", longitude: 187, color: "#f0a6ca", detail: "Libra 7° · Agent House 3" },
      { name: "Mars", glyph: "♂", longitude: 311, color: "#fb7185", detail: "Aquarius 11° · Agent House 7" },
    ],
  },
  transit: {
    label: "Transit / Question moment",
    short: "TRANSIT",
    color: "#9d4edd",
    description: "The sky at the question moment, compared with the natal foundation.",
    bodies: [
      { name: "Sun", glyph: "☉", longitude: 198, color: "#f6ae2d", detail: "Libra 18° · activating natal Venus" },
      { name: "Moon", glyph: "☽", longitude: 92, color: "#f0f4f8", detail: "Cancer 2° · question co-significator" },
      { name: "Venus", glyph: "♀", longitude: 164, color: "#f0a6ca", detail: "Virgo 14° · applying contact" },
      { name: "Mars", glyph: "♂", longitude: 250, color: "#fb7185", detail: "Sagittarius 10° · separating contact" },
    ],
  },
  god: {
    label: "God View / Geocentric",
    short: "GOD VIEW",
    color: "#00e5ff",
    description: "The whole-sky frame: geocentric positions with no observer, horizon, or local houses.",
    bodies: [
      { name: "Sun", glyph: "☉", longitude: 198, color: "#f6ae2d", detail: "Libra 18° · geocentric" },
      { name: "Moon", glyph: "☽", longitude: 92, color: "#f0f4f8", detail: "Cancer 2° · geocentric" },
      { name: "Venus", glyph: "♀", longitude: 164, color: "#f0a6ca", detail: "Virgo 14° · geocentric" },
      { name: "Mars", glyph: "♂", longitude: 250, color: "#fb7185", detail: "Sagittarius 10° · geocentric" },
    ],
  },
};

const zodiac = ["ARI", "TAU", "GEM", "CAN", "LEO", "VIR", "LIB", "SCO", "SAG", "CAP", "AQU", "PIS"];
const polar = (longitude: number, radius: number, center: number) => { const angle = (longitude - 90) * Math.PI / 180; return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }; };

function Ring({ radius, stroke, dashed = false }: { radius: number; stroke: string; dashed?: boolean }) {
  return <circle cx="200" cy="200" r={radius} fill="none" stroke={stroke} strokeOpacity=".55" strokeWidth="1.5" strokeDasharray={dashed ? "2 8" : undefined} />;
}

export function ThreeLayerOrrery() {
  const [layer, setLayer] = useState<Layer>("god");
  const selected = layers[layer];
  const activeBodies = useMemo(() => selected.bodies, [selected]);
  return <div className="space-y-5">
    <div className="flex gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5" role="tablist" aria-label="Orrery layers">
      {(Object.keys(layers) as Layer[]).map(key => <button key={key} type="button" role="tab" aria-selected={key === layer} onClick={() => setLayer(key)} className={`flex-1 rounded-xl px-2 py-3 text-[10px] font-bold tracking-[.12em] transition ${key === layer ? "text-slate-950" : "text-slate-400 hover:text-white"}`} style={key === layer ? { background: layers[key].color } : undefined}>{layers[key].short}</button>)}
    </div>
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#060a13]/80 p-3 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,.10),transparent_34%),radial-gradient(circle_at_20%_10%,rgba(157,78,221,.10),transparent_30%)]" />
      <svg viewBox="0 0 400 400" className="relative aspect-square w-full" role="img" aria-label={`${selected.label} orrery`}>
        <circle cx="200" cy="200" r="184" fill="none" stroke="#8a9ebd" strokeOpacity=".16" />
        <Ring radius={156} stroke="#00e5ff" dashed />
        <Ring radius={124} stroke="#9d4edd" />
        <Ring radius={88} stroke="#f6ae2d" />
        <circle cx="200" cy="200" r="44" fill="#101827" stroke={selected.color} strokeOpacity=".6" />
        <text x="200" y="196" textAnchor="middle" fill="#f0f4f8" fontSize="12" fontFamily="DM Mono, monospace">QUESTION</text>
        <text x="200" y="213" textAnchor="middle" fill="#8a9ebd" fontSize="8" fontFamily="DM Mono, monospace">THREE VIEWS</text>
        {zodiac.map((sign, index) => { const p = polar(index * 30 + 15, 173, 200); return <text key={sign} x={p.x} y={p.y} fill="#8a9ebd" fontSize="7" textAnchor="middle" dominantBaseline="middle" fontFamily="DM Mono, monospace">{sign}</text>; })}
        {activeBodies.map(body => { const p = polar(body.longitude, layer === "god" ? 156 : layer === "transit" ? 124 : 88, 200); return <g key={body.name}><circle cx={p.x} cy={p.y} r="9" fill="#07101d" stroke={body.color} strokeWidth="2" /><text x={p.x} y={p.y + 3.5} textAnchor="middle" fill={body.color} fontSize="11">{body.glyph}</text><title>{body.name} · {body.detail}</title></g>; })}
        <line x1="24" y1="200" x2="376" y2="200" stroke="#8a9ebd" strokeOpacity=".08" />
        <line x1="200" y1="24" x2="200" y2="376" stroke="#8a9ebd" strokeOpacity=".08" />
      </svg>
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-[10px] uppercase tracking-[.16em] text-slate-500"><span style={{ color: selected.color }}>{selected.label}</span><span>tap a body for detail</span></div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: selected.color }}>Active layer</div><h3 className="mt-1 font-serif text-2xl text-white">{selected.label}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{selected.description}</p><div className="mt-4 grid grid-cols-2 gap-2">{activeBodies.map(body => <div key={body.name} className="rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex items-center gap-2 text-sm text-slate-100"><span style={{ color: body.color }} className="text-lg">{body.glyph}</span>{body.name}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{body.detail}</div></div>)}</div></div>
  </div>;
}
