import React, { useMemo, useState } from "react";
import { Search, Compass, Star, AlertTriangle, MessageSquare } from "lucide-react";
import type { ChartResult } from "../../../server/astronomy";
import {
  calculateEnergyStarsAndLots,
  type ArabicLotEnergyEntry,
  type NatalFixedStarPosition,
} from "@shared/energyStarsAndLots";

interface NatalStarsAndLotsLayerProps {
  chart: ChartResult;
  onAskQuestion?: (question: string) => void;
  defaultTab?: "lots" | "stars";
}

function FixedStarRow({
  star,
  onAskQuestion,
}: {
  star: NatalFixedStarPosition;
  onAskQuestion?: (question: string) => void;
}) {
  const isAlgol = star.starName === "Algol";

  return (
    <article
      className={`rounded-2xl border p-4 space-y-2.5 transition-colors ${
        isAlgol
          ? "border-rose-400/35 bg-rose-950/15"
          : star.isRoyal
          ? "border-[#E5C16C]/35 bg-[#E5C16C]/[0.07]"
          : "border-white/10 bg-[#0A1020]/90"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="font-serif text-lg font-semibold text-white">
              {star.starName}
            </h4>
            <span className="font-mono text-xs tabular-nums text-cyan-200">
              {star.starDisplay}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            House {star.house} ({star.houseArena}) · {star.nature}
            {star.isRoyal ? " · Royal Star" : ""}
            {star.natalConjunctions.length > 0
              ? ` · Conjunct ${star.natalConjunctions.map((c) => `${c.bodyName} (${c.orbDeg.toFixed(1)}°)`).join(", ")}`
              : " · Pure House & Sign placement"}
          </p>
        </div>

        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 tabular-nums">
          H{star.house} · {star.sign}
        </span>
      </div>

      <p className="text-xs font-medium text-[#E5C16C]">{star.archetype}</p>

      <p className="text-xs leading-6 text-slate-200">{star.personalHouseReading}</p>

      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
        <span className={`font-semibold ${isAlgol ? "text-rose-300" : "text-amber-300"}`}>
          {isAlgol ? "Where sabotage can flare up:" : "Watch-out in this house:"}
        </span>{" "}
        {star.sabotageOrShadowRisk}
      </div>

      {onAskQuestion && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              onAskQuestion(
                `Explain ${star.starName} at ${star.starDisplay} in my natal House ${star.house} (${star.houseArena}) in plain, practical terms—especially how to handle it even without major planet aspects.`
              )
            }
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
          >
            <MessageSquare size={12} />
            <span>Ask about {star.starName} in House {star.house} →</span>
          </button>
        </div>
      )}
    </article>
  );
}

function ArabicLotRow({
  lot,
  onAskQuestion,
}: {
  lot: ArabicLotEnergyEntry;
  onAskQuestion?: (question: string) => void;
}) {
  const isFortune = lot.meta.id === "fortune";

  return (
    <article
      className={`rounded-2xl border p-4 space-y-2.5 transition-colors ${
        isFortune
          ? "border-[#E5C16C]/45 bg-[#E5C16C]/[0.08]"
          : "border-white/10 bg-[#0A1020]/90"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="font-serif text-lg font-semibold text-white">
              {lot.meta.name}
            </h4>
            <span className="font-mono text-xs tabular-nums text-cyan-200">
              {lot.display}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            House {lot.house} ({lot.houseArena}) · Ruler {lot.meta.rulerPlanet} ·{" "}
            <span className="font-mono">
              {lot.sect === "day" ? "Day" : "Night"}: {lot.formulaUsed}
            </span>
          </p>
        </div>

        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 tabular-nums">
          H{lot.house} · {lot.sign}
        </span>
      </div>

      <p className="text-xs leading-6 text-slate-200">
        {lot.personalPlacementReading}
      </p>

      {(lot.natalStarContacts.length > 0 || lot.liveTransits.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-slate-300 space-y-1">
          {lot.natalStarContacts.length > 0 && (
            <p className="text-[#F3D79B]">
              Aligned Fixed Star{lot.natalStarContacts.length > 1 ? "s" : ""}:{" "}
              {lot.natalStarContacts
                .map((s) => `${s.starName} (${s.orbDeg.toFixed(1)}°)`)
                .join(", ")}
            </p>
          )}
          {lot.liveTransits.length > 0 && (
            <p className="text-cyan-200">
              Active Today: {lot.liveTransits[0].realLifeTakeaway} (
              {lot.liveTransits[0].orbDeg.toFixed(1)}° orb)
            </p>
          )}
        </div>
      )}

      {onAskQuestion && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() =>
              onAskQuestion(
                `Explain my standalone natal ${lot.meta.name} at ${lot.display} in House ${lot.house} (${lot.houseArena}) in plain, practical terms.`
              )
            }
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
          >
            <MessageSquare size={12} />
            <span>Ask about {lot.meta.shortName} in House {lot.house} →</span>
          </button>
        </div>
      )}
    </article>
  );
}

export function NatalStarsAndLotsLayer({
  chart,
  onAskQuestion,
  defaultTab = "stars",
}: NatalStarsAndLotsLayerProps) {
  const [activeLayer, setActiveLayer] = useState<"stars" | "lots">(defaultTab);
  const [starScope, setStarScope] = useState<"key" | "all">("key");
  const [houseFilter, setHouseFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const data = useMemo(() => calculateEnergyStarsAndLots(chart), [chart]);

  const algol = useMemo(
    () => data.natalStarPositions.find((s) => s.starName === "Algol"),
    [data.natalStarPositions]
  );
  const fortune = useMemo(
    () => data.lots.find((l) => l.meta.id === "fortune"),
    [data.lots]
  );

  const filteredStars = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.natalStarPositions
      .filter((s) => {
        if (q) {
          const matches =
            s.starName.toLowerCase().includes(q) ||
            s.sign.toLowerCase().includes(q) ||
            s.houseArena.toLowerCase().includes(q) ||
            s.archetype.toLowerCase().includes(q) ||
            `house ${s.house}`.includes(q);
          if (!matches) return false;
        } else if (starScope === "key" && houseFilter === "all") {
          if (!s.isKeyMarker) return false;
        }
        if (houseFilter !== "all" && s.house !== houseFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.starName === "Algol") return -1;
        if (b.starName === "Algol") return 1;
        if (a.isRoyal !== b.isRoyal) return a.isRoyal ? -1 : 1;
        return b.natalConjunctions.length - a.natalConjunctions.length || a.house - b.house;
      });
  }, [data.natalStarPositions, query, starScope, houseFilter]);

  return (
    <section
      aria-label="Natal Fixed Stars and Arabic Lots Position Layer"
      className="rounded-3xl border border-white/10 bg-[#070B16]/95 p-5 shadow-2xl sm:p-7 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E5C16C]">
            Standalone Natal Position Layer · No Aspect Required
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-white sm:text-3xl">
            Where Every Fixed Star & Arabic Lot Lands in Your Chart
          </h2>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Every Fixed Star and Hermetic Arabic Lot carries direct meaning through the Sign and
            House it occupies—even when no planet forms an aspect to it.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0D1426] p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveLayer("stars")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeLayer === "stars"
                ? "bg-[#E5C16C] text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Star size={13} />
            <span>Fixed Stars ({data.natalStarPositions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("lots")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeLayer === "lots"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Compass size={13} />
            <span>Arabic Lots ({data.lots.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Quick Anchor Strip: Always Surface Algol & Lot of Fortune Up Front */}
      <div className="grid gap-3 md:grid-cols-2">
        {algol && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-950/15 p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                <AlertTriangle size={13} />
                Algol Sabotage Watch · House {algol.house}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-300">
                {algol.starDisplay}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">
              {algol.sabotageOrShadowRisk}
            </p>
          </div>
        )}

        {fortune ? (
          <div className="rounded-2xl border border-[#E5C16C]/35 bg-[#E5C16C]/[0.07] p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3D79B]">
                <Compass size={13} />
                Lot of Fortune · House {fortune.house}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-300">
                {fortune.display}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-200">
              {fortune.personalPlacementReading}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-950/15 p-4 text-xs text-amber-200">
            {data.lotsUnavailableReason}
          </div>
        )}
      </div>

      {/* FIXED STARS EXPLORER */}
      {activeLayer === "stars" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0D1426] p-1">
                <button
                  type="button"
                  onClick={() => setStarScope("key")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    starScope === "key"
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Key Markers & Contacts
                </button>
                <button
                  type="button"
                  onClick={() => setStarScope("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    starScope === "all"
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All 30 Fixed Stars
                </button>
              </div>

              <select
                aria-label="Filter stars by natal house"
                value={houseFilter}
                onChange={(e) =>
                  setHouseFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="rounded-lg border border-white/15 bg-[#0D1426] px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="all">All 12 Houses</option>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((h) => (
                  <option key={h} value={h}>
                    House {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Algol, Sirius, House 4..."
                className="w-full rounded-lg border border-white/15 bg-[#0D1426] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {filteredStars.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-xs text-slate-400">
              No catalog Fixed Stars match that filter. Clear the search or switch back to All 12 Houses.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredStars.map((star) => (
                <FixedStarRow
                  key={star.id}
                  star={star}
                  onAskQuestion={onAskQuestion}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ARABIC LOTS EXPLORER */}
      {activeLayer === "lots" && (
        <div className="space-y-4">
          {!data.lotsAvailable ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-xs text-amber-200">
              {data.lotsUnavailableReason}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.lots.map((lot) => (
                <ArabicLotRow
                  key={lot.meta.id}
                  lot={lot}
                  onAskQuestion={onAskQuestion}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
