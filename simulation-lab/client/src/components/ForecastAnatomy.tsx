import { useMemo, useState } from "react";
import { ChevronDown, Eye, GitCompare, Orbit, ShieldCheck } from "lucide-react";
import { Pill } from "@/components/ForecastUi";

type Layer = {
  name: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | "TIE";
  verdict: string;
  detail: string;
};

type Planet = {
  planet: string;
  tropicalLongitude: number;
  fixedBackgroundLongitude: number;
  house: number;
  sign: string;
  degreeInHouse: number;
  nakshatra: string;
  pada: number;
  starLord: string;
  subLord: string;
  isRetrograde: boolean;
};

type Frame = {
  allLayers: Layer[];
  synthesis: { scoreA: number; scoreB: number; winner: "A" | "B" | "TIE" };
};

type AnatomyResult = {
  input: { teamA: string; teamB: string };
  chart: { godView: { planets: Planet[]; houses: Array<{ house: number; sign: string; cuspLongitude: number }> }; agentView: { planets: Planet[]; houses: Array<{ house: number; sign: string; cuspLongitude: number }> } };
  godView: Frame;
  agentView: Frame;
};

function sideName(result: AnatomyResult, winner: Layer["winner"]) {
  return winner === "A" ? result.input.teamA : winner === "B" ? result.input.teamB : "Tie";
}

function frameKey(frame: "godView" | "agentView") {
  return frame === "godView" ? "God View" : "AgentView";
}

export function ForecastAnatomy({ result }: { result: AnatomyResult }) {
  const [activeFrame, setActiveFrame] = useState<"godView" | "agentView">("godView");
  const [openLayer, setOpenLayer] = useState<string | null>(null);
  const frame = result[activeFrame];
  const chart = result.chart[activeFrame];
  const comparison = useMemo(() => result.godView.allLayers.map((layer, index) => ({ god: layer, agent: result.agentView.allLayers[index] })), [result]);

  return (
    <section className="mt-6 panel anatomy-panel" id="forecast-anatomy">
      <div className="panel-header">
        <div>
          <p className="eyebrow text-cyan-200/80">Forecast Anatomy</p>
          <h2 className="section-title">Trace the forecast from chart to selection</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">This view exposes the chart snapshot and the engine detail returned by every method. It does not generate a post-hoc explanation from the final score.</p>
        </div>
        <div className="flex items-center gap-2"><Pill tone="cyan"><ShieldCheck size={12} /> Engine trace</Pill></div>
      </div>

      <div className="anatomy-toolbar">
        <div><p className="eyebrow">Calculation frame</p><p className="mt-1 text-xs text-slate-400">Switch frames to see which chart inputs changed.</p></div>
        <div className="flex rounded-lg border border-white/10 bg-black/10 p-1"><button onClick={() => setActiveFrame("godView")} className={`frame-toggle ${activeFrame === "godView" ? "frame-toggle-active" : ""}`}><Orbit size={13} /> God View</button><button onClick={() => setActiveFrame("agentView")} className={`frame-toggle ${activeFrame === "agentView" ? "frame-toggle-active" : ""}`}><Eye size={13} /> AgentView</button></div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="anatomy-card">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Planetary positions used</p><p className="mt-1 text-xs text-slate-500">Actual values passed to the {frameKey(activeFrame)} calculation.</p></div><Pill tone="gold">{chart.planets.length} bodies</Pill></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead><tr className="border-b border-white/[0.07] uppercase tracking-[0.12em] text-slate-600"><th className="pb-2">Body</th><th className="pb-2">Longitude</th><th className="pb-2">Sign / degree</th><th className="pb-2">House</th><th className="pb-2">Nakshatra</th><th className="pb-2">Star → Sub</th><th className="pb-2">State</th></tr></thead><tbody>{chart.planets.map((planet) => <tr key={planet.planet} className="border-b border-white/[0.04] last:border-0 text-slate-400"><td className="py-2 font-semibold text-slate-200">{planet.planet}</td><td className="py-2">{planet.fixedBackgroundLongitude.toFixed(2)}°</td><td className="py-2">{planet.sign} {planet.degreeInHouse.toFixed(2)}°</td><td className="py-2">H{planet.house}</td><td className="py-2">{planet.nakshatra} · P{planet.pada}</td><td className="py-2">{planet.starLord} → {planet.subLord}</td><td className="py-2">{planet.isRetrograde ? "Retrograde" : "Direct"}</td></tr>)}</tbody></table></div>
        </div>
        <div className="anatomy-card"><div className="flex items-center justify-between"><div><p className="eyebrow">House map</p><p className="mt-1 text-xs text-slate-500">The twelve house cusps used in this frame.</p></div><Pill tone="purple">12 houses</Pill></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{chart.houses.map((house) => <div className="house-chip" key={house.house}><strong>H{house.house}</strong><span>{house.sign}</span><em>{house.cuspLongitude.toFixed(2)}°</em></div>)}</div></div>
      </div>

      <div className="border-t border-white/[0.07] px-5 py-4"><div className="flex items-center justify-between"><div><p className="eyebrow">20-layer audit · {frameKey(activeFrame)}</p><p className="mt-1 text-xs text-slate-500">Open a method to inspect its actual engine detail, score, and selection.</p></div><Pill tone="emerald">{frame.allLayers.length} methods</Pill></div><div className="mt-4 space-y-2">{frame.allLayers.map((layer, index) => { const id = `${activeFrame}-${index}-${layer.name}`; const isOpen = openLayer === id; return <div className="layer-audit" key={id}><button onClick={() => setOpenLayer(isOpen ? null : id)} className="layer-audit-trigger"><span className={`verdict-dot verdict-${layer.verdict}`} /><span className="layer-audit-name">{layer.name}</span><span className="layer-audit-score">A {layer.scoreA} · B {layer.scoreB}</span><span className={`layer-selection layer-selection-${layer.winner.toLowerCase()}`}>{sideName(result, layer.winner)}</span><ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen && <div className="layer-audit-detail"><p className="eyebrow">Engine detail / calculation trace</p><p className="mt-2 text-xs leading-6 text-slate-300">{layer.detail}</p><div className="mt-3 flex flex-wrap gap-2"><Pill tone="slate">Selection: {sideName(result, layer.winner)}</Pill><Pill tone="slate">Royals/Team A: {layer.scoreA}</Pill><Pill tone="slate">Astros/Team B: {layer.scoreB}</Pill><Pill tone={layer.verdict === "unverified" ? "slate" : layer.verdict === "hit" ? "emerald" : "amber"}>{layer.verdict === "unverified" ? "Not scored yet" : layer.verdict}</Pill></div></div>}</div>; })}</div></div>

      <div className="border-t border-white/[0.07] px-5 py-4"><div className="flex items-center gap-2"><GitCompare size={15} className="text-cyan-300" /><p className="eyebrow">God View ↔ AgentView comparison</p></div><p className="mt-1 text-xs text-slate-500">Same method name, side-by-side output. Differences are visible in the actual scores and detail strings above.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[10px]"><thead><tr className="border-b border-white/[0.07] uppercase tracking-[0.12em] text-slate-600"><th className="pb-2">Method</th><th className="pb-2">God View</th><th className="pb-2">AgentView</th><th className="pb-2">Changed?</th></tr></thead><tbody>{comparison.map(({ god, agent }) => <tr className="border-b border-white/[0.04] last:border-0 text-slate-400" key={god.name}><td className="py-2 text-slate-200">{god.name}</td><td className="py-2">{god.winner} · {god.scoreA}/{god.scoreB}</td><td className="py-2">{agent.winner} · {agent.scoreA}/{agent.scoreB}</td><td className="py-2">{god.winner !== agent.winner || god.scoreA !== agent.scoreA || god.scoreB !== agent.scoreB ? <span className="text-amber-200">Yes</span> : <span className="text-emerald-200">No</span>}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}
