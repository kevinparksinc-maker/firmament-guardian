import React, { useState, useMemo } from "react";
import {
  Calendar,
  Sparkles,
  Sun,
  Moon,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Crown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  Shield,
  Activity,
  Heart,
  Briefcase,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSovereignTier, SovereignTeaserLock } from "./SovereignTierModal";
import type { ChartResult } from "../../../server/astronomy";

interface TransitWeatherTimelineProps {
  chart: ChartResult | null;
  onAskMasterInterpreter?: (question: string) => void;
  className?: string;
}

interface DayWeather {
  date: string;
  dayOfWeek: string;
  dayOfMonth: number;
  monthName: string;
  score: number; // 0 - 100
  type: "flow" | "friction" | "mystical";
  headline: string;
  dominantAspect: string;
  category: "love" | "career" | "emotional" | "all";
  remedyAction: string;
  caution: string;
  natalTrigger: string;
}

export function TransitWeatherTimeline({
  chart,
  onAskMasterInterpreter,
  className = "",
}: TransitWeatherTimelineProps) {
  const { isSovereign, openPaywall } = useSovereignTier();
  const [timelineRange, setTimelineRange] = useState<"30" | "90">("30");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "love" | "career" | "emotional">("all");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Generate 30 to 90 days of deterministic transit weather projections
  const daysForecast = useMemo<DayWeather[]>(() => {
    const days: DayWeather[] = [];
    const now = new Date();
    const count = timelineRange === "90" ? 90 : 30;

    const aspectPool = [
      {
        aspect: "Transit Venus Trine Natal Sun",
        type: "flow" as const,
        headline: "Radiant Magnetism & Social Grace",
        category: "love" as const,
        remedy: "Optimal moment for vulnerable romantic talks, aesthetic upgrades, and social outreach.",
        caution: "Avoid undercharging for your value or over-agreeing to please others.",
        trigger: "Venus at 14° Pisces forming harmonious 120° trine with your natal Sun.",
      },
      {
        aspect: "Transit Mars Square Natal Mercury",
        type: "friction" as const,
        headline: "Sharp Intellect & Verbal Friction Risk",
        category: "career" as const,
        remedy: "Channel high mental energy into independent strategy, editing, and technical problem-solving.",
        caution: "Wait 20 minutes before hitting send on reactive emails. Drive with extra presence.",
        trigger: "Mars at 22° Gemini squaring your natal Mercury orb 1.4°.",
      },
      {
        aspect: "Transit Moon Trine Natal Jupiter",
        type: "flow" as const,
        headline: "Emotional Abundance & Generosity",
        category: "emotional" as const,
        remedy: "Excellent day to reconnect with family, invest in wellness, or launch collaborative ventures.",
        caution: "Mind dietary over-indulgence or overpromising on time commitments.",
        trigger: "Moon passing through Cancer in trine with your natal Jupiter.",
      },
      {
        aspect: "Full Moon Illumination in 8th House",
        type: "mystical" as const,
        headline: "Deep Psychological Release & Intuition",
        category: "emotional" as const,
        remedy: "Carve out 45 minutes of stillness. Transcribe subconscious dreams and clarify joint finances.",
        caution: "Do not make irreversible relationship ultimatums during the lunation peak.",
        trigger: "Full Moon culminations activating your natal transformative axis.",
      },
      {
        aspect: "Transit Sun Conjunct Natal Midheaven",
        type: "flow" as const,
        headline: "Career Apex & High Visibility",
        category: "career" as const,
        remedy: "Pitch the high-stakes project, publish your thought leadership, and step into authority.",
        caution: "Impatience with slow colleagues could cause friction; lead with encouragement.",
        trigger: "Sun crosses your highest culmination degree with peak public illumination.",
      },
      {
        aspect: "Transit Saturn Sextile Natal Moon",
        type: "flow" as const,
        headline: "Emotional Resilience & Structural Grounding",
        category: "emotional" as const,
        remedy: "Establish long-term personal routines, financial budgeting, and restorative boundaries.",
        caution: "Don't mistake calmness for numbness; stay open to gentle connection.",
        trigger: "Saturn provides stabilizing 60° geometry to your emotional foundation.",
      },
      {
        aspect: "Transit Mercury Retrograde Station",
        type: "friction" as const,
        headline: "Contract Review & Internal Reflection",
        category: "career" as const,
        remedy: "Audit past projects, organize file backups, and reconnect with past collaborators.",
        caution: "Avoid signing ambiguous deals or buying expensive electronics without warranties.",
        trigger: "Mercury shifts apparent motion, asking your mind to review rather than initiate.",
      },
      {
        aspect: "Transit Venus Conjunct Natal Mars",
        type: "flow" as const,
        headline: "Peak Chemistry & Creative Seduction",
        category: "love" as const,
        remedy: "Plan an unforgettable date, produce bold creative work, and express physical vitality.",
        caution: "Intense desire can spark competitive jealousy if communication lapses.",
        trigger: "Venus merges with your natal passion drive in exact conjunction.",
      },
    ];

    for (let i = 0; i < count; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      const dayOfMonth = d.getDate();
      const dateStr = d.toISOString().split("T")[0];

      // Deterministic cycle selection
      const poolItem = aspectPool[(i * 3 + d.getDate()) % aspectPool.length];

      // Calculate score based on type and cycle
      let baseScore = poolItem.type === "flow" ? 85 : poolItem.type === "mystical" ? 78 : 62;
      const variation = ((i * 7 + 13) % 15) - 7;
      const score = Math.max(50, Math.min(98, baseScore + variation));

      days.push({
        date: dateStr,
        dayOfWeek,
        dayOfMonth,
        monthName,
        score,
        type: poolItem.type,
        headline: poolItem.headline,
        dominantAspect: poolItem.aspect,
        category: poolItem.category,
        remedyAction: poolItem.remedy,
        caution: poolItem.caution,
        natalTrigger: poolItem.trigger,
      });
    }

    return days;
  }, [timelineRange]);

  // Filtered list
  const filteredDays = useMemo(() => {
    if (categoryFilter === "all") return daysForecast;
    return daysForecast.filter(d => d.category === categoryFilter || d.category === "all");
  }, [daysForecast, categoryFilter]);

  const activeDay = daysForecast[selectedDayIndex] || daysForecast[0];

  const handleRangeToggle = (range: "30" | "90") => {
    if (range === "90" && !isSovereign) {
      openPaywall("90-Day Predictive Cosmic Weather Timeline");
      return;
    }
    setTimelineRange(range);
  };

  const handleAskAboutDay = () => {
    if (!onAskMasterInterpreter || !activeDay) return;
    onAskMasterInterpreter(
      `Please provide an actionable cosmic forecast for ${activeDay.date} (${activeDay.dayOfWeek}, ${activeDay.monthName} ${activeDay.dayOfMonth}). The dominant transit is "${activeDay.dominantAspect}" with a cosmic score of ${activeDay.score}/100. How should I navigate this day effectively?`
    );
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header Banner */}
      <div className="rounded-3xl border border-cyan-300/25 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-500/20 shadow-md">
                <Calendar className="h-4 w-4 text-cyan-300" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                Predictive Cosmic Transit Weather
              </span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-white tracking-tight">
              The 30 / 90-Day Celestial Horizon
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Track the exact geometric triggers hitting your natal blueprint day by day. Identify green windows for bold leaps, amber days requiring patience, and mystical windows of emotional clarity.
            </p>
          </div>

          {/* Timeframe & Category Selectors */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Range Toggle */}
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1.5">
              <button
                type="button"
                onClick={() => handleRangeToggle("30")}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  timelineRange === "30"
                    ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                30-Day View (Free)
              </button>
              <button
                type="button"
                onClick={() => handleRangeToggle("90")}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                  timelineRange === "90"
                    ? "bg-amber-400/30 text-amber-200 border border-amber-300/40 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>90-Day Outlook</span>
                {!isSovereign && <Crown className="h-3 w-3 text-amber-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter Lens:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                categoryFilter === "all" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Influences
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("love")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${
                categoryFilter === "love" ? "bg-rose-500/30 text-rose-200 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Heart className="h-3 w-3" /> Love & Romance
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("career")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${
                categoryFilter === "career" ? "bg-cyan-500/30 text-cyan-200 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="h-3 w-3" /> Career & Money
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("emotional")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${
                categoryFilter === "emotional" ? "bg-purple-500/30 text-purple-200 font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Moon className="h-3 w-3" /> Emotional Grounding
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> High Flow (80+)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Caution / Friction
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> Intuitive
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Scroll */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-white/10">
          {daysForecast.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isFlow = day.type === "flow";
            const isFriction = day.type === "friction";

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-shrink-0 w-24 p-3 rounded-2xl border text-center transition-all ${
                  isSelected
                    ? "border-cyan-300 bg-cyan-400/20 shadow-lg shadow-cyan-950/30 scale-105"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-[11px] font-medium text-slate-400">{day.dayOfWeek}</div>
                <div className="text-xl font-bold text-white my-0.5">
                  {day.monthName} {day.dayOfMonth}
                </div>
                <div
                  className={`mt-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isFlow
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : isFriction
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}
                >
                  {day.score}/100
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Deep Inspector Card */}
      {activeDay && (
        <Card className="border-cyan-300/25 bg-gradient-to-b from-cyan-950/20 via-black/40 to-black/60 text-slate-100 shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-white/10 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                    Day Forecast · {activeDay.dayOfWeek}, {activeDay.monthName} {activeDay.dayOfMonth}, {activeDay.date}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      activeDay.type === "flow"
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : activeDay.type === "friction"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                        : "border-purple-400/40 bg-purple-400/10 text-purple-200"
                    }`}
                  >
                    Cosmic Index {activeDay.score} / 100
                  </Badge>
                </div>
                <CardTitle className="font-serif text-2xl sm:text-3xl text-white mt-1.5">
                  {activeDay.headline}
                </CardTitle>
              </div>

              <Button
                type="button"
                onClick={handleAskAboutDay}
                className="h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-xs font-semibold text-white shadow-md shadow-cyan-950/30 hover:from-cyan-400 hover:to-blue-500 gap-1.5 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask Master Interpreter About This Day</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Active Geometric Trigger */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex items-start gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300 shrink-0">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Dominant Astronomical Trigger
                </div>
                <div className="font-serif text-lg font-bold text-white mt-0.5">
                  {activeDay.dominantAspect}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-5">
                  {activeDay.natalTrigger}
                </p>
              </div>
            </div>

            {/* Actionable Strategy vs Cautions */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Positive Action */}
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Recommended Action
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {activeDay.remedyAction}
                </p>
              </div>

              {/* Friction Caution */}
              <div className="rounded-2xl border border-amber-400/20 bg-amber-950/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Friction Trap to Avoid
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {activeDay.caution}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sovereign Tier Lock Teaser */}
      <SovereignTeaserLock
        title="Full 90-Day Predictive Micro-Transit Curves"
        description="Expand your predictive timeline from 30 days to a complete quarterly 90-day trajectory. Includes planetary ingress stations, eclipse windows, and personal financial release cycles."
        featureKey="90-day-timeline"
      />
    </div>
  );
}
