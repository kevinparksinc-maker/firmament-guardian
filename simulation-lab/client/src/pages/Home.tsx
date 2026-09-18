import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowUpRight,
  Beaker,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  Download,
  FileUp,
  Filter,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers3,
  Map,
  MoreHorizontal,
  Orbit,
  Play,
  Plus,
  Radio,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trophy,
  Upload,
  Users,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { ForecastAnatomy } from "@/components/ForecastAnatomy";

type Template = {
  id: string;
  sport: string;
  code: string;
  label: string;
  events: number;
  range: string;
  status: "ready" | "draft";
  accent: string;
};

const templates: Template[] = [
  { id: "mlb-2024", sport: "MLB", code: "MLB", label: "2024 regular season", events: 2430, range: "Mar 28 — Sep 29, 2024", status: "ready", accent: "orange" },
  { id: "nfl-2023", sport: "NFL", code: "NFL", label: "2023 regular season", events: 272, range: "Sep 7, 2023 — Jan 7, 2024", status: "ready", accent: "blue" },
  { id: "nba-2024", sport: "NBA", code: "NBA", label: "2023–24 regular season", events: 1230, range: "Oct 24, 2023 — Apr 14, 2024", status: "ready", accent: "purple" },
  { id: "custom", sport: "Custom", code: "CSV", label: "Imported event set", events: 0, range: "Awaiting upload", status: "draft", accent: "slate" },
];

const recentRuns = [
  { name: "MLB 2024 baseline replay", meta: "2,430 events · Polaris fixed-RA", status: "Complete", score: "54.7%", time: "12 min ago", color: "emerald" },
  { name: "NFL upset stress test", meta: "272 events · God + Agent split", status: "Complete", score: "51.8%", time: "Yesterday", color: "cyan" },
  { name: "Hamal anchor comparison", meta: "48 events · challenger frame", status: "Queued", score: "—", time: "Waiting for engine", color: "amber" },
];

const constellation = [
  { label: "ASC", value: 72, x: "9%", y: "46%", tone: "cyan" },
  { label: "Hamal", value: 88, x: "29%", y: "20%", tone: "gold" },
  { label: "Moon", value: 58, x: "52%", y: "62%", tone: "violet" },
  { label: "KP", value: 81, x: "77%", y: "29%", tone: "cyan" },
  { label: "DESC", value: 41, x: "90%", y: "70%", tone: "rose" },
];

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "cyan" | "gold" | "emerald" | "amber" | "purple" }) {
  const styles = {
    slate: "border-white/10 bg-white/[0.045] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200",
    gold: "border-amber-300/20 bg-amber-300/[0.08] text-amber-200",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200",
    amber: "border-orange-300/20 bg-orange-300/[0.08] text-orange-200",
    purple: "border-violet-300/20 bg-violet-300/[0.08] text-violet-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles[tone]}`}>{children}</span>;
}

function StatCard({ icon: Icon, eyebrow, value, detail, accent }: { icon: typeof Activity; eyebrow: string; value: string; detail: string; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111a2b]/80 p-5 shadow-[0_16px_50px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16]">
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
          <p className="mt-3 font-display text-3xl tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-slate-300"><Icon size={17} strokeWidth={1.6} /></div>
      </div>
    </div>
  );
}

function FrameMap({ frame, mode }: { frame: string; mode: "god" | "agent" }) {
  const isGod = mode === "god";
  return (
    <div className="relative h-[212px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#09111f]">
      <div className={`absolute inset-0 opacity-80 ${isGod ? "map-grid-god" : "map-grid-agent"}`} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 260" preserveAspectRatio="none" aria-hidden="true">
        <path d={isGod ? "M-20 188 C75 98 105 242 190 137 S330 43 420 124 S490 155 550 61" : "M-20 56 C80 158 143 10 230 110 S350 228 430 113 S510 80 550 186"} fill="none" stroke={isGod ? "#4fe2ff" : "#b99aff"} strokeOpacity=".7" strokeWidth="1.2" />
        <path d={isGod ? "M-20 217 C60 180 132 214 202 178 S336 136 412 182 S504 210 550 160" : "M-20 92 C64 45 123 88 196 69 S340 28 415 82 S500 136 550 113"} fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth=".8" />
        <circle cx={isGod ? "194" : "312"} cy={isGod ? "137" : "110"} r="3.5" fill={isGod ? "#f2be67" : "#d6b4ff"} />
        <circle cx={isGod ? "194" : "312"} cy={isGod ? "137" : "110"} r="14" fill="none" stroke={isGod ? "#f2be67" : "#d6b4ff"} strokeOpacity=".32" />
      </svg>
      <div className="absolute left-4 top-4 flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${isGod ? "bg-cyan-300" : "bg-violet-300"}`} /><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{frame}</span></div>
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Coordinate frame</p><p className="mt-1 text-xs text-slate-300">{isGod ? "Ancient fixed background" : "Event-local topography"}</p></div>
        <Pill tone={isGod ? "cyan" : "purple"}>{isGod ? "Hamal / 13° Aries" : "Observer horizon"}</Pill>
      </div>
    </div>
  );
}

function PlacementTable({ planets }: { planets: Array<{ planet: string; sign: string; house: number; degreeInHouse: number; nakshatra: string; starLord: string; subLord: string; isRetrograde: boolean }> }) {
  return <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.018]">
    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><div><p className="eyebrow">Planetary placements</p><p className="mt-1 text-[11px] text-slate-500">Fixed-background chart snapshot · tropical ephemeris input</p></div><Pill tone="gold">{planets.length} bodies</Pill></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-white/[0.05] text-[9px] uppercase tracking-[0.15em] text-slate-600"><th className="px-4 py-2.5">Body</th><th>Sign</th><th>House</th><th>Degree</th><th>Lunar mansion</th><th>Star → Sub</th><th>State</th></tr></thead><tbody>{planets.map((planet) => <tr key={planet.planet} className="border-b border-white/[0.04] last:border-0 text-[11px] text-slate-400"><td className="px-4 py-2.5 font-semibold text-slate-200">{planet.planet}</td><td>{planet.sign}</td><td>H{planet.house}</td><td>{planet.degreeInHouse.toFixed(2)}°</td><td>{planet.nakshatra}</td><td>{planet.starLord} <span className="text-slate-700">→</span> {planet.subLord}</td><td>{planet.isRetrograde ? <span className="text-amber-200">Retrograde</span> : <span className="text-emerald-200/70">Direct</span>}</td></tr>)}</tbody></table></div>
  </div>;
}

function GameBrief({ result }: { result: any }) {
  const teamName = (side: string | null | undefined) => side === "A" ? result.input.teamA : side === "B" ? result.input.teamB : side === "TIE" ? "No clear winner" : "Not available";
  const actual = result.comparison.actualWinner as string | null;
  const god = result.godView.synthesis.winner as string;
  const agent = result.agentView.synthesis.winner as string;
  const baseline = result.baseline.winner as string;
  const hits = result.godView.summary.hits + result.agentView.summary.hits;
  const total = result.godView.allLayers.length + result.agentView.allLayers.length;
  const agreement = god === agent && god !== "TIE" ? "Strong agreement" : god === "TIE" || agent === "TIE" ? "No clear call" : "Split decision";
  const evidence = hits / Math.max(total, 1) >= 0.7 && agreement === "Strong agreement" ? "Strong evidence" : hits / Math.max(total, 1) >= 0.45 ? "Moderate evidence" : "Conflicted evidence";
  const supporting = [
    ...result.godView.allLayers.map((layer: any) => ({ ...layer, frame: "God View" })),
    ...result.agentView.allLayers.map((layer: any) => ({ ...layer, frame: "AgentView" })),
  ].filter((layer: any) => layer.verdict === "hit");
  const conflicting = [
    ...result.godView.allLayers.map((layer: any) => ({ ...layer, frame: "God View" })),
    ...result.agentView.allLayers.map((layer: any) => ({ ...layer, frame: "AgentView" })),
  ].filter((layer: any) => layer.verdict === "miss");
  const explanation = agreement === "Strong agreement"
    ? `Both analysis views selected ${teamName(god)}. The system saw a consistent signal across the fixed-background and event-local perspectives.`
    : `The analysis views did not agree. God View selected ${teamName(god)}, while AgentView selected ${teamName(agent)}. This is useful research evidence, but it should not be treated as a unified call.`;
  return <section className="mt-6 panel game-brief"><div className="panel-header"><div><p className="eyebrow text-cyan-200/80">Plain-language result</p><h2 className="section-title">Game Brief</h2><p className="mt-1 text-xs text-slate-500">A simple explanation of what the simulator found before the technical details.</p></div><Pill tone={evidence === "Strong evidence" ? "emerald" : evidence === "Moderate evidence" ? "gold" : "amber"}>{evidence}</Pill></div><div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_.8fr_.8fr]"><div className="brief-call"><p className="eyebrow">System call</p><p className="mt-2 font-display text-3xl text-white">{teamName(baseline)}</p><p className="mt-1 text-xs text-slate-500">Baseline synthesis</p><div className="mt-4 flex flex-wrap gap-2"><span className={`brief-result ${actual && baseline === actual ? "brief-result-hit" : "brief-result-miss"}`}>{actual ? (baseline === actual ? "HIT" : "MISS") : "AWAITING FINAL RESULT"}</span><span className="brief-result">{agreement}</span></div></div><div className="brief-stat"><p className="eyebrow">Actual result</p><p className="mt-2 font-display text-2xl text-white">{teamName(actual)}</p><p className="mt-1 text-xs text-slate-500">{actual ? "Verified historical outcome" : "This game has not been scored yet"}</p><div className="mt-4 grid grid-cols-2 gap-2"><div><span className="brief-label">God View</span><strong>{teamName(god)}</strong></div><div><span className="brief-label">AgentView</span><strong>{teamName(agent)}</strong></div></div></div><div className="brief-stat"><p className="eyebrow">Evidence score</p><p className="mt-2 font-display text-2xl text-white">{hits}<span className="text-base text-slate-500"> / {total}</span></p><p className="mt-1 text-xs text-slate-500">Frame evaluations matching the verified result</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300" style={{ width: `${Math.min(100, (hits / Math.max(total, 1)) * 100)}%` }} /></div></div></div><div className="brief-explanation"><div><p className="eyebrow">Why did the system say that?</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{explanation}</p><p className="mt-2 text-xs leading-5 text-slate-500">God View uses the permanent fixed background. AgentView uses the event-local horizon. Comparing them shows whether the result is stable or environment-dependent.</p></div><div className="brief-grid"><div><div className="flex items-center justify-between"><p className="brief-list-title text-emerald-200">Hits / supported layers</p><span className="brief-count brief-count-hit">{supporting.length}</span></div>{supporting.length ? supporting.map((layer: any) => <div key={`support-${layer.frame}-${layer.name}`} className="brief-list-item"><span className="verdict-dot verdict-hit" /><span>{layer.name}</span><em>{layer.frame}</em></div>) : <p className="mt-2 text-xs text-slate-600">No verified supporting layers.</p>}</div><div><div className="flex items-center justify-between"><p className="brief-list-title text-rose-200">Misses / conflicting layers</p><span className="brief-count brief-count-miss">{conflicting.length}</span></div>{conflicting.length ? conflicting.map((layer: any) => <div key={`conflict-${layer.frame}-${layer.name}`} className="brief-list-item"><span className="verdict-dot verdict-miss" /><span>{layer.name}</span><em>{layer.frame}</em></div>) : <p className="mt-2 text-xs text-slate-600">No conflicting layers.</p>}</div></div></div></section>;
}

const workspaceNav: Array<[ComponentType<{ size?: number; strokeWidth?: number }>, string, boolean]> = [
  [Activity, "Overview", true],
  [FlaskConical, "Simulation runs", false],
  [Map, "Frame inspector", false],
  [Sparkles, "AI Pattern Lab", false],
];

const dataNav: Array<[ComponentType<{ size?: number; strokeWidth?: number }>, string]> = [
  [Database, "Event library"],
  [GitBranch, "Engine versions"],
  [Target, "Validation rules"],
];

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState("mlb-2024");
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [search, setSearch] = useState("");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [importedDataset, setImportedDataset] = useState<{ id: number; name: string; rowCount: number; validRowCount: number; invalidRowCount: number } | null>(null);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "system", content: "You are the Firmament Simulation Lab guide." },
    { role: "assistant", content: "Hi — I’m your Lab guide. Ask me what to click, what the two views mean, or how to read a result." },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simulateEvent = trpc.simulate.event.useMutation();
  const importCsv = trpc.datasets.importCsv.useMutation();
  const startRun = trpc.runs.start.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();
  const runStatus = trpc.runs.get.useQuery({ runId: activeRunId ?? 0 }, { enabled: Boolean(activeRunId), refetchInterval: activeRunId ? 1000 : false });

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const matchesSport = selectedSport === "All sports" || template.sport === selectedSport;
    const matchesSearch = `${template.label} ${template.sport}`.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  }), [search, selectedSport]);

  useEffect(() => {
    if (runStatus.data?.status === "complete" || runStatus.data?.status === "partial" || runStatus.data?.status === "failed") {
      setIsRunning(false);
      setRunProgress(runStatus.data.progressPercent);
      if (runStatus.data.status === "complete") toast.success("Batch replay complete", { description: `${runStatus.data.completedEvents.toLocaleString()} events persisted with per-event engine output.` });
      if (runStatus.data.status === "partial") toast.warning("Batch replay completed with rejected events", { description: `${runStatus.data.failedEvents} events failed during calculation.` });
    }
  }, [runStatus.data]);

  const importFile = async (file: File) => {
    try {
      setIsRunning(true);
      const response = await importCsv.mutateAsync({ name: file.name.replace(/\.csv$/i, "") || "Imported event set", sourceFileName: file.name, csv: await file.text() });
      setImportedDataset({ id: response.datasetId, name: file.name, rowCount: response.rowCount, validRowCount: response.validRowCount, invalidRowCount: response.invalidRowCount });
      setIsRunning(false);
      toast.success("Dataset validated and versioned", { description: `${response.validRowCount.toLocaleString()} valid rows${response.invalidRowCount ? ` · ${response.invalidRowCount} rejected` : ""}.` });
    } catch (error) {
      setIsRunning(false);
      toast.error("CSV import failed", { description: error instanceof Error ? error.message : "The dataset could not be validated." });
    }
  };

  const runSimulation = async (forceSample = false) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunProgress(14);
    if (importedDataset && !forceSample) {
      try {
        const response = await startRun.mutateAsync({ datasetId: importedDataset.id });
        setActiveRunId(response.runId);
        setRunProgress(1);
        toast.success("Batch replay started", { description: `${response.totalEvents.toLocaleString()} validated events are running through the engine.` });
      } catch (error) {
        setIsRunning(false);
        toast.error("Batch start failed", { description: error instanceof Error ? error.message : "The persisted run could not be started." });
      }
      return;
    }
    const increments = [34, 59, 78, 92, 100];
    increments.forEach((value, index) => setTimeout(() => {
      setRunProgress(value);
      if (value === 100) setIsRunning(false);
    }, (index + 1) * 420));
    try {
      const result = await simulateEvent.mutateAsync({
        id: "engine-smoke-test-mlb-002",
        teamA: "New York Yankees",
        teamB: "Houston Astros",
        sport: "MLB",
        location: "Houston, TX",
        latitude: 29.7604,
        longitude: -95.3698,
        startTime: "2024-04-01T19:10:00.000Z",
        actualWinner: "B",
      });
      setSimulationResult(result);
      toast.success("Firmament calculation complete", { description: "Chart placements, frame outputs, and layer verdicts are ready below." });
    } catch (error) {
      setIsRunning(false);
      toast.error("Calculation failed", { description: error instanceof Error ? error.message : "The engine adapter returned an error." });
    }
  };

  const comingSoon = (feature: string) => toast.info(`${feature} is staged for a later phase.`, { description: "The core import, calculation, and batch replay workflow is active." });

  const sendChatMessage = (content: string) => {
    const nextMessages: Message[] = [...chatMessages, { role: "user", content }];
    setChatMessages(nextMessages);
    chatMutation.mutate({ messages: nextMessages.filter((message) => message.role !== "system") }, {
      onSuccess: (response) => setChatMessages((current) => [...current, { role: "assistant", content: response }]),
      onError: (error) => toast.error("The Lab guide is unavailable", { description: error.message }),
    });
  };

  return (
    <div className="min-h-screen bg-[#07101d] text-slate-200">
      <div className="fixed inset-0 pointer-events-none overflow-hidden"><div className="ambient-orb ambient-orb-one" /><div className="ambient-orb ambient-orb-two" /><div className="grain" /></div>
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[238px] shrink-0 border-r border-white/[0.07] bg-[#08111f]/70 px-5 py-7 lg:block">
          <div className="flex items-center gap-3 px-2"><div className="brand-mark"><Orbit size={20} strokeWidth={1.4} /></div><div><p className="font-display text-[15px] tracking-[0.02em] text-white">Firmament</p><p className="text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">Simulation Lab</p></div></div>
          <div className="mt-12"><p className="px-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-600">Workspace</p><nav className="mt-3 space-y-1">
            {workspaceNav.map(([Icon, label, active]) => <button key={label} onClick={() => !active && comingSoon(label)} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}><Icon size={16} strokeWidth={1.7} /><span>{label}</span>{label === "AI Pattern Lab" && <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-500">Soon</span>}</button>)}
          </nav></div>
          <div className="mt-10"><p className="px-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-600">Data</p><nav className="mt-3 space-y-1">{dataNav.map(([Icon, label]) => <button key={label} onClick={() => comingSoon(label)} className="sidebar-link"><Icon size={16} strokeWidth={1.7} /><span>{label}</span></button>)}</nav></div>
          <div className="absolute bottom-7 left-5 right-5 rounded-2xl border border-amber-200/10 bg-amber-200/[0.035] p-4"><div className="flex items-center gap-2 text-amber-200"><CircleHelp size={15} /><span className="text-[10px] font-bold uppercase tracking-[0.16em]">Integration boundary</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">The adapter is pinned to the separate Firmament engine source; live formulas remain untouched.</p></div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex items-center gap-3 lg:hidden"><div className="brand-mark"><Orbit size={18} /></div></div><div><div className="flex items-center gap-2"><span className="status-dot" /><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300/80">Ready to run · historical games only</p></div><h1 className="mt-3 font-display text-3xl tracking-[-0.03em] text-white sm:text-4xl">Run a game prediction</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Start with the sample game or upload your own completed games. The engine calculates two views, then shows you exactly what agreed, disagreed, or could not be evaluated.</p></div></div><div className="flex items-center gap-2"><button onClick={() => jumpTo("how-it-works")} className="button-secondary"><CircleHelp size={15} /> How it works</button><button onClick={() => setShowConfig(!showConfig)} className={`button-secondary ${showConfig ? "button-secondary-active" : ""}`}><Settings2 size={15} /> Technical settings</button></div></header>

          <section id="start-here" className="mt-6 rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/[0.08] via-white/[0.025] to-violet-300/[0.06] p-5 shadow-[0_18px_60px_rgba(0,0,0,.18)]"><div><p className="eyebrow text-cyan-200/80">Start here</p><h2 className="mt-2 font-display text-xl text-white">What do you want to do?</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">There is no live sports schedule connected yet. You can try the included sample game now, or upload a CSV of games that already happened.</p></div><div className="mt-5 grid gap-3 md:grid-cols-2"><button onClick={() => { setImportedDataset(null); void runSimulation(true); }} disabled={isRunning} className="quick-action quick-action-primary"><span className="quick-action-icon"><Play size={18} fill="currentColor" /></span><span className="text-left"><strong>Try the sample game</strong><small>Yankees vs Astros · April 1, 2024 · takes a few seconds</small></span><ArrowUpRight size={16} /></button><button onClick={() => fileInputRef.current?.click()} disabled={isRunning} className="quick-action"><span className="quick-action-icon"><Upload size={18} /></span><span className="text-left"><strong>Upload my completed games</strong><small>CSV with teams, date, time, location, and final winner</small></span><ArrowUpRight size={16} /></button></div><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="guide-step"><span>1</span><div><strong>Choose games</strong><p>Use the sample or bring your own historical results.</p></div></div><div className="guide-step"><span>2</span><div><strong>Run calculation</strong><p>The engine builds the chart and compares both views.</p></div></div><div className="guide-step"><span>3</span><div><strong>Understand result</strong><p>Read the plain-language brief before technical details.</p></div></div></div></section>

          {showConfig && <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.045] p-4 shadow-[0_0_60px_rgba(65,215,255,.04)]"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200"><Settings2 size={16} /></div><div><p className="text-xs font-semibold text-white">Run configuration</p><p className="mt-0.5 text-[11px] text-slate-500">These controls are now wired to the authoritative engine adapter.</p></div></div><button onClick={() => setShowConfig(false)} className="text-slate-500 transition hover:text-white"><X size={16} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="config-cell"><span>Background</span><strong>Ancient / Hamal</strong></div><div className="config-cell"><span>Anchor</span><strong>13° Aries</strong></div><div className="config-cell"><span>Stars</span><strong>Fixed · no drift</strong></div><div className="config-cell"><span>Engine</span><strong className="text-emerald-200">Connected</strong></div></div></div>}

          {simulationResult && <GameBrief result={simulationResult} />}
          {simulationResult && <ForecastAnatomy result={simulationResult} />}

          {simulationResult && <section className="mt-6 panel"><div className="panel-header"><div><p className="eyebrow">Detailed evidence</p><h2 className="section-title">Chart and layer audit</h2></div><div className="flex items-center gap-2"><Pill tone="emerald">Technical view</Pill><button onClick={() => setSimulationResult(null)} className="icon-button"><X size={16} /></button></div></div><div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_1fr]"><div><p className="eyebrow">Calculation output · engine smoke test</p><h2 className="section-title">Chart and layer audit</h2></div><div className="flex items-center gap-2"><Pill tone="emerald">Verified fixture</Pill><button onClick={() => setSimulationResult(null)} className="icon-button"><X size={16} /></button></div></div><div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_1fr]"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="eyebrow">Baseline result</p><p className="mt-3 font-display text-3xl text-white">{simulationResult.baseline.role}</p><p className="mt-1 text-xs text-slate-500">{simulationResult.input.teamA} vs {simulationResult.input.teamB}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="mini-metric"><span>Territorial</span><strong>{simulationResult.baseline.territorial.winner}</strong></div><div className="mini-metric"><span>KP Stellar</span><strong>{simulationResult.baseline.kpStellar.winner}</strong></div><div className="mini-metric"><span>Actual</span><strong>{simulationResult.comparison.actualWinner}</strong></div><div className="mini-metric"><span>Baseline</span><strong className="text-emerald-200">{simulationResult.baseline.verdict}</strong></div></div></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="eyebrow">God View layer audit</p><Pill tone="cyan">{simulationResult.godView.summary.hits} hits</Pill></div><p className="mt-3 font-display text-2xl text-white">{simulationResult.godView.synthesis.role}</p><p className="mt-1 text-xs text-slate-500">Permanent fixed-background frame</p><div className="mt-4 space-y-2">{simulationResult.godView.allLayers.map((layer: any) => <div key={layer.name} className="layer-row"><span className={`verdict-dot verdict-${layer.verdict}`} /><span>{layer.name}</span><strong>{layer.verdict}</strong></div>)}</div></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="eyebrow">AgentView layer audit</p><Pill tone="purple">{simulationResult.agentView.summary.hits} hits</Pill></div><p className="mt-3 font-display text-2xl text-white">{simulationResult.agentView.synthesis.role}</p><p className="mt-1 text-xs text-slate-500">Local moving-Ascendant frame</p><div className="mt-4 space-y-2">{simulationResult.agentView.allLayers.map((layer: any) => <div key={layer.name} className="layer-row"><span className={`verdict-dot verdict-${layer.verdict}`} /><span>{layer.name}</span><strong>{layer.verdict}</strong></div>)}</div></div></div><PlacementTable planets={simulationResult.chart.godView.planets} /><div className="border-t border-white/[0.07] px-5 py-4"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500"><span className="flex items-center gap-2"><Orbit size={13} className="text-cyan-300" /> Ascendant {simulationResult.chart.godView.ascendantLongitude.toFixed(2)}°</span><span className="flex items-center gap-2"><Layers3 size={13} className="text-violet-300" /> {simulationResult.chart.godView.planets.length} planetary placements</span><span className="flex items-center gap-2"><Target size={13} className="text-emerald-300" /> Actual role: {simulationResult.comparison.actualRole ?? "PENDING"}</span><button onClick={() => comingSoon("Full chart inspector")} className="button-quiet sm:ml-auto">Open full placement inspector <ArrowUpRight size={13} /></button></div></div></section>}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Database} eyebrow="Historical events" value="3,932" detail="3 templates staged for replay" accent="bg-cyan-300/20" /><StatCard icon={Gauge} eyebrow="Last baseline accuracy" value="54.7%" detail="MLB 2024 · preview metric" accent="bg-emerald-300/20" /><StatCard icon={Layers3} eyebrow="Analysis frames" value="02" detail="God View + AgentView" accent="bg-violet-300/20" /><StatCard icon={Zap} eyebrow="Engine status" value="Staged" detail="Adapter boundary ready" accent="bg-amber-300/20" /></section>

          <section id="choose-data" className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,.9fr)]">
            <div className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Optional / Your data</p><h2 className="section-title">Upload a history file</h2><p className="mt-1 text-xs text-slate-500">The catalog below is reference-only. It does not fetch live games.</p></div><button onClick={() => fileInputRef.current?.click()} className="button-primary"><Upload size={15} /> Upload CSV</button></div><div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row"><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference sets" /></div><div className="relative"><select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)} className="select-field"><option>All sports</option><option>MLB</option><option>NFL</option><option>NBA</option><option>Custom</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-500" size={14} /></div></div><div className="divide-y divide-white/[0.055]">{filteredTemplates.map((template) => <button key={template.id} onClick={() => { setActiveTemplate(template.id); toast.info("Reference set selected", { description: "Use the sample game above or upload a CSV to run real events." }); }} className={`template-row ${activeTemplate === template.id ? "template-row-active" : ""}`}><div className={`sport-badge sport-${template.accent}`}>{template.code}</div><div className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-200">{template.label}</p>{template.status === "ready" ? <Pill tone="emerald">Reference</Pill> : <Pill>Upload needed</Pill>}</div><p className="mt-1 text-xs text-slate-500">{template.range} <span className="mx-1.5 text-slate-700">·</span> {template.events ? `${template.events.toLocaleString()} events listed` : "No events loaded"}</p></div><div className="text-right"><span className="text-xs font-semibold text-slate-400">{template.events ? "Reference" : "Upload data"}</span><ArrowUpRight size={15} className="ml-auto mt-2 text-slate-600" /></div></button>)}</div><div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4"><p className="text-[11px] text-slate-600">Need a template? The CSV format is explained when you upload.</p><><input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ""; }} /><button onClick={() => fileInputRef.current?.click()} className="button-quiet"><Upload size={14} /> Choose file</button></></div></div>

            <div className="panel"><div className="panel-header"><div><p className="eyebrow">02 / What the engine reads</p><h2 className="section-title">Two calculation frames</h2></div><button onClick={() => comingSoon("Frame inspector")} className="icon-button"><MoreHorizontal size={17} /></button></div><div className="space-y-3 px-5 pb-5"><FrameMap frame="God View" mode="god" /><FrameMap frame="AgentView" mode="agent" /><div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-amber-200"><Waves size={14} /><span className="text-[11px] font-semibold">Topography maps are reserved for engine output</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">These visual maps will show the engine evidence for each frame. The audit below is the source of truth for hits and misses.</p></div></div></div>
          </section>

          <section id="run-engine" className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,.9fr)]">
            <div className="panel"><div className="panel-header"><div><p className="eyebrow">2 / Run the calculation</p><h2 className="section-title">Press one button to analyze</h2><p className="mt-1 text-xs text-slate-500">Use the sample game, or upload a CSV first to enable a batch run.</p></div><Pill tone="emerald">Engine ready</Pill></div><div className="grid gap-4 px-5 pb-5 md:grid-cols-[1fr_1fr_auto]"><div className="runner-cell"><div className="runner-icon"><CalendarDays size={16} /></div><div><p className="runner-label">What will run</p><p className="runner-value">{importedDataset?.name ?? "Sample Yankees vs Astros"}</p><p className="runner-meta">{importedDataset ? `${importedDataset.validRowCount.toLocaleString()} valid / ${importedDataset.rowCount.toLocaleString()} rows` : "One completed MLB game with a known winner"}</p></div></div><div className="runner-cell"><div className="runner-icon"><Layers3 size={16} /></div><div><p className="runner-label">What you get</p><p className="runner-value">Plain-language result + audit</p><p className="runner-meta">Two engine views, chart placements, hits, misses, and not evaluable layers</p></div></div><div className="flex items-center"><button onClick={() => void runSimulation()} disabled={isRunning || !importedDataset && simulateEvent.isPending} className="button-run"><Play size={15} fill="currentColor" />{isRunning ? `${activeRunId ? `Running ${runProgress}%` : `Preparing ${runProgress}%`}` : importedDataset ? "Run uploaded games" : "Run sample game"}</button></div></div>{isRunning && <div className="mx-5 mb-3 h-1 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 transition-all duration-300" style={{ width: `${runProgress}%` }} /></div>}{activeRunId && <div className="mx-5 mb-5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-slate-600"><span>Batch {activeRunId} · {runStatus.data?.status ?? "starting"}</span><span>{runStatus.data ? `${runStatus.data.completedEvents + runStatus.data.failedEvents}/${runStatus.data.totalEvents} processed` : "Initializing"}</span></div>}<div className="mx-5 mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-4 text-[11px] text-slate-500"><span className="flex items-center gap-2"><Clock3 size={13} /> Historical games only</span><span className="flex items-center gap-2"><Radio size={13} /> No live schedule lookup yet</span><span className="flex items-center gap-2"><Target size={13} /> Results compare to final winners</span></div></div>

            <div id="how-it-works" className="panel"><div className="panel-header"><div><p className="eyebrow">3 / What happens next</p><h2 className="section-title">Simple output, technical engine</h2></div><GitBranch size={18} className="text-cyan-300" /></div><div className="space-y-2 px-5 pb-5">{[["Input", "A completed game or CSV row"], ["Calculate", "Chart + two independent views"], ["Explain", "Plain-language call and evidence"], ["Score", "Hit, miss, or not evaluable"]].map(([label, value], index) => <div key={label} className="contract-row"><span className="contract-index">0{index + 1}</span><div><p className="text-[11px] font-semibold text-slate-300">{label}</p><p className="mt-0.5 text-[11px] leading-5 text-slate-500">{value}</p></div><span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300/70" /></div>)}</div></div>
          </section>

          <section className="mt-6 panel"><div className="panel-header"><div><p className="eyebrow">Run ledger</p><h2 className="section-title">Recent simulation activity</h2></div><button onClick={() => comingSoon("Full run ledger")} className="button-quiet">View all <ArrowUpRight size={13} /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.17em] text-slate-600"><th className="px-5 pb-3 font-semibold">Run</th><th className="pb-3 font-semibold">State</th><th className="pb-3 font-semibold">Preview accuracy</th><th className="pb-3 font-semibold">Last activity</th><th className="pr-5 pb-3" /></tr></thead><tbody>{recentRuns.map((run) => <tr key={run.name} className="border-b border-white/[0.045] last:border-0"><td className="px-5 py-4"><p className="text-xs font-semibold text-slate-300">{run.name}</p><p className="mt-1 text-[11px] text-slate-600">{run.meta}</p></td><td className="py-4"><Pill tone={run.color === "emerald" ? "emerald" : run.color === "cyan" ? "cyan" : "gold"}>{run.status}</Pill></td><td className="py-4 font-display text-sm text-slate-300">{run.score}</td><td className="py-4 text-xs text-slate-500">{run.time}</td><td className="pr-5 py-4 text-right"><button onClick={() => comingSoon("Run details")} className="icon-button-small"><ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div></section>

          <footer className="flex flex-col gap-3 py-8 text-[10px] uppercase tracking-[0.16em] text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>Firmament Simulation Lab · Separate research environment</span><span>Ancient fixed-background baseline · 13° Aries / Hamal</span></footer>
          <button onClick={() => setChatOpen((open) => !open)} className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-cyan-200/25 bg-[#12243a]/95 px-4 py-3 text-xs font-bold text-cyan-100 shadow-[0_14px_45px_rgba(0,0,0,.35)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-[#19304a]" aria-label="Open Ask the Lab assistant"><Sparkles size={16} /> Ask the Lab</button>
          {chatOpen && <div className="fixed bottom-20 right-6 z-30 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#0d1829]/98 shadow-[0_24px_90px_rgba(0,0,0,.48)] backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><div><p className="text-xs font-bold text-white">Ask the Lab</p><p className="mt-0.5 text-[10px] text-slate-500">Your in-app guide to the simulation workflow</p></div><button onClick={() => setChatOpen(false)} className="icon-button-small" aria-label="Close chat"><X size={14} /></button></div><AIChatBox messages={chatMessages} onSendMessage={sendChatMessage} isLoading={chatMutation.isPending} height={430} placeholder="Ask what to do next…" emptyStateMessage="Ask me how to use the Lab" suggestedPrompts={["What should I click first?", "What is God View vs AgentView?", "How do I upload my games?"]} className="rounded-none border-0 bg-transparent shadow-none" /></div>}
        </main>
      </div>
    </div>
  );
}
