import React, { useState, useMemo } from "react";
import type { ChartResult } from "../../../server/astronomy";
import { FocusedPlacementReading } from "@/components/FocusedPlacementReading";
import { ENERGY_ASPECT_FLOW } from "@/lib/energyScoring";
import {
  Sparkles,
  Briefcase,
  Heart,
  Zap,
  MessageSquare,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const MAJOR_ASPECTS = new Set(["conjunction", "trine", "sextile", "square", "opposition"]);

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌",
  semisextile: "⚺",
  semisquare: "∠",
  quincunx: "⚻",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};

interface RealLifeAspectBreakdownProps {
  chart: ChartResult;
  contacts: any[];
  onAskQuestion?: (question: string) => void;
}

const DEFAULT_VISIBLE_LIMIT = 6;

export function RealLifeAspectBreakdown({ chart, contacts, onAskQuestion }: RealLifeAspectBreakdownProps) {
  const [lifeArea, setLifeArea] = useState<"all" | "work" | "love" | "mind">("all");
  const [impactFilter, setImpactFilter] = useState<"all" | "major" | "minor" | "flow" | "friction">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Process & sort contacts by weighted impact first (Major 100% ahead of minor 50%), then tightest orb
  const aspectItems = useMemo(() => {
    return (contacts || [])
      .map((c: any) => {
        const isMajor = c.majorFactor === 1 || MAJOR_ASPECTS.has(c.aspect);
        const isFlow = c.flow === 1 || (ENERGY_ASPECT_FLOW as Record<string, number>)[c.aspect] === 1;
        const isFriction = c.flow === -1 || (ENERGY_ASPECT_FLOW as Record<string, number>)[c.aspect] === -1;
        return {
          id: c.id,
          transit: c.transit,
          natal: c.natal,
          aspect: c.aspect,
          orb: c.orb,
          isMajor,
          isFlow,
          isFriction,
          strength: Number(c.strength ?? 0),
          natalHouse: chart.movingBodies.find(body => body.name === c.natal)?.house ??
            (c.natal === "Ascendant" ? chart.ascendant?.house : undefined),
          transitHouse: chart.transits.find(body => body.name === c.transit)?.house,
        };
      })
      .sort((a, b) => {
        if (b.isMajor !== a.isMajor) return b.isMajor ? 1 : -1;
        if (b.strength !== a.strength) return b.strength - a.strength;
        return a.orb - b.orb;
      });
  }, [chart, contacts]);

  // Filtered contacts
  const filteredItems = useMemo(() => {
    return aspectItems.filter(item => {
      if (impactFilter === "major" && !item.isMajor) return false;
      if (impactFilter === "minor" && item.isMajor) return false;
      if (impactFilter === "flow" && !item.isFlow) return false;
      if (impactFilter === "friction" && !item.isFriction) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMeta =
          item.transit.toLowerCase().includes(query) ||
          item.natal.toLowerCase().includes(query) ||
          item.aspect.toLowerCase().includes(query) ||
          `house ${item.natalHouse ?? ""} house ${item.transitHouse ?? ""}`.includes(query);
        if (!matchesMeta) return false;
      }

      return true;
    });
  }, [aspectItems, impactFilter, searchQuery]);

  const majorCount = useMemo(() => aspectItems.filter(i => i.isMajor).length, [aspectItems]);
  const minorCount = useMemo(() => aspectItems.filter(i => !i.isMajor).length, [aspectItems]);

  const visibleItems = useMemo(() => {
    if (showAll || searchQuery.trim()) return filteredItems;
    return filteredItems.slice(0, DEFAULT_VISIBLE_LIMIT);
  }, [filteredItems, showAll, searchQuery]);

  const toggleCardDetail = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-label="Real-Life Human Aspect Breakdown"
      className="space-y-6 rounded-3xl border border-white/10 bg-[#080B14]/90 p-5 shadow-2xl sm:p-8"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
            Chart-Anchored Aspect Grid
          </span>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            What Today&apos;s Aspects Mean in Real Life
          </h2>
          <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
            Sorted from strongest Major drivers (100% impact) to subtle Minor adjustments (50% impact), mapped straight to your Houses and Signs.
          </p>
        </div>

        {/* Life-Area Focus Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          {[
            { id: "all", label: "Overview", icon: Sparkles },
            { id: "mind", label: "Mood & Focus", icon: Zap },
            { id: "work", label: "Work & Money", icon: Briefcase },
            { id: "love", label: "People & Talk", icon: Heart },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLifeArea(tab.id as any)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-all cursor-pointer ${
                lifeArea === tab.id
                  ? "bg-[#D9B66F] text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <tab.icon size={12} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: `All (${aspectItems.length})` },
            { id: "major", label: `★ Major 100% (${majorCount})` },
            { id: "minor", label: `✧ Minor 50% (${minorCount})` },
            { id: "flow", label: "Smooth Flow" },
            { id: "friction", label: "Growth Friction" },
          ].map(btn => (
            <button
              key={btn.id}
              type="button"
              onClick={() => {
                setImpactFilter(btn.id as any);
                setShowAll(false);
              }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                impactFilter === btn.id
                  ? "border border-cyan-400 bg-cyan-950/60 text-cyan-200"
                  : "border border-white/10 bg-black/30 text-slate-400 hover:text-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-56">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by planet, house, or aspect…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Aspects Cards Grid */}
      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-sm text-slate-400">
          <Compass className="mx-auto mb-2 h-7 w-7 text-cyan-400/60" />
          <p>No active aspects match your selected filters. Click &ldquo;All&rdquo; to reset.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            {visibleItems.map(item => {
              const aspectGlyph = ASPECT_GLYPHS[item.aspect] || "";
              const aspectName = item.aspect.charAt(0).toUpperCase() + item.aspect.slice(1);
              const showReading = Boolean(expandedCards[item.id]);

              return (
                <article
                  key={item.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all shadow-lg ${
                    item.isMajor
                      ? "border-white/15 bg-[linear-gradient(135deg,#0B1124_0%,#090E1D_100%)] hover:border-amber-400/40"
                      : "border-white/10 bg-[#070A14]/90 hover:border-white/20"
                  }`}
                >
                  <div>
                    {/* Clean Metadata Header */}
                    <div className="space-y-1.5 border-b border-white/10 pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#D9B66F]">
                          {item.transit} {aspectGlyph} {aspectName} {item.natal}
                        </span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            item.isMajor ? "text-[#2DD4BF]" : "text-amber-300"
                          }`}
                        >
                          {item.transitHouse && item.natalHouse ? `House ${item.transitHouse} → ${item.natalHouse} · ` : ""}{item.isMajor ? "Major 100%" : "Minor 50%"} · {item.orb.toFixed(2)}°
                        </span>
                      </div>

                    </div>
                    {showReading && (
                      <FocusedPlacementReading chart={chart} name={item.transit}
                        otherName={item.natal} kind="contact" layer="transit" lens={lifeArea} />
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button type="button" onClick={() => toggleCardDetail(item.id)}
                      aria-expanded={showReading} className="text-[11px] font-medium text-slate-300 hover:text-white">
                      {showReading ? "Hide interpretation" : "Read this contact"}
                    </button>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Force {item.strength.toFixed(1)} pts · {item.isFlow ? "Flow" : item.isFriction ? "Friction" : "Neutral"}
                    </span>

                    {onAskQuestion && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskQuestion(
                            `In plain everyday terms: how does transit ${item.transit} ${item.aspect} my natal ${item.natal} show up today, and what should I do?`
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 transition cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Ask Master Interpreter →</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {!searchQuery.trim() && filteredItems.length > DEFAULT_VISIBLE_LIMIT && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-950/35 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/45 cursor-pointer"
              >
                {showAll ? (
                  <>
                    <ChevronUp size={14} />
                    <span>Show Top {DEFAULT_VISIBLE_LIMIT} Strongest Aspects</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>Show All {filteredItems.length} Matching Aspects</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
