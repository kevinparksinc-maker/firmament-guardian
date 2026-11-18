import React, { useMemo, useState } from "react";
import {
  Sparkles,
  Compass,
  Star,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertCircle,
  Layers,
} from "lucide-react";
import type { ChartResult } from "../../../server/astronomy";
import {
  calculateEnergyStarsAndLots,
  type ArabicLotEnergyEntry,
  type FixedStarEnergyActivation,
} from "@shared/energyStarsAndLots";
import { NatalStarsAndLotsLayer } from "./NatalStarsAndLotsLayer";

interface EnergyFixedStarsAndLotsProps {
  chart: ChartResult;
  onAskQuestion?: (question: string) => void;
}

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

function StarActivationCard({
  item,
  onAskQuestion,
}: {
  item: FixedStarEnergyActivation;
  onAskQuestion?: (question: string) => void;
}) {
  const isLiveSky = item.scope === "live-sky";
  const isTriggered = item.scope === "natal-triggered";

  return (
    <div
      className={`rounded-2xl border p-4 transition-all space-y-3 ${
        item.isRoyal
          ? "border-[#D9B66F]/50 bg-[#D9B66F]/10"
          : isLiveSky || isTriggered
          ? "border-cyan-400/35 bg-cyan-950/20"
          : "border-white/10 bg-black/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-base font-bold text-white">
              {item.starName}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {item.starDisplay}
            </span>
            {item.isRoyal && (
              <span className="rounded-md border border-[#D9B66F]/50 bg-[#D9B66F]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F3D79B]">
                Royal Star
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-cyan-200">
            {item.bodyName}
            {item.bodyHouse ? ` · House ${item.bodyHouse}` : ""} ·{" "}
            <span className="font-mono text-slate-300">
              {item.orbDeg.toFixed(2)}° orb
            </span>
          </p>
        </div>

        <span
          className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isLiveSky
              ? "border-cyan-400/40 bg-cyan-950/60 text-cyan-200"
              : isTriggered
              ? "border-emerald-400/40 bg-emerald-950/60 text-emerald-200"
              : "border-white/15 bg-white/5 text-slate-300"
          }`}
        >
          {isLiveSky
            ? "Live Sky Now"
            : isTriggered
            ? "Triggered Today"
            : "Natal Anchor"}
        </span>
      </div>

      {item.liveTriggerContact && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          <strong className="font-semibold">Active Trigger:</strong>{" "}
          {item.liveTriggerContact} is waking up this placement today.
        </div>
      )}

      <div className="space-y-1.5 text-xs">
        <p className="font-semibold text-[#D9B66F]">
          {item.archetype} · <span className="text-slate-400 font-normal">{item.nature}</span>
        </p>
        <p className="leading-relaxed text-slate-200">{item.everydayMeaning}</p>
        <p className="leading-relaxed text-rose-200/90">
          <strong className="font-semibold text-rose-300">Watch out for:</strong>{" "}
          {item.watchOutFor}
        </p>
      </div>

      {onAskQuestion && (
        <div className="flex justify-end border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() =>
              onAskQuestion(
                `What does fixed star ${item.starName} on my ${item.bodyName}${
                  item.liveTriggerContact
                    ? ` (currently triggered by ${item.liveTriggerContact})`
                    : ""
                } mean in plain, practical terms today?`
              )
            }
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
          >
            <MessageSquare size={12} />
            <span>Ask Master Interpreter →</span>
          </button>
        </div>
      )}
    </div>
  );
}

function LotDirectoryCard({
  lot,
  onAskQuestion,
}: {
  lot: ArabicLotEnergyEntry;
  onAskQuestion?: (question: string) => void;
}) {
  const hasLiveHits = lot.liveTransits.length > 0;
  return (
    <div
      className={`rounded-2xl border p-4 space-y-2.5 transition-all ${
        hasLiveHits
          ? "border-[#D9B66F]/45 bg-[#D9B66F]/10"
          : "border-white/10 bg-black/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-serif text-base font-bold text-white">
            {lot.meta.name}
          </h4>
          <p className="text-[11px] text-slate-400">{lot.meta.lifeDomain}</p>
        </div>
        <div className="text-right">
          <span className="block font-mono text-xs font-semibold text-cyan-200">
            {lot.display}
          </span>
          <span className="block text-[10px] text-slate-400">
            House {lot.house} · Ruler {lot.meta.rulerPlanet}
          </span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-200">
        {lot.personalPlacementReading}
      </p>

      <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-slate-300">
        <span className="text-slate-400">Where it lands:</span>{" "}
        <span className="text-white font-medium">{lot.houseArena}</span>
        <span className="block mt-1 font-mono text-[10px] text-slate-500">
          {lot.sect === "day" ? "Day Sect" : "Night Sect"} Formula:{" "}
          {lot.formulaUsed}
        </span>
      </div>

      {lot.natalStarContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lot.natalStarContacts.map((st) => (
            <span
              key={st.starName}
              className="rounded-md border border-[#D9B66F]/40 bg-[#D9B66F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F3D79B]"
            >
              ★ Aligned with {st.starName} ({st.orbDeg.toFixed(1)}°)
            </span>
          ))}
        </div>
      )}

      {lot.liveTransits.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9B66F]">
            Active Today
          </span>
          {lot.liveTransits.slice(0, 2).map((hit) => (
            <p key={hit.id} className="text-xs text-slate-200">
              <span className="font-mono text-cyan-300">
                {hit.transitPlanet} {ASPECT_GLYPHS[hit.aspect] || hit.aspect}
              </span>{" "}
              <span className="text-slate-400">({hit.orbDeg.toFixed(1)}°)</span>{" "}
              — {hit.realLifeTakeaway}
            </p>
          ))}
        </div>
      )}

      {onAskQuestion && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              onAskQuestion(
                `Explain my ${lot.meta.name} in ${lot.sign} (House ${lot.house}, ${lot.sect} chart) and what its current transits mean in everyday life.`
              )
            }
            className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
          >
            Ask about this Lot →
          </button>
        </div>
      )}
    </div>
  );
}

export function EnergyFixedStarsAndLots({
  chart,
  onAskQuestion,
}: EnergyFixedStarsAndLotsProps) {
  const [sectionTab, setSectionTab] = useState<"all" | "natal-map" | "stars" | "lots">("all");
  const [showBackgroundNatalStars, setShowBackgroundNatalStars] = useState(false);
  const [showAllLotsDirectory, setShowAllLotsDirectory] = useState(false);

  const data = useMemo(() => calculateEnergyStarsAndLots(chart), [chart]);

  const activeStarCount =
    data.liveSkyStars.length + data.natalTriggeredStars.length;
  const activeLotHitCount = data.activeLotHits.length;

  return (
    <section
      aria-label="Fixed Stars and Hermetic Arabic Lots"
      className="space-y-6 rounded-3xl border border-white/10 bg-[#080B14]/90 p-5 shadow-2xl sm:p-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D9B66F] shadow-[0_0_8px_#D9B66F]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D9B66F]">
              Deep Layer · Traditional Timing
            </span>
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold text-white sm:text-3xl">
            Fixed Stars & Hermetic Arabic Lots
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Fixed stars spotlight sharper turning points and character tests,
            while the 7 Hermetic Lots pinpoint where today&apos;s sky lands in
            your body, work, agreements, and timing.
          </p>
        </div>

        {/* Sect & Active Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-200">
            {data.sect === "unknown" ? "Sect unavailable" : data.sect === "day" ? "☀ Day Sect Chart" : "☾ Night Sect Chart"}
          </span>
          <span className="rounded-lg border border-cyan-400/30 bg-cyan-950/30 px-3 py-1.5 font-semibold text-cyan-200">
            ★ {activeStarCount} Active Star{activeStarCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-lg border border-[#D9B66F]/40 bg-[#D9B66F]/15 px-3 py-1.5 font-semibold text-[#F3D79B]">
            ◈ {activeLotHitCount} Lot Hit{activeLotHitCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "Active Today" },
          { id: "natal-map", label: `All Natal Star & Lot Positions (${data.natalStarPositions.length})` },
          { id: "stars", label: `★ Fixed Stars (${activeStarCount} active)` },
          {
            id: "lots",
            label: `◈ Arabic Lots (${data.lots.length ? `${activeLotHitCount} active / 7` : "Needs Birth Time"})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSectionTab(tab.id as "all" | "natal-map" | "stars" | "lots")}
            className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              sectionTab === tab.id
                ? "border-[#D9B66F] bg-[#D9B66F] text-black shadow-sm"
                : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sectionTab === "natal-map" && (
        <NatalStarsAndLotsLayer chart={chart} onAskQuestion={onAskQuestion} />
      )}

      {/* FIXED STARS SECTION */}
      {(sectionTab === "all" || sectionTab === "stars") && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#D9B66F]" />
              <h3 className="font-serif text-xl font-bold text-white">
                Fixed Star Activations
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Royal Stars within 5° · Major Stars within 2°
            </span>
          </div>

          {data.liveSkyStars.length === 0 && data.natalTriggeredStars.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-300">
              No transit planets are sitting on top of a catalog Fixed Star right
              now, and none of your natal star anchors are being directly
              triggered within today&apos;s tight orb.
            </div>
          ) : (
            <div className="space-y-4">
              {data.liveSkyStars.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Happening in Today&apos;s Sky ({data.liveSkyStars.length})
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.liveSkyStars.map((item) => (
                      <StarActivationCard
                        key={item.id}
                        item={item}
                        onAskQuestion={onAskQuestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {data.natalTriggeredStars.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Your Natal Stars Woken Up Today (
                    {data.natalTriggeredStars.length})
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.natalTriggeredStars.map((item) => (
                      <StarActivationCard
                        key={item.id}
                        item={item}
                        onAskQuestion={onAskQuestion}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.natalAnchorStars.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBackgroundNatalStars((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 cursor-pointer"
              >
                {showBackgroundNatalStars ? (
                  <>
                    <ChevronUp size={14} />
                    <span>
                      Hide Steady Natal Star Anchors (
                      {data.natalAnchorStars.length})
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>
                      Show Your Steady Natal Star Anchors (
                      {data.natalAnchorStars.length})
                    </span>
                  </>
                )}
              </button>

              {showBackgroundNatalStars && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {data.natalAnchorStars.map((item) => (
                    <StarActivationCard
                      key={item.id}
                      item={item}
                      onAskQuestion={onAskQuestion}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ARABIC LOTS SECTION */}
      {(sectionTab === "all" || sectionTab === "lots") && (
        <div className="space-y-4 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-cyan-300" />
              <h3 className="font-serif text-xl font-bold text-white">
                Hermetic Arabic Lots
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Major contacts 100% impact · Minor contacts 50% calibrated impact
            </span>
          </div>

          {!data.lotsAvailable ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-xs text-amber-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <p>{data.lotsUnavailableReason}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.activeLotHits.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-300">
                  No transit planet is within 5° of your 7 Hermetic Lots at this
                  exact moment—your baseline Lot placements remain steady.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#D9B66F]">
                    Triggered Arabic Lots Today ({data.activeLotHits.length})
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.activeLotHits.map(({ lot, aspect }) => {
                      const isFlow = aspect.flow === 1;
                      const isFriction = aspect.flow === -1;
                      return (
                        <div
                          key={aspect.id}
                          className="rounded-2xl border border-white/15 bg-black/45 p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-cyan-300">
                                  {aspect.transitPlanet}{" "}
                                  {ASPECT_GLYPHS[aspect.aspect] || aspect.aspect}
                                </span>
                                <span className="font-serif text-base font-bold text-white">
                                  {lot.meta.name}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {lot.display} · House {lot.house} (
                                {lot.houseArena})
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                  aspect.isMajor
                                    ? "border-teal-400/40 bg-teal-950/70 text-[#2DD4BF]"
                                    : "border-amber-400/40 bg-amber-950/70 text-amber-300"
                                }`}
                              >
                                {aspect.isMajor ? "Major 100%" : "Minor 50%"}
                              </span>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                  isFlow
                                    ? "border-teal-400/40 bg-teal-950/70 text-[#2DD4BF]"
                                    : isFriction
                                    ? "border-rose-400/40 bg-rose-950/70 text-[#FB7185]"
                                    : "border-cyan-400/40 bg-cyan-950/70 text-cyan-300"
                                }`}
                              >
                                {isFlow
                                  ? "Support"
                                  : isFriction
                                  ? "Pressure"
                                  : "Active"}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs leading-relaxed text-slate-200">
                            {aspect.realLifeTakeaway}
                          </p>

                          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                            <span className="font-mono text-slate-400">
                              Orb: {aspect.orbDeg.toFixed(2)}° · Weight:{" "}
                              {aspect.weight}
                            </span>
                            {onAskQuestion && (
                              <button
                                type="button"
                                onClick={() =>
                                  onAskQuestion(
                                    `Transit ${aspect.transitPlanet} is making a ${aspect.aspect} (${aspect.orbDeg.toFixed(2)}° orb) to my ${lot.meta.name} in ${lot.sign} (House ${lot.house}). What does this mean for my day in plain language?`
                                  )
                                }
                                className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
                              >
                                <Sparkles size={11} />
                                <span>Ask Master Interpreter →</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle for all 7 Lots */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllLotsDirectory((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 cursor-pointer"
                >
                  <Layers size={14} className="text-[#D9B66F]" />
                  <span>
                    {showAllLotsDirectory
                      ? "Hide Full 7 Hermetic Lots Directory"
                      : "View All 7 Hermetic Lots & Formulas"}
                  </span>
                  {showAllLotsDirectory ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>

                {showAllLotsDirectory && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.lots.map((lot) => (
                      <LotDirectoryCard
                        key={lot.meta.id}
                        lot={lot}
                        onAskQuestion={onAskQuestion}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
