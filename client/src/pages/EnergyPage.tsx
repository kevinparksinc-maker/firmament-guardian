import { FocusedPlacementReading } from "@/components/FocusedPlacementReading";
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
import { EnergyScoringKey } from "@/components/EnergyScoringKey";
import { TransitLocationBar } from "@/components/TransitLocationBar";
import { HarmonicFlowTimeline } from "@/components/HarmonicFlowTimeline";
import { TransitWeatherTimeline } from "@/components/TransitWeatherTimeline";
import { InterpretationPanel } from "@/components/InterpretationPanel";
import type { ChartResult, TransitContact, MinorTransitContact } from "../../../server/astronomy";
import { calculateEnergyRead, ENERGY_ASPECT_FLOW } from "@/lib/energyScoring";

const ASPECT_SYMBOLS: Record<TransitContact["aspect"] | MinorTransitContact["aspect"], string> = {
  conjunction: "☌",
  semisextile: "⚺",
  semisquare: "∠",
  quincunx: "⚻",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  "North Node": "☊", "South Node": "☋", Ascendant: "AC",
};

export default function EnergyPage({ onRefresh, calculating = false, error = "" }: { onRefresh?: () => void; calculating?: boolean; error?: string }) {
  const [path, navigate] = useLocation();
  const page = path === "/forecast" ? "forecast" : path.endsWith("/contacts") ? "contacts" : path.endsWith("/consultation") ? "consultation" : "summary";
  const { energyChart: chart, profile } = useProfileSession();
  const [selectedPlanetFilter, setSelectedPlanetFilter] = useState<string | null>(null);
  const [aspectCategory, setAspectCategory] = useState<"all" | "harmonious" | "challenging" | "dynamic">("all");
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [activeInterpreterQuestion, setActiveInterpreterQuestion] = useState<string | null>(null);

  const handleRefreshTransits = () => {
    onRefresh?.();
  };

  const energyData = useMemo(() => calculateEnergyRead(chart), [chart]);

  const filteredContacts = useMemo(() => {
    if (!energyData) return [];
    let list = energyData.contacts;
    if (selectedPlanetFilter) {
      list = list.filter((c) => c.transit === selectedPlanetFilter || c.natal === selectedPlanetFilter);
    }
    if (aspectCategory === "harmonious") {
      list = list.filter((c) => ENERGY_ASPECT_FLOW[c.aspect] === 1);
    } else if (aspectCategory === "challenging") {
      list = list.filter((c) => ENERGY_ASPECT_FLOW[c.aspect] === -1);
    } else if (aspectCategory === "dynamic") {
      list = list.filter((c) => ENERGY_ASPECT_FLOW[c.aspect] === 0);
    }
    return list.sort((a, b) => a.orb - b.orb);
  }, [energyData, selectedPlanetFilter, aspectCategory]);

  const handleAskQuestion = (q?: string) => {
    const questionToAsk = q || customQuestion;
    if (!questionToAsk.trim()) return;
    setActiveInterpreterQuestion(questionToAsk);
    if (page !== "consultation") { navigate(`/energy/consultation?question=${encodeURIComponent(questionToAsk)}`); return; }
    document.getElementById("energy-master-interpreter")?.scrollIntoView({ behavior: "smooth" });
  };

  const currentTimeStr = chart ? new Date(chart.transitDate).toLocaleString([], { timeZone: chart.input.transitTimezone || chart.input.timezone, hour: "2-digit", minute: "2-digit", month: "short", day: "numeric", timeZoneName: "short" }) : "Awaiting calculation";

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
              {page === "summary" ? "Your Current Energy" : page === "contacts" ? "Energy Contact Ledger" : page === "forecast" ? "Personal Harmonic Flow Clock" : "Transit Interpretation"}
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Read the current sky in relation to your birth chart.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={calculating || !onRefresh}
              onClick={handleRefreshTransits}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D9B66F]/40 bg-[#D9B66F]/10 px-4 text-xs font-semibold text-[#D9B66F] transition-all hover:bg-[#D9B66F]/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={calculating ? "animate-spin" : ""} />
              <span>{calculating ? "Recalculating..." : "Refresh Sky"}</span>
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
            <p className="text-[11px] text-slate-400">{profile?.timezone}</p>
            <Link href="/profile" className="mt-2 inline-block text-cyan-200 underline">Verify or edit birth date, time and place →</Link>
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

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {!chart && <p role="status">{calculating ? "Calculating current transit contacts…" : "Refresh Sky to calculate your current energy."}</p>}
      <nav aria-label="Energy pages" className="flex flex-wrap gap-3 text-sm text-cyan-200">{[{href:"/energy",label:"Overview"},{href:"/energy/contacts",label:"Contact ledger"},{href:"/forecast",label:"30-minute forecast"},{href:"/energy/consultation",label:"Interpretation"}].map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?"page":undefined} className={`rounded-xl border px-4 py-3 ${path===item.href?"border-amber-200/50 bg-amber-200/10 text-amber-100":"border-white/15"}`}>{item.label}</Link>)}</nav>
      <p className="text-sm leading-6 text-slate-400">Personal contacts compare current transit bodies with your natal placements and angles. Independent Sky counts pairs within one event sky. The totals can differ even at the same place and time.</p>
      <EnergyScoringKey />
      {/* SECTION 2: MAIN ENERGY GAUGE — RESPONSIVE SEMICIRCULAR GAUGE */}
      {energyData && page === "summary" && (
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
                    energyData.signal === "Harmonious Flow"
                      ? "bg-teal-950/70 text-[#2DD4BF] border border-teal-400/40 shadow-[0_0_12px_rgba(45,212,191,0.3)]"
                      : energyData.signal === "Dynamic Friction"
                      ? "bg-rose-950/70 text-[#FB7185] border border-rose-400/40 shadow-[0_0_12px_rgba(251,113,133,0.3)]"
                      : "bg-cyan-950/70 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                  }`}
                >
                  {energyData.signal}
                </span>
                <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                  Calculated sky: {currentTimeStr}
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
                    Conjunctions, trines, sextiles and harmonious minor contacts.
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
                  {energyData.signal === "Harmonious Flow"
                    ? "Cosmic weather is highly supportive. Favorable alignments invite confident outreach, relationship cultivation, and strategic launches."
                    : energyData.signal === "Dynamic Friction"
                    ? "Dynamic tension dominates the skies. Conserve your energy, resist hasty confrontation, and redirect internal pressure into meticulous craftsmanship."
                    : energyData.contactsCount === 0 ? "No personal contacts fall within the 5° orb at this moment. Select another time or refresh the sky." : "Both harmony and friction are present. Compare their weighted totals and the individual contact evidence before choosing your focus."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "contacts" && <>
      {/* SECTION 3: PLANETARY ASPECT LEDGER */}
      <section aria-label="Active Planetary Aspects Ledger" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9B66F]">
              Precise Celestial Geometry
            </span>
            <h2 className="font-serif text-2xl font-bold text-white">
              Personal Transit-to-Natal Contacts {calculating ? "· Updating…" : energyData ? `(${filteredContacts.length} of ${energyData.contactsCount})` : "· Awaiting calculation"}
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

        {calculating && <p role="status" className="text-sm text-cyan-200">Calculating contacts for the selected transit time and location…</p>}
        {!calculating && energyData && filteredContacts.length === 0 && <p role="status" className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">{energyData.contactsCount ? "No contacts match this filter. Select All to see the complete ledger." : "No personal transit-to-natal contacts fall within the 5° orb at this calculated moment."}</p>}
        {/* Aspects Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredContacts.map((c) => {
            const isFlow = ENERGY_ASPECT_FLOW[c.aspect] === 1;
            const isFriction = ENERGY_ASPECT_FLOW[c.aspect] === -1;
            const symbol = ASPECT_SYMBOLS[c.aspect] || c.aspect;

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
                  <span>Intensity: {c.intensity}/5 · Weight: {c.strength}</span>
                </div>

                {isExpanded && (
                  <div onClick={event => event.stopPropagation()} className="mt-3 border-t border-white/10 pt-3 space-y-2 animate-in fade-in duration-200">
                    <p className="text-xs font-semibold text-[#D9B66F]">{`${c.transit} ${c.aspect} natal ${c.natal} · ${c.orb.toFixed(2)}° orb`}</p>
                    <p className="text-xs text-cyan-200">{c.intensity} intensity × {c.stars} transit stars × {c.natalStars} natal stars × {c.majorFactor} aspect weight = {c.strength} points</p>
                    {chart && <FocusedPlacementReading chart={chart} name={c.transit} otherName={c.natal} kind="contact" layer="transit"/>}
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

      </>}
      {page === "forecast" && chart && <HarmonicFlowTimeline chart={chart} />}

      {/* SECTION 4: FORECAST TIMELINE */}
      <div className="flex justify-end"><Link href="/transit-sky" className="rounded-xl border border-cyan-300/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-200">Open Independent Transit Chart →</Link></div>
      {page === "forecast" && <section aria-label="Transit Weather Timeline" className="space-y-4">
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

      }
      {page === "consultation" && <>
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
              new URLSearchParams(window.location.search).get("question") || activeInterpreterQuestion ||
              "What is the single most important planetary transit active for me right now, and how should I align my actions today?"
            }
          />
        )}
      </section>
      </>}
    </div>
  );
}
