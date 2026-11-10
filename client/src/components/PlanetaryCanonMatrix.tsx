import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Compass,
  Heart,
  AlertTriangle,
  Award,
  Layers,
  Moon,
  Scale,
  Search,
  Sparkles,
  Star,
  Zap,
  Info,
} from "lucide-react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";
import {
  FIXED_STARS,
  ELEMENTAL_DECAN_SIGNS,
  normalizeLongitude,
  overlay,
} from "../../../shared/hybrid";
import {
  getPlanetInHouseKnowledge,
  type PlanetInHouseKnowledgeRecord,
} from "../../../server/astrologyKnowledge/canon/planetInHouseInterpretations";
import {
  getJyotishHouseGroups,
  type JyotishHouseGroup,
} from "../../../server/astrologyKnowledge/canon/jyotishHouseGroups";
import {
  NAKSHATRA_METADATA,
  ARABIC_MANAZIL_METADATA,
  CHINESE_XIU_METADATA,
} from "./SystematicDeconstructionRegistry";

export interface PlanetaryCanonMatrixProps {
  chart: ChartResult;
  onInterpretBody?: (bodyName: string) => void;
  defaultExpanded?: boolean;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  "North Node": "☊",
  "South Node": "☋",
  Rahu: "☊",
  Ketu: "☋",
  Ascendant: "↑",
  Midheaven: "MC",
};

const DIGNITY_RULES: Record<
  string,
  { domicile: string[]; exaltation: string; fall: string; detriment: string[] }
> = {
  Sun: { domicile: ["Leo"], exaltation: "Aries", fall: "Libra", detriment: ["Aquarius"] },
  Moon: { domicile: ["Cancer"], exaltation: "Taurus", fall: "Scorpio", detriment: ["Capricorn"] },
  Mercury: { domicile: ["Gemini", "Virgo"], exaltation: "Virgo", fall: "Pisces", detriment: ["Sagittarius", "Pisces"] },
  Venus: { domicile: ["Taurus", "Libra"], exaltation: "Pisces", fall: "Virgo", detriment: ["Aries", "Scorpio"] },
  Mars: { domicile: ["Aries", "Scorpio"], exaltation: "Capricorn", fall: "Cancer", detriment: ["Taurus", "Libra"] },
  Jupiter: { domicile: ["Sagittarius", "Pisces"], exaltation: "Cancer", fall: "Capricorn", detriment: ["Gemini", "Virgo"] },
  Saturn: { domicile: ["Capricorn", "Aquarius"], exaltation: "Libra", fall: "Aries", detriment: ["Cancer", "Leo"] },
};

function signAt(lon: number): string {
  const norm = normalizeLongitude(lon);
  return SIGNS[Math.floor(norm / 30)];
}

function glyphAt(lon: number): string {
  const norm = normalizeLongitude(lon);
  return SIGN_GLYPHS[Math.floor(norm / 30)];
}

function degreeFmt(lon: number): string {
  const norm = normalizeLongitude(lon);
  const within = norm % 30;
  const deg = Math.floor(within);
  const min = Math.floor((within - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

type BodyCategory = "all" | "luminaries" | "personal" | "gurus" | "nodes" | "outer";

export function PlanetaryCanonMatrix({
  chart,
  onInterpretBody,
  defaultExpanded = true,
}: PlanetaryCanonMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BodyCategory>("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => ({
    Sun: true,
    Moon: true,
    Ascendant: true,
    Mars: false,
    Venus: false,
    Jupiter: false,
    Saturn: false,
  }));

  const toggleExpand = (name: string) => {
    setExpandedCards(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    allDeconstructedBodies.forEach(b => (next[b.name] = true));
    setExpandedCards(next);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  // Extract and deconstruct all chart bodies
  const allDeconstructedBodies = useMemo(() => {
    if (!chart) return [];
    const bodies: ChartRow[] = [
      ...chart.movingBodies,
      ...(chart.ascendant ? [chart.ascendant] : []),
      ...(chart.northNode ? [chart.northNode] : []),
      ...(chart.southNode ? [chart.southNode] : []),
    ].filter((b): b is ChartRow => Boolean(b && Number.isFinite(b.longitude)));

    return bodies.map(body => {
      const lon = normalizeLongitude(body.longitude);
      const sign = signAt(lon);
      const glyph = glyphAt(lon);
      const degText = degreeFmt(lon);
      const houseNum = body.agentHouse ?? body.house ?? 1;
      const godHouseNum = body.godHouse ?? (Math.floor(lon / 30) + 1);

      // 1. Vedic Planet-in-House Canon Record
      const canonRecord = getPlanetInHouseKnowledge(body.name, houseNum);

      // 2. Bhava Groupings (Kendra, Trikona, Dusthana, Upachaya, etc.)
      const bhavaGroups = getJyotishHouseGroups(houseNum);

      // 3. Essential Dignity
      const dignityRule = DIGNITY_RULES[body.name];
      let dignity = "Peregrine";
      let dignityClass = "border-slate-700 bg-slate-900/60 text-slate-300";
      if (dignityRule) {
        if (dignityRule.domicile.includes(sign)) {
          dignity = "Domicile (Ruler / Swa-kshetra)";
          dignityClass = "border-amber-400/40 bg-amber-500/15 text-amber-200 font-bold";
        } else if (dignityRule.exaltation === sign) {
          dignity = "Exalted (Ucha)";
          dignityClass = "border-cyan-400/40 bg-cyan-500/15 text-cyan-200 font-bold";
        } else if (dignityRule.fall === sign) {
          dignity = "Fall (Neecha)";
          dignityClass = "border-rose-500/40 bg-rose-500/15 text-rose-200";
        } else if (dignityRule.detriment.includes(sign)) {
          dignity = "Detriment";
          dignityClass = "border-amber-700/40 bg-amber-900/15 text-amber-300";
        }
      }

      // 4. Lunar Mansions (Vedic Nakshatra, Arabic Manzil, Chinese Xiu)
      const ov = body.overlay ?? overlay(lon);
      const nakshatraIndex = Math.floor(lon / (360 / 27)) % 27;
      const nakshatraDef = NAKSHATRA_METADATA[nakshatraIndex];
      const manzilIndex = Math.floor(lon / (360 / 28)) % 28;
      const manzilDef = ARABIC_MANAZIL_METADATA[manzilIndex];
      const xiuDef = CHINESE_XIU_METADATA[manzilIndex % 28];

      // 5. Decan
      const signIndex = SIGNS.indexOf(sign as (typeof SIGNS)[number]);
      const signDegree = lon % 30;
      const decanIndex = Math.min(2, Math.floor(signDegree / 10));
      const decanSigns = signIndex >= 0 ? ELEMENTAL_DECAN_SIGNS[signIndex] : [sign, sign, sign];
      const decanSubSign = decanSigns[decanIndex];

      // 6. Graha Drishti (Parashari special aspects cast)
      const specialDrishti: string[] = [];
      if (body.name === "Mars") {
        specialDrishti.push("4th Bhava (Direct Impact / Confrontation)", "8th Bhava (Crisis & Transformation)");
      } else if (body.name === "Jupiter") {
        specialDrishti.push("5th Bhava (Grace & Intellect)", "9th Bhava (Higher Dharma & Fortune)");
      } else if (body.name === "Saturn") {
        specialDrishti.push("3rd Bhava (Labor & Effort)", "10th Bhava (Career & Accountability)");
      } else if (body.name === "North Node" || body.name === "Rahu") {
        specialDrishti.push("5th Bhava (Obsessive Genius)", "9th Bhava (Unconventional Destiny)");
      }

      // 7. Ptolemaic Aspects to other bodies
      const aspectsToOthers = chart.movingBodies
        .filter(other => other.name !== body.name)
        .map(other => {
          const diff = Math.abs(normalizeLongitude(body.longitude) - normalizeLongitude(other.longitude));
          const angle = diff > 180 ? 360 - diff : diff;
          const aspectDefs = [
            { name: "Conjunction", deg: 0, orbMax: 7 },
            { name: "Sextile", deg: 60, orbMax: 4.5 },
            { name: "Square", deg: 90, orbMax: 6 },
            { name: "Trine", deg: 120, orbMax: 6 },
            { name: "Opposition", deg: 180, orbMax: 7 },
          ];
          for (const a of aspectDefs) {
            const orb = Math.abs(angle - a.deg);
            if (orb <= a.orbMax) {
              return {
                otherName: other.name,
                aspect: a.name,
                orb: Math.round(orb * 100) / 100,
                nature: a.name === "Square" || a.name === "Opposition" ? "friction" : "harmony",
              };
            }
          }
          return null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      // 8. Fixed Star Conjunctions within 2.2°
      const starContacts = FIXED_STARS.map(starTuple => {
        const [starName, starLon] = starTuple;
        const diff = Math.abs(lon - starLon);
        const orb = diff > 180 ? 360 - diff : diff;
        return { name: starName, longitude: starLon, orb };
      }).filter(s => s.orb <= 2.2);

      return {
        ...body,
        sign,
        glyph,
        degText,
        houseNum,
        godHouseNum,
        canonRecord,
        bhavaGroups,
        dignity,
        dignityClass,
        overlay: ov,
        nakshatraDef,
        manzilDef,
        xiuDef,
        decanIndex: decanIndex + 1,
        decanSubSign,
        specialDrishti,
        aspectsToOthers,
        starContacts,
      };
    });
  }, [chart]);

  // Filtered bodies based on Category and Search Query
  const filteredBodies = useMemo(() => {
    return allDeconstructedBodies.filter(b => {
      // Category filter
      if (selectedCategory === "luminaries" && b.name !== "Sun" && b.name !== "Moon") return false;
      if (selectedCategory === "personal" && !["Mercury", "Venus", "Mars"].includes(b.name)) return false;
      if (selectedCategory === "gurus" && !["Jupiter", "Saturn"].includes(b.name)) return false;
      if (selectedCategory === "nodes" && !["North Node", "South Node", "Rahu", "Ketu"].includes(b.name)) return false;
      if (selectedCategory === "outer" && !["Uranus", "Neptune", "Pluto"].includes(b.name)) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesSign = b.sign.toLowerCase().includes(q);
        const matchesHouse = `house ${b.houseNum}`.includes(q) || `h${b.houseNum}`.includes(q);
        const matchesCanon =
          b.canonRecord?.core.toLowerCase().includes(q) ||
          b.canonRecord?.career.toLowerCase().includes(q) ||
          b.canonRecord?.vedic.toLowerCase().includes(q) ||
          b.canonRecord?.gift.toLowerCase().includes(q);
        const matchesNakshatra = b.nakshatraDef?.name.toLowerCase().includes(q);
        return matchesName || matchesSign || matchesHouse || matchesCanon || matchesNakshatra;
      }

      return true;
    });
  }, [allDeconstructedBodies, selectedCategory, searchQuery]);

  return (
    <section
      aria-label="Planetary Method Deconstruction and Vedic Canon Matrix"
      className="rounded-3xl border border-[#D9B66F]/40 bg-[linear-gradient(145deg,#070B16_0%,#0E1428_50%,#151B38_100%)] p-5 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.85)] sm:p-7"
    >
      {/* SECTION HEADER */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#D9B66F]">
            <BookOpen className="h-4 w-4 text-[#D9B66F]" />
            <span>FIRMAMENT CANON · 144 PLANET-IN-HOUSE REVELATIONS</span>
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Planetary Method Deconstruction & Vedic Canon
          </h2>
          <p className="max-w-2xl text-xs text-slate-300 leading-relaxed sm:text-sm">
            Every celestial placement deconstructed across <strong>classical Vedic Jyotish</strong> (BPHS, Phaladeepika, Saravali), 
            <strong>27 Nakshatras</strong>, <strong>28 Arabic Manzils</strong>, <strong>Elemental Decans</strong>, 
            <strong>Graha Drishti</strong>, and <strong>Bhava Potency</strong> — ready for unified synthesis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: "all", label: "All Bodies" },
            { id: "luminaries", label: "Luminaries (☉ ☽)" },
            { id: "personal", label: "Personal (☿ ♀ ♂)" },
            { id: "gurus", label: "Great Gurus (♃ ♄)" },
            { id: "nodes", label: "Lunar Nodes (☊ ☋)" },
            { id: "outer", label: "Outer Planets (♅ ♆ ♇)" },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as BodyCategory)}
              className={`rounded-xl px-3 py-1.5 font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#D9B66F] text-black font-bold shadow-[0_0_14px_rgba(217,182,111,0.35)]"
                  : "border border-white/10 bg-black/40 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search planet, sign, house, karma..."
            className="w-full rounded-xl border border-white/10 bg-black/50 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>
      </div>

      {/* PLANETARY CANON CARDS LIST */}
      <div className="mt-6 space-y-4">
        {filteredBodies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-slate-400">
            <Info className="mx-auto h-6 w-6 text-slate-500 mb-2" />
            <p className="text-sm font-medium">No planetary placements match your query.</p>
          </div>
        ) : (
          filteredBodies.map(body => {
            const isExpanded = expandedCards[body.name] ?? false;
            const canon = body.canonRecord;
            const glyph = PLANET_GLYPHS[body.name] || "✦";

            return (
              <div
                key={body.name}
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 transition-all hover:border-[#D9B66F]/50 shadow-lg"
              >
                {/* CARD SUMMARY HEADER */}
                <div
                  onClick={() => toggleExpand(body.name)}
                  className="flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Planet Icon & Glyph */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D9B66F]/40 bg-gradient-to-br from-[#D9B66F]/20 to-violet-900/40 text-xl font-bold text-[#D9B66F] shadow-[0_0_16px_rgba(217,182,111,0.2)]">
                      {glyph}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-white sm:text-xl">
                          {body.name}
                        </h3>
                        {canon?.vedic && (
                          <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200">
                            {canon.vedic.split("—")[0].trim()}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${body.dignityClass}`}>
                          {body.dignity.split("(")[0].trim()}
                        </span>
                        {body.retrograde && (
                          <span className="rounded-full bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                            Rx (Retrograde)
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="font-semibold text-white">
                          {body.degText} {body.sign} {body.glyph}
                        </span>
                        <span>·</span>
                        <span className="text-cyan-300 font-medium">House {body.houseNum}</span>
                        <span>·</span>
                        <span className="text-slate-400">God H{body.godHouseNum}</span>
                        {body.bhavaGroups.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-amber-200/90 font-medium">
                              {body.bhavaGroups.map(g => g.name).join(" / ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Expand Icon */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {onInterpretBody && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onInterpretBody(body.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-violet-400/40 bg-violet-950/50 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-900/60 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                        <span>Master Interpret</span>
                      </button>
                    )}

                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 group-hover:text-white">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE DECONSTRUCTION DOSSIER */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/40 p-4 sm:p-6 space-y-6">
                    {/* CANONICAL VEDIC READING CALLOUT */}
                    {canon && (
                      <div className="rounded-2xl border border-[#D9B66F]/30 bg-gradient-to-br from-[#D9B66F]/10 via-black/60 to-purple-950/20 p-4 sm:p-5 shadow-inner space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#D9B66F]" />
                            <strong className="text-xs uppercase tracking-wider text-[#D9B66F]">
                              Authoritative Canon Doctrine: {canon.domain}
                            </strong>
                          </div>
                          <span className="text-[11px] font-mono text-cyan-300">
                            Classical Jyotish Attribution
                          </span>
                        </div>

                        <p className="text-sm font-medium leading-relaxed text-slate-100">
                          {canon.core}
                        </p>

                        {canon.vedic && (
                          <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-xs text-slate-300 flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 text-cyan-300 mt-0.5" />
                            <span>
                              <strong className="text-white">Vedic Qualification:</strong> {canon.vedic}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4 ARCHITECTURAL PILLARS (Career, Relationships, Challenge, Gift) */}
                    {canon && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <Briefcase className="h-3.5 w-3.5 text-cyan-300" />
                          <span>Core Life Arenas & Karmic Manifestations</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {/* 1. Career & Vocation */}
                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                              <Briefcase className="h-3.5 w-3.5" />
                              <span>Vocation & Authority</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {canon.career}
                            </p>
                          </div>

                          {/* 2. Relationships */}
                          <div className="rounded-xl border border-pink-400/20 bg-pink-950/20 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                              <Heart className="h-3.5 w-3.5" />
                              <span>Relational Dynamics</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {canon.relationships}
                            </p>
                          </div>

                          {/* 3. Karmic Challenge */}
                          <div className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Karmic Friction & Pitfall</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {canon.challenge}
                            </p>
                          </div>

                          {/* 4. Core Gift */}
                          <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                              <Award className="h-3.5 w-3.5" />
                              <span>Innate Divine Gift</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {canon.gift}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* METHOD FORMULAS & DEEP MULTI-LAYER ATTRIBUTES */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <Layers className="h-3.5 w-3.5 text-violet-300" />
                        <span>Systematic Deconstruction · All Lined-Up Methods</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Vedic Nakshatra */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Compass className="h-3.5 w-3.5 text-cyan-300" />
                              Vedic Nakshatra
                            </span>
                            <span className="text-cyan-300 font-mono">Pada {body.overlay.pada}</span>
                          </div>
                          <p className="text-sm font-bold text-cyan-100">
                            {body.nakshatraDef?.name || body.overlay.nakshatra}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Deity: <strong className="text-slate-200">{body.nakshatraDef?.deity || "Presiding Astral Entity"}</strong>
                            {" · "}Ruler: <strong className="text-slate-200">{body.nakshatraDef?.ruler || body.overlay.nakshatraRuler || "Vedic Lord"}</strong>
                          </p>
                        </div>

                        {/* Arabic Manzil */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Moon className="h-3.5 w-3.5 text-violet-300" />
                              Arabic Manzil
                            </span>
                            <span className="text-violet-300 font-mono">Station #{body.manzilDef?.index || 1}</span>
                          </div>
                          <p className="text-sm font-bold text-violet-100">
                            {body.manzilDef?.name || body.overlay.manzil}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Meaning: <strong className="text-slate-200">{body.manzilDef?.translation || "Lunar Station"}</strong>
                            {" · "}Quality: <strong className="text-slate-200">{body.manzilDef?.quality || "Astrometeorological"}</strong>
                          </p>
                        </div>

                        {/* Elemental Decan */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5 text-amber-300" />
                              Elemental Decan
                            </span>
                            <span className="text-amber-300 font-mono">Face {body.decanIndex} of 3</span>
                          </div>
                          <p className="text-sm font-bold text-amber-100">
                            {body.decanSubSign} Sub-Ruler
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Triplicity: <strong className="text-slate-200">{body.sign} Family</strong>
                            {" · "}Span: <strong className="text-slate-200">{(body.decanIndex - 1) * 10}° – {body.decanIndex * 10}°</strong>
                          </p>
                        </div>

                        {/* Bhava Potency & Lordship */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Scale className="h-3.5 w-3.5 text-emerald-300" />
                              Bhava Classification
                            </span>
                            <span className="text-emerald-300 font-mono">House {body.houseNum}</span>
                          </div>
                          <p className="text-sm font-bold text-emerald-100">
                            {body.bhavaGroups.map(g => g.name).join(", ") || "Standard Bhava"}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {body.bhavaGroups[0]?.meaning || "Life arena operational sector."}
                          </p>
                        </div>

                        {/* Graha Drishti (Special Aspects Cast) */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5 text-amber-300" />
                              Graha Drishti (Cast)
                            </span>
                            <span className="text-amber-300 font-mono">Vedic Aspects</span>
                          </div>
                          <p className="text-xs text-slate-200">
                            {body.specialDrishti.length > 0
                              ? body.specialDrishti.join(" · ")
                              : "Standard 7th Full Aspect cast to opposing house."}
                          </p>
                        </div>

                        {/* Major Ptolemaic Aspects Received */}
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                              Sacred Geometry
                            </span>
                            <span className="text-cyan-300 font-mono">{body.aspectsToOthers.length} Contacts</span>
                          </div>
                          <p className="text-xs text-slate-200">
                            {body.aspectsToOthers.length > 0
                              ? body.aspectsToOthers.slice(0, 3).map(a => `${a.aspect} ${a.otherName} (${a.orb}°) `).join("· ")
                              : "No tight major aspects under 6° orb."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* FIXED STAR CONJUNCTIONS (If within 2.2°) */}
                    {body.starContacts.length > 0 && (
                      <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-3 text-xs text-amber-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Star className="h-3.5 w-3.5 text-amber-300" />
                          <span>Fixed Star Galactic Conjunction (&lt; 2.2° orb):</span>
                        </div>
                        {body.starContacts.map(sc => (
                          <p key={sc.name} className="text-[11px] text-slate-300">
                            Exact alignment with <strong className="text-white">{sc.name}</strong> at {degreeFmt(sc.longitude)} (orb {sc.orb.toFixed(2)}°).
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER EPISTEMIC STATEMENT */}
      <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="text-white">Canon Grounding:</strong> 108 Vedic records attributed to Brihat Parashara Hora Shastra, Phaladeepika, and Saravali. 
          36 modern outer planet records represent contemporary astrological synthesis.
        </p>
        <span className="text-cyan-300 font-mono shrink-0">
          Fixed Aldebaran 15° Taurus Frame
        </span>
      </div>
    </section>
  );
}
