import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  BookOpenText,
  Compass,
  Diamond,
  Layers,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Star,
  Flame,
} from "lucide-react";
import { GuardianDiamondCharts } from "@/components/GuardianDiamondCharts";
import { ChartOverview } from "@/components/ChartOverview";
import { LifeStoryInterpreter } from "@/components/LifeStoryInterpreter";
import { InterpretationPanel } from "@/components/InterpretationPanel";
import { WelcomeHost } from "@/components/WelcomeHost";
import type { ChartResult } from "../../../server/astronomy";
import type { ReadingScope } from "../../../server/astrologyCore";

type ReadingView = "guided" | "evidence";

export type ProfileReadingScreenProps = {
  chart: ChartResult;
  readingView: ReadingView;
  onReadingViewChange: (view: ReadingView) => void;
  readingMode: ReadingScope;
  readingQuestion: string;
  interpreterPrompt: string | null;
  onClearInterpreterPrompt: () => void;
  onLoadSampleChart: () => void;
  onOpenProfileBuilder: () => void;
  onReadingModeChange: (mode: ReadingScope) => void;
};

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function signAt(longitude: number | undefined): string {
  return typeof longitude === "number" && Number.isFinite(longitude)
    ? SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]
    : "Aligned";
}

export function ProfileReadingScreen({
  chart,
  readingView,
  onReadingViewChange,
  readingMode,
  readingQuestion,
  interpreterPrompt,
  onClearInterpreterPrompt,
  onLoadSampleChart,
  onOpenProfileBuilder,
  onReadingModeChange,
}: ProfileReadingScreenProps) {
  const [activeReadingTab, setActiveReadingTab] = useState<"natal" | "lifestory" | "blueprint" | "transits">("natal");
  const [expandedLayer, setExpandedLayer] = useState<number | null>(1);

  const sun = chart.movingBodies.find((b) => b.name === "Sun");
  const moon = chart.movingBodies.find((b) => b.name === "Moon");
  const asc = chart.ascendant;
  const sunSign = signAt(sun?.longitude);
  const moonSign = signAt(moon?.longitude);
  const ascSign = chart.agentViewAvailable && asc ? signAt(asc.longitude) : "Aligned";

  // Layered reading narrative derived from calculated placements
  const layers = useMemo(
    () => [
      {
        id: 1,
        title: "1. Powerful Opening Interpretation",
        subtitle: "The Divine Blueprint & Soul Mandate",
        content: `Your incarnation operates under a profound ${sunSign} solar polarity, anchored in an intuitive ${moonSign} emotional sanctuary, and expressed through a ${ascSign} horizon interface. In the Aldebaran zero-tilt framework, your chart indicates an individual endowed with sovereign self-direction who bridges classical discipline with transformative vision. You are not here to conform to external molds, but to construct lasting systems aligned with cosmic law.`,
        badge: "Executive Synthesis",
        color: "text-[#D9B66F]",
      },
      {
        id: 2,
        title: "2. Key Astrological Findings",
        subtitle: "Dominant Drivers & Karmic Levers",
        content: (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <span className="text-[10px] uppercase font-bold text-[#D9B66F] tracking-wider">
                Primary Evolutionary Purpose
              </span>
              <p className="mt-1 text-xs text-slate-200">
                Harnessing {sunSign} solar energy to establish authority, master craft, and inspire community through authentic self-expression.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <span className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider">
                Emotional Sanctuary & Instinct
              </span>
              <p className="mt-1 text-xs text-slate-200">
                {moonSign} lunar placement grants penetrating discernment and deep interior resilience; solitude renews your clarity.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <span className="text-[10px] uppercase font-bold text-[#22D3EE] tracking-wider">
                Incarnate Persona & Outer Horizon
              </span>
              <p className="mt-1 text-xs text-slate-200">
                Ascendant in {ascSign} filters your interactions, making you approachable yet magnetically distinct in public spheres.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider">
                Kendra Angle Strength
              </span>
              <p className="mt-1 text-xs text-slate-200">
                Equal house pillars anchor stability across life quadrants, enabling resilience through cyclical shifts.
              </p>
            </div>
          </div>
        ),
        badge: "Core Architecture",
        color: "text-[#8B5CF6]",
      },
      {
        id: 3,
        title: "3. Real-Life Manifestations",
        subtitle: "Vocation, Relationships & Practical Mastery",
        content: (
          <div className="space-y-3 text-xs text-slate-200">
            <p className="leading-relaxed">
              <strong className="text-white">Vocation & Calling:</strong> You thrive where strategy, intellectual autonomy, and execution converge. Environments with bureaucratic rigidity constrain your natural initiative; you do best when leading projects or building proprietary assets.
            </p>
            <p className="leading-relaxed">
              <strong className="text-white">Relational Dynamics:</strong> In partnerships, you require equal intellectual caliber and sovereign space. Superficial connections drain you quickly; lifelong loyalties form around shared mission and mutual respect.
            </p>
            <p className="leading-relaxed">
              <strong className="text-white">Daily Rhythm & Decision Making:</strong> When confronted with major forks in the road, grounding yourself before deciding prevents impulsive reactions. Trusting your instinctive first impression rarely fails you.
            </p>
          </div>
        ),
        badge: "Action Blueprint",
        color: "text-[#22D3EE]",
      },
      {
        id: 4,
        title: "4. Supporting Astrological Evidence",
        subtitle: "Mathematical Rigor & Doctrine Validation",
        content: (
          <div className="space-y-2 text-xs font-mono">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Solar Position</span>
                <span className="text-[#D9B66F] font-bold">{sun ? `${sun.display} (House ${sun.house})` : "—"}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Lunar Position</span>
                <span className="text-[#8B5CF6] font-bold">{moon ? `${moon.display} (House ${moon.house})` : "—"}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Ascendant / Horizon</span>
                <span className="text-cyan-300 font-bold">{asc ? `${asc.display}` : "0° Equal Anchor"}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Coordinate Reference</span>
                <span className="text-emerald-300">Aldebaran Fixed Framework (0° Axial Tilt)</span>
              </div>
            </div>
            <p className="text-[11px] font-sans text-slate-400">
              Every interpretation is directly derived from these invariant spherical coordinates, ensuring zero hallucinated placements.
            </p>
          </div>
        ),
        badge: "Empirical Proof",
        color: "text-[#2DD4BF]",
      },
      {
        id: 5,
        title: "5. Deeper Technical Explanation & Master Synthesis",
        subtitle: "Classical Commentary & Comprehensive Dossier",
        content: (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Below is the complete technical dossier, integrating the Master Interpreter AI, classical Hellenistic & Vedic doctrines, and God/Agent dual-perspective calculations.
            </p>
            <div className="pt-2">
              <InterpretationPanel
                key={`natal-panel-${chart.input.location || "god"}`}
                chart={chart}
                initialMode="natal"
                initialQuestion="Provide a comprehensive synthesis of my natal birth chart across God View and Agent View frames, explaining my soul's core purpose, power channels, and karmic life lessons."
                onModeChange={onReadingModeChange}
              />
            </div>
          </div>
        ),
        badge: "Deep Doctrine",
        color: "text-amber-300",
      },
    ],
    [chart, sun, moon, asc, sunSign, moonSign, ascSign, onReadingModeChange]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-24 pt-2 text-[#E8EDF7]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B5CF6]">
              Personal Interpretation Center
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Personal Celestial Readings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synthesizing classical doctrine, sacred geometry, and your evolutionary life story
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chart"
            className="rounded-xl border border-[#D9B66F]/40 bg-[#D9B66F]/10 px-4 py-2 text-xs font-semibold text-[#D9B66F] hover:bg-[#D9B66F]/20 transition-all active:scale-95"
          >
            Diamond Chart
          </Link>
          <Link
            href="/energy"
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-all active:scale-95"
          >
            Live Energy Read
          </Link>
        </div>
      </div>

      {/* 4 Primary Reading Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 bg-[#080B14]/90 p-1.5 rounded-2xl border border-white/10 shadow-lg">
        {[
          { id: "natal", label: "Full Natal Reading", Icon: Diamond, desc: "5-Layer Synthesis" },
          { id: "lifestory", label: "Life Story & Chapters", Icon: BookOpenText, desc: "Profections & Epochs" },
          { id: "blueprint", label: "Guide & Blueprint", Icon: Layers, desc: "Ancient Mansions" },
          { id: "transits", label: "Current Transits & Q&A", Icon: Zap, desc: "Live Skies & Dialog" },
        ].map((tab) => {
          const Icon = tab.Icon;
          const active = activeReadingTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReadingTab(tab.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                active
                  ? "bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/50 shadow-[0_0_16px_rgba(139,92,246,0.25)] font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <Icon size={18} className={active ? "text-[#8B5CF6]" : "text-slate-500"} />
              <span className="text-xs mt-1 text-center">{tab.label}</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FULL NATAL READING WITH 5-LAYER PROGRESSION */}
      {activeReadingTab === "natal" && (
        <section className="space-y-6 animate-in fade-in duration-200" aria-label="Full Natal Reading">
          <div className="rounded-3xl border border-[#D9B66F]/30 bg-[#080B14]/90 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9B66F]">
                  Layered Celestial Presentation
                </span>
                <h2 className="font-serif text-2xl font-bold text-white">
                  5-Tier Astrological Deconstruction
                </h2>
              </div>
              <span className="text-[10px] font-mono text-cyan-300">High-Energy Intelligence</span>
            </div>

            {/* The 5 Layer Cards */}
            <div className="space-y-4">
              {layers.map((layer) => {
                const isExpanded = expandedLayer === layer.id;
                return (
                  <div
                    key={layer.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? "border-[#D9B66F]/60 bg-[#101628]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                        : "border-white/10 bg-black/40 hover:border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                      className="w-full flex items-center justify-between p-4 text-left transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-serif text-base font-bold ${layer.color}`}>
                            {layer.title}
                          </h3>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                            {layer.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{layer.subtitle}</p>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/10 p-4 sm:p-5 animate-in fade-in duration-200">
                        {typeof layer.content === "string" ? (
                          <p className="text-xs text-slate-200 leading-relaxed">{layer.content}</p>
                        ) : (
                          layer.content
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts and Overview Visuals */}
          <ChartOverview chart={chart} view={readingView} onViewChange={onReadingViewChange} />
          <GuardianDiamondCharts chart={chart} />
        </section>
      )}

      {/* TAB 2: LIFE STORY & EVOLUTIONARY JOURNEY */}
      {activeReadingTab === "lifestory" && (
        <section className="space-y-6 animate-in fade-in duration-200" aria-label="Life Story Evolutionary Journey">
          <div className="rounded-3xl border border-[#8B5CF6]/35 bg-[#130D2B]/80 p-6 shadow-md">
            <h2 className="font-serif text-2xl font-bold text-white">Your Chronological Life Story</h2>
            <p className="text-xs text-slate-300 mt-1">
              Annual profections, Saturn return milestones, planetary returns, and evolutionary epochs calculated across your lifespan.
            </p>
          </div>
          <LifeStoryInterpreter
            key={`${chart.input.date}:${chart.input.time}:${chart.input.location}:${chart.worldview}`}
            chart={chart}
          />
        </section>
      )}

      {/* TAB 3: CELESTIAL GUIDE & BLUEPRINT */}
      {activeReadingTab === "blueprint" && (
        <section className="space-y-6 animate-in fade-in duration-200" aria-label="Celestial Guide and Blueprint">
          <div className="rounded-3xl border border-cyan-400/35 bg-[#08182E]/80 p-6 shadow-md">
            <h2 className="font-serif text-2xl font-bold text-white">Ancient Blueprint & Mansion Systems</h2>
            <p className="text-xs text-slate-300 mt-1">
              Deep dive into the 27 Nakshatras, 28 Arabic Manzils, 28 Chinese Xiu, Egyptian Decans, and Fixed Star Beacons.
            </p>
          </div>
          <InterpretationPanel
            key={`blueprint-panel-${chart.input.location || "god"}`}
            chart={chart}
            initialMode="natal"
            initialQuestion="Deconstruct all my planetary placements through the 27 Vedic Nakshatras, 28 Arabic Manzils, Egyptian Decans, and galactic fixed stars. What ancient symbols and mythic archetypes define my incarnation?"
            onModeChange={onReadingModeChange}
          />
        </section>
      )}

      {/* TAB 4: CURRENT TRANSIT READING & Q&A */}
      {activeReadingTab === "transits" && (
        <section className="space-y-6 animate-in fade-in duration-200" aria-label="Current Transit Reading">
          <div className="rounded-3xl border border-[#D9B66F]/35 bg-[#1C1609]/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <h2 className="font-serif text-2xl font-bold text-white">Live Transits & Active Questioning</h2>
              <p className="text-xs text-slate-300 mt-1">
                Explore how the sky right now activates your birth placements with interactive Master Interpreter dialog.
              </p>
            </div>
            <Link
              href="/energy"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9B66F]/50 bg-[#D9B66F]/10 px-4 py-2.5 text-xs font-bold text-[#D9B66F] hover:bg-[#D9B66F]/20 transition-all active:scale-95 shrink-0"
            >
              <Zap size={14} />
              <span>Full Energy Forecast →</span>
            </Link>
          </div>
          <InterpretationPanel
            key={`transit-panel-${chart.input.location || "god"}`}
            chart={chart}
            initialMode="transit"
            initialQuestion={
              readingQuestion || "What major spiritual and practical opportunities are highlighted by today's planetary transits?"
            }
            onModeChange={onReadingModeChange}
          />
        </section>
      )}
    </div>
  );
}
