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

// Contact interpretation must be derived from chart evidence, not canned planet advice.
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
const ELEMENT_DECANS: Record<string, string[]> = {
  Aries: ["Aries", "Leo", "Sagittarius"], Leo: ["Leo", "Sagittarius", "Aries"], Sagittarius: ["Sagittarius", "Aries", "Leo"],
  Taurus: ["Taurus", "Virgo", "Capricorn"], Virgo: ["Virgo", "Capricorn", "Taurus"], Capricorn: ["Capricorn", "Taurus", "Virgo"],
  Gemini: ["Gemini", "Libra", "Aquarius"], Libra: ["Libra", "Aquarius", "Gemini"], Aquarius: ["Aquarius", "Gemini", "Libra"],
  Cancer: ["Cancer", "Scorpio", "Pisces"], Scorpio: ["Scorpio", "Pisces", "Cancer"], Pisces: ["Pisces", "Cancer", "Scorpio"],
};

type EvidenceRow = ChartResult["movingBodies"][number];
function describePlacement(row: EvidenceRow | undefined, label: string): string {
  if (!row || !Number.isFinite(row.longitude)) return `${label}: placement evidence unavailable`;
  const longitude = ((row.longitude % 360) + 360) % 360;
  const sign = SIGNS[Math.floor(longitude / 30)];
  const degree = longitude % 30;
  const decanIndex = Math.min(2, Math.floor(degree / 10));
  const decan = ELEMENT_DECANS[sign][decanIndex];
  const house = row.agentHouse ?? row.house;
  const starEvidence = row.royalStarContacts?.length
    ? `; ${row.royalStarContacts.length} recorded royal-star contact(s)` : "";
  return `${label}: ${degree.toFixed(2)}° ${sign}, ${decan} elemental-family decan${Number.isFinite(house) && house > 0 ? `, house ${house}` : ", house unavailable"}${starEvidence}`;
}

function interpretContact(contact: { transit: string; natal: string; aspect: string; orb: number }, chart: ChartResult | null | undefined) {
  const moving = chart?.transits?.find(row => row.name === contact.transit);
  const rooted = chart?.movingBodies?.find(row => row.name === contact.natal);
  const movingEvidence = describePlacement(moving, `Transit ${contact.transit}`);
  const natalEvidence = describePlacement(rooted, `Natal ${contact.natal}`);
  const frame = chart?.worldview === "god" ? "God View" : "Agent View";
  const relation = contact.aspect === "trine" || contact.aspect === "conjunction" || contact.aspect === "sextile"
    ? "harmonious" : "frictional";
  return {
    theme: `${contact.transit} ${contact.aspect} natal ${contact.natal} · ${contact.orb.toFixed(2)}° orb`,
    advice: `WHAT — A ${relation} ${contact.aspect} links two specifically located planetary expressions. WHY — ${movingEvidence}. ${natalEvidence}. HOW — Compare their decan families and house topics in the ${frame}, rather than interpreting the planet names alone. CONSEQUENCE — The ${contact.orb.toFixed(2)}° orb measures geometric closeness, not a guaranteed outcome. MEANING — Lunar mansion, Arabic manzil, Chinese mansion, and dignity interpretations require verified catalog mappings; they are not yet supplied by this contact evidence and must not be invented.`,
  };
}

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
                  {energyData.signal === "Harmonious Flow"
                    ? "Cosmic weather is highly supportive. Favorable alignments invite confident outreach, relationship cultivation, and strategic launches."
                    : energyData.signal === "Dynamic Friction"
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
            const isFlow = ENERGY_ASPECT_FLOW[c.aspect] === 1;
            const isFriction = ENERGY_ASPECT_FLOW[c.aspect] === -1;
            const symbol = ASPECT_SYMBOLS[c.aspect] || c.aspect;
            const interpretation = interpretContact(c, chart);
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
      <div className="flex justify-end"><Link href="/transit-sky" className="rounded-xl border border-cyan-300/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-200">Open Independent Transit Chart →</Link></div>
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
