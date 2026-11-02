import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  Info,
  Layers,
  MessageSquare,
  Orbit,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { TransitLocationBar } from "@/components/TransitLocationBar";
import { TransitWeatherTimeline } from "@/components/TransitWeatherTimeline";
import { InterpretationPanel } from "@/components/InterpretationPanel";
import type { ChartResult, TransitContact } from "../../../server/astronomy";

const MAX_ORB = 5;
const aspectFlow: Record<TransitContact["aspect"], number> = {
  trine: 1,
  sextile: 1,
  square: -1,
  opposition: -1,
  conjunction: 0,
};

const ASPECT_SYMBOLS: Record<TransitContact["aspect"], string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};

const percentWeight = (orb: number) =>
  orb > MAX_ORB ? 0 : orb <= 1.25 ? 100 : orb <= 2.5 ? 80 : orb <= 3.75 ? 60 : 40;

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  "North Node": "☊", "South Node": "☋", Ascendant: "AC",
};

const ASPECT_INTERPRETATIONS: Record<string, { theme: string; advice: string }> = {
  "Sun-trine": { theme: "Vital alignment and effortless creative expression", advice: "Step into visibility; your natural gifts are received warmly." },
  "Sun-sextile": { theme: "Productive opportunities to lead or innovate", advice: "Engage collaborative projects and reach out to mentors." },
  "Sun-square": { theme: "Ego friction and constructive friction with authority", advice: "Channel restless tension into disciplined craftsmanship." },
  "Sun-opposition": { theme: "Relational mirror; awareness of external counter-forces", advice: "Seek balance between personal desire and partnership obligations." },
  "Sun-conjunction": { theme: "Major annual cosmic reset; illuminated vitality", advice: "Plant seeds of long-term intent; your core identity is highlighted." },
  "Moon-trine": { theme: "Emotional resonance, intuitive clarity, and peaceful rhythm", advice: "Trust your gut feelings; intimate conversations flourish." },
  "Moon-sextile": { theme: "Harmonious domestic or social exchanges", advice: "Connect with loved ones and create nourishing surroundings." },
  "Moon-square": { theme: "Emotional turbulence or reactive sensitivities", advice: "Pause before reacting; give yourself space to digest feelings." },
  "Moon-opposition": { theme: "Tug between emotional comfort and external demands", advice: "Acknowledge conflicting needs without self-judgment." },
  "Moon-conjunction": { theme: "Intense emotional magnification and psychic impressionability", advice: "Protect your energetic boundaries; practice grounding meditation." },
  "Jupiter-trine": { theme: "Auspicious growth, optimism, and serendipitous openings", advice: "Say yes to opportunities for education, travel, or expansion." },
  "Jupiter-conjunction": { theme: "Bountiful revitalization and expansive luck", advice: "Take bold, honorable leaps into larger spheres of influence." },
  "Saturn-trine": { theme: "Solid foundational endurance and sustained progress", advice: "Build systems that outlast the moment; patience pays off." },
  "Saturn-square": { theme: "Structural tests, boundary setting, and reality checks", advice: "Embrace discipline; cut excess commitments and simplify." },
  "Mars-conjunction": { theme: "Surge of physical drive, initiative, and courage", advice: "Direct this sharp fire into focused workouts or decisive tasks." },
  "Venus-trine": { theme: "Magnetic allure, financial harmony, and artistic grace", advice: "Ideal for romance, creative projects, and renegotiating agreements." },
};

export default function EnergyPage() {
  const { chart, profile } = useProfileSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPlanetFilter, setSelectedPlanetFilter] = useState<string | null>(null);
  const [aspectCategory, setAspectCategory] = useState<"all" | "harmonious" | "challenging" | "dynamic">("all");
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [activeInterpreterQuestion, setActiveInterpreterQuestion] = useState<string | null>(null);

  const handleRefreshTransits = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event("fg:transit-location-updated"));
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const energyData = useMemo(() => {
    if (!chart || chart.readingScope === "natal") return null;
    const contacts = (chart.transits || []).flatMap((body) =>
      (body?.natalContacts || [])
        .filter((contact) => Number.isFinite(contact.orb) && contact.orb <= MAX_ORB)
        .map((contact) => ({
          ...contact,
          transit: body.name,
          natal: contact.natalName,
          strength: percentWeight(contact.orb),
          id: `${body.name}-${contact.aspect}-${contact.natalName}`,
        }))
    );

    const harmonious = contacts.filter((c) => aspectFlow[c.aspect] === 1);
    const challenging = contacts.filter((c) => aspectFlow[c.aspect] === -1);
    const dynamic = contacts.filter((c) => aspectFlow[c.aspect] === 0);

    const flowWeight = harmonious.reduce((sum, c) => sum + c.strength, 0);
    const frictionWeight = challenging.reduce((sum, c) => sum + c.strength, 0);
    const totalWeight = flowWeight + frictionWeight || 1;
    const flowPct = Math.round((flowWeight / totalWeight) * 100);
    const frictionPct = 100 - flowPct;

    const signal: "Effortless Flow" | "Dynamic Synthesis" | "Growth Crucible" =
      flowWeight > frictionWeight * 1.3
        ? "Effortless Flow"
        : frictionWeight > flowWeight * 1.3
        ? "Growth Crucible"
        : "Dynamic Synthesis";

    return {
      contacts,
      harmonious,
      challenging,
      dynamic,
      flowWeight,
      frictionWeight,
      flowPct,
      frictionPct,
      signal,
    };
  }, [chart]);

  const filteredContacts = useMemo(() => {
    if (!energyData) return [];
    let list = energyData.contacts;
    if (selectedPlanetFilter) {
      list = list.filter((c) => c.transit === selectedPlanetFilter || c.natal === selectedPlanetFilter);
    }
    if (aspectCategory === "harmonious") {
      list = list.filter((c) => aspectFlow[c.aspect] === 1);
    } else if (aspectCategory === "challenging") {
      list = list.filter((c) => aspectFlow[c.aspect] === -1);
    } else if (aspectCategory === "dynamic") {
      list = list.filter((c) => aspectFlow[c.aspect] === 0);
    }
    return list.sort((a, b) => a.orb - b.orb);
  }, [energyData, selectedPlanetFilter, aspectCategory]);

  const handleAskQuestion = (q?: string) => {
    const questionToAsk = q || customQuestion;
    if (!questionToAsk.trim()) return;
    setActiveInterpreterQuestion(questionToAsk);
    document.getElementById("energy-master-interpreter")?.scrollIntoView({ behavior: "smooth" });
  };

  const currentTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-24 pt-2 text-[#E8EDF7]">
      {/* SECTION 1: TOP TELEMETRY RIBBON & LOCATION DUALITY */}
      <section
        aria-label="Transit Location & Horizon Status"
        className="rounded-3xl border border-white/10 bg-[#080B14]/90 p-5 shadow-[0_15px_45px_rgba(0,0,0,0.5)] sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22D3EE]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                Live Planetary Telemetry
              </span>
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Signature Cosmic Energy Read
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Separating natal birth coordinates from real-time GPS transit horizons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefreshTransits}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D9B66F]/40 bg-[#D9B66F]/10 px-4 text-xs font-semibold text-[#D9B66F] transition-all hover:bg-[#D9B66F]/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Recalculating..." : "Refresh Sky"}</span>
            </button>
          </div>
        </div>

        {/* Dual Location Status */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9B66F]">
              Natal Birth Anchor (Fixed)
            </span>
            <p className="mt-1 font-semibold text-white">
              {profile?.location || "Birth Location"} · {profile?.date} {profile?.time}
            </p>
            <p className="text-[11px] text-slate-400">Zero axial tilt · Aldebaran Framework</p>
          </div>

          <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/20 p-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              Active Transit Horizon (GPS / Local)
            </span>
            <div className="mt-1">
              <TransitLocationBar variant="pill" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Governs local Ascendant, House cusps, and live transit angles.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: MAIN ENERGY GAUGE — RESPONSIVE SEMICIRCULAR GAUGE */}
      {energyData && (
        <section
          aria-label="Main Cosmic Energy Gauge"
          className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-[linear-gradient(135deg,#080B14_0%,#101628_60%,#092138_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] sm:p-8"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Semicircular SVG Gauge */}
            <div className="relative flex flex-col items-center justify-center">
              <svg viewBox="0 0 240 140" className="w-64 sm:w-80 h-auto overflow-visible">
                <defs>
                  <linearGradient id="gaugeFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14B8A6" />
                    <stop offset="100%" stopColor="#2DD4BF" />
                  </linearGradient>
                  <linearGradient id="gaugeFrictionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#FB7185" />
                  </linearGradient>
                </defs>

                {/* Background Track Arc (180 degrees) */}
                <path
                  d="M 20 125 A 100 100 0 0 1 220 125"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Harmony Arc */}
                <path
                  d="M 20 125 A 100 100 0 0 1 220 125"
                  fill="none"
                  stroke="url(#gaugeFlowGrad)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 100}`}
                  strokeDashoffset={`${Math.PI * 100 * (1 - energyData.flowPct / 100)}`}
                  className="transition-all duration-1000 filter drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                />

                {/* Central Readout */}
                <text x="120" y="95" textAnchor="middle" className="font-serif text-3xl font-bold fill-white">
                  {energyData.flowPct}%
                </text>
                <text x="120" y="115" textAnchor="middle" className="font-mono text-[9px] uppercase tracking-wider fill-cyan-300">
                  HARMONY INDEX
                </text>
              </svg>

              <div className="mt-2 text-center">
                <span
                  className={`rounded-full px-4 py-1 text-xs font-bold ${
                    energyData.signal === "Effortless Flow"
                      ? "bg-teal-950/70 text-[#2DD4BF] border border-teal-400/40 shadow-[0_0_12px_rgba(45,212,191,0.3)]"
                      : energyData.signal === "Growth Crucible"
                      ? "bg-rose-950/70 text-[#FB7185] border border-rose-400/40 shadow-[0_0_12px_rgba(251,113,133,0.3)]"
                      : "bg-cyan-950/70 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                  }`}
                >
                  {energyData.signal}
                </span>
                <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                  Current Telemetry Time: {currentTimeStr}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="w-full lg:max-w-md space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-teal-400/30 bg-teal-950/20 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF]">
                    Harmonious Flow
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-white tabular-nums">
                      {energyData.flowPct}%
                    </span>
                    <span className="text-xs text-teal-300 font-mono">
                      {energyData.harmonious.length} aspects
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Trines & sextiles lubricating creative execution and smooth diplomacy.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FB7185]">
                    Growth Friction
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-white tabular-nums">
                      {energyData.frictionPct}%
                    </span>
                    <span className="text-xs text-rose-300 font-mono">
                      {energyData.challenging.length} aspects
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Squares & oppositions building structural discipline and grit.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9B66F]">
                  Transit Climate Assessment
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {energyData.signal === "Effortless Flow"
                    ? "Cosmic weather is highly supportive. Favorable alignments invite confident outreach, relationship cultivation, and strategic launches."
                    : energyData.signal === "Growth Crucible"
                    ? "Dynamic tension dominates the skies. Conserve your energy, resist hasty confrontation, and redirect internal pressure into meticulous craftsmanship."
                    : "The heavens strike an exact equilibrium between creative flow and evolutionary tension. Balance bold initiative with calculated patience."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: PLANETARY ASPECT LEDGER */}
      <section aria-label="Active Planetary Aspects Ledger" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9B66F]">
              Precise Celestial Geometry
            </span>
            <h2 className="font-serif text-2xl font-bold text-white">
              Planetary Contact Ledger ({filteredContacts.length})
            </h2>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            {(["all", "harmonious", "challenging", "dynamic"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAspectCategory(cat)}
                className={`rounded-lg px-3 py-1.5 font-semibold capitalize transition-all ${
                  aspectCategory === cat
                    ? "bg-[#D9B66F] text-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Aspects Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredContacts.map((c) => {
            const isFlow = aspectFlow[c.aspect] === 1;
            const isFriction = aspectFlow[c.aspect] === -1;
            const symbol = ASPECT_SYMBOLS[c.aspect] || c.aspect;
            const interpKey = `${c.transit}-${c.aspect}`;
            const interpretation = ASPECT_INTERPRETATIONS[interpKey] || {
              theme: `${c.transit} ${c.aspect} natal ${c.natal}`,
              advice: "Reflect on how this planetary resonance activates your evolutionary path.",
            };
            const isExpanded = expandedContactId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setExpandedContactId(isExpanded ? null : c.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  isExpanded
                    ? "border-[#D9B66F] bg-[#101628] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                    : "border-white/10 bg-[#080B14]/80 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base text-cyan-300">
                      {PLANET_GLYPHS[c.transit] || c.transit.slice(0, 2)}
                    </span>
                    <span className="text-xs font-bold text-white">{c.transit}</span>
                    <span className="font-mono text-sm text-[#D9B66F]">{symbol}</span>
                    <span className="font-mono text-base text-[#D9B66F]">
                      {PLANET_GLYPHS[c.natal] || c.natal.slice(0, 2)}
                    </span>
                    <span className="text-xs font-bold text-white">{c.natal}</span>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isFlow
                        ? "bg-teal-950/70 text-[#2DD4BF] border border-teal-400/40"
                        : isFriction
                        ? "bg-rose-950/70 text-[#FB7185] border border-rose-400/40"
                        : "bg-cyan-950/70 text-cyan-300 border border-cyan-400/40"
                    }`}
                  >
                    {isFlow ? "Harmony" : isFriction ? "Friction" : "Dynamic"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Exact Orb: {c.orb.toFixed(2)}°</span>
                  <span>Strength: {c.strength}%</span>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-white/10 pt-3 space-y-2 animate-in fade-in duration-200">
                    <p className="text-xs font-semibold text-[#D9B66F]">{interpretation.theme}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{interpretation.advice}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskQuestion(`Tell me more about how transit ${c.transit} ${c.aspect} my natal ${c.natal} manifests today.`);
                        }}
                        className="text-[11px] font-semibold text-cyan-300 hover:underline"
                      >
                        Ask Master Interpreter about this aspect →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: FORECAST TIMELINE */}
      <section aria-label="Transit Weather Timeline" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
              Future Astronomical Projections
            </span>
            <h2 className="font-serif text-2xl font-bold text-white">
              30-Day & 90-Day Planetary Cycle Timeline
            </h2>
          </div>
        </div>

        {chart && <TransitWeatherTimeline chart={chart} />}
      </section>

      {/* SECTION 5: MASTER INTERPRETER DEEP QUERY */}
      <section
        id="energy-master-interpreter"
        aria-label="Master Astrologer Consultation"
        className="scroll-mt-24 space-y-4 rounded-3xl border border-[#D9B66F]/30 bg-[#080B14]/90 p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <MessageSquare className="h-5 w-5 text-[#D9B66F]" />
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">
              Consult the Master Interpreter on Current Transits
            </h2>
            <p className="text-xs text-slate-400">
              Direct synthesis of your natal blueprint against today's live cosmic climate.
            </p>
          </div>
        </div>

        {chart && (
          <InterpretationPanel
            key={`energy-panel-${chart.input.location || "god"}`}
            chart={chart}
            initialMode="transit"
            initialQuestion={
              activeInterpreterQuestion ||
              "What is the single most important planetary transit active for me right now, and how should I align my actions today?"
            }
          />
        )}
      </section>
    </div>
  );
}
