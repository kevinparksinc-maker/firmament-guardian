import React, { useMemo } from "react";
import type { ChartResult } from "../../../server/astronomy";
import { calculateEnergyRead, calculateIndependentEnergyRead } from "@/lib/energyScoring";
import { Sun, Moon } from "lucide-react";

interface AlignEnergyBarometerProps {
  chart: ChartResult;
  personalScore: NonNullable<ReturnType<typeof calculateEnergyRead>>;
}

export function AlignEnergyBarometer({ chart, personalScore }: AlignEnergyBarometerProps) {
  // Environmental independent sky score
  const skyScore = useMemo(() => {
    return calculateIndependentEnergyRead(chart, "transit");
  }, [chart]);

  // Current Moon position in transit
  const transitMoon = useMemo(() => {
    return chart.transits?.find(t => t.name === "Moon");
  }, [chart]);

  const skyFlowPct = skyScore?.flowPct;
  const personalFlowPct = personalScore.flowPct;

  // Major vs Minor breakdown for personal contacts
  const majorContacts = useMemo(() => {
    return personalScore.contacts.filter(c => c.majorFactor === 1);
  }, [personalScore]);

  const minorContacts = useMemo(() => {
    return personalScore.contacts.filter(c => c.majorFactor < 1);
  }, [personalScore]);

  const majorWeight = useMemo(() => {
    return majorContacts.reduce((sum, c) => sum + c.strength, 0);
  }, [majorContacts]);

  const minorWeight = useMemo(() => {
    return minorContacts.reduce((sum, c) => sum + c.strength, 0);
  }, [minorContacts]);

  const totalWeight = majorWeight + minorWeight || 1;
  const majorPctOfForce = Math.round((majorWeight / totalWeight) * 100);
  const minorPctOfForce = 100 - majorPctOfForce;

  return (
    <div className="space-y-6">
      {/* DUAL-CHANNEL READ: Environmental Sky vs Personal Connection */}
      <section
        aria-label="Environmental vs Personal Sky Duality"
        className="rounded-3xl border border-white/10 bg-[#080B14]/90 p-6 shadow-xl sm:p-7 space-y-6"
      >
        <div className="border-b border-white/10 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9B66F]">
            The Duality Principle (As in Align 27)
          </span>
          <h3 className="font-serif text-2xl font-bold text-white mt-1">
            Environmental Atmosphere vs. Your Personal Connection
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            The sky score compares current bodies with each other. The personal score compares them with your birth chart.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Channel 1: Environmental Sky Weather */}
          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-950/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  1. Environmental Atmosphere (Sky Weather)
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-200">
                {skyFlowPct === undefined ? "Sky score unavailable" : `${skyFlowPct}% Ambient Harmony`}
              </span>
            </div>

            {/* Atmosphere Progress Bar */}
            {skyFlowPct !== undefined && <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Sky Friction ({skyScore?.frictionPct ?? 0}%)</span>
                <span>Sky Flow ({skyFlowPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div style={{ width: `${skyScore?.frictionPct ?? 0}%` }} className="bg-rose-500/70" />
                <div style={{ width: `${skyFlowPct}%` }} className="bg-cyan-400" />
              </div>
            </div>}

            {transitMoon && (
              <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 text-xs text-slate-300 flex items-center justify-between">
                <span>Live Lunar Transit:</span>
                <span className="font-mono font-semibold text-cyan-200">{transitMoon.display}</span>
              </div>
            )}
          </div>

          {/* Channel 2: Personal Connection */}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-950/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  2. Personal Resonance (Hooked to You)
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-200">
                {personalFlowPct}% Personal Flow
              </span>
            </div>

            {/* Personal Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Personal Friction ({personalScore.frictionPct}%)</span>
                <span>Personal Flow ({personalFlowPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div style={{ width: `${personalScore.frictionPct}%` }} className="bg-rose-500" />
                <div style={{ width: `${personalFlowPct}%` }} className="bg-[#2DD4BF]" />
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 text-xs text-slate-300 flex items-center justify-between">
              <span>Personal Status:</span>
              <span className="font-mono font-semibold text-amber-200">{personalScore.signal}</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAJOR ASPECTS VS MINOR ASPECTS BREAKDOWN (50% Impact Rule) */}
      <section
        aria-label="Major and Minor Aspects Calibrated Impact"
        className="rounded-3xl border border-white/10 bg-[#080B14]/90 p-6 shadow-xl sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
              Calibrated Aspect Hierarchy
            </span>
            <h3 className="font-serif text-2xl font-bold text-white mt-1">
              Major Aspects (100%) vs. Minor Aspects (50% Impact)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Minor aspects provide nuanced, secondary background friction or gentle support calibrated at exactly 50% of major aspect strength so your primary planetary drivers remain clear.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Major Aspects Card */}
          <div className="rounded-2xl border border-teal-400/30 bg-teal-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF]">
                ★ Major Celestial Alignments (100% Impact)
              </span>
              <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300">
                Factor: 1.0×
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-serif text-3xl font-bold text-white tabular-nums">
                  {majorContacts.length}
                </span>
                <span className="ml-2 text-xs text-slate-400">active major contacts</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg font-bold text-teal-300 tabular-nums">
                  {majorWeight.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">pts ({majorPctOfForce}% of force)</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Conjunction (0°), Trine (120°), Sextile (60°), Square (90°), and Opposition (180°).</strong> These are the foundational gravitational engines driving your day.
            </p>
          </div>

          {/* Minor Aspects Card */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                ✧ Minor Celestial Nuances (50% Impact)
              </span>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                Factor: 0.5×
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-serif text-3xl font-bold text-white tabular-nums">
                  {minorContacts.length}
                </span>
                <span className="ml-2 text-xs text-slate-400">active minor contacts</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                  {minorWeight.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">pts ({minorPctOfForce}% of force)</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Semisextile (30°), Semisquare (45°), and Quincunx (150°).</strong> Calibrated at 50% impact to capture subtle underlying psychological friction and micro-adjustments without skewing primary direction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
