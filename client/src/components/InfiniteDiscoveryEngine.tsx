import { useState, useMemo } from "react";
import {
  Sparkles,
  Compass,
  Star,
  Orbit,
  ArrowRight,
  ChevronRight,
  Eye,
  Layers,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Info,
  X,
  Search,
} from "lucide-react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";
import {
  FIXED_STARS,
  NAKSHATRAS,
  MANAZIL,
  formatLongitude,
  normalizeLongitude,
  overlay,
} from "../../../shared/hybrid";
import {
  ASTROLOGY_TECHNIQUE_REGISTRY,
  getTechniqueById,
} from "../../../shared/astrologyRegistry";
import {
  NAKSHATRA_METADATA,
  ARABIC_MANAZIL_METADATA,
} from "./SystematicDeconstructionRegistry";

interface InfiniteDiscoveryProps {
  chart: ChartResult;
  onSelectDrawer?: (drawerOrderOrId: number | string) => void;
  className?: string;
  compact?: boolean;
}

export interface DiscoveryItem {
  id: string;
  name: string;
  category: "Luminary" | "Personal" | "Social" | "Outer" | "Angle" | "Node" | "Lot";
  symbol: string;
  displayDegree: string;
  longitude: number;
  sign: string;
  house: number;
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  decan: string;
  nakshatra: {
    name: string;
    pada: number;
    ruler: string;
    deity: string;
    symbol: string;
  };
  manzil: {
    name: string;
    translation: string;
    quality: string;
  };
  seferYetzirahLetter?: {
    letter: string;
    name: string;
    quality: string;
  };
  aspects: Array<{
    target: string;
    aspect: string;
    orb: number;
  }>;
  what: string;
  why: string;
  how: string;
  consequence: {
    constructive: string;
    shadow: string;
  };
  meaning: string;
  relatedTechniqueIds: string[];
  drawerLink: number; // Order number in Systematic Deconstruction (1-25)
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const ELEMENT_MAP: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const MODALITY_MAP: Record<string, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Taurus: "Fixed", Gemini: "Mutable", Cancer: "Cardinal",
  Leo: "Fixed", Virgo: "Mutable", Libra: "Cardinal", Scorpio: "Fixed",
  Sagittarius: "Mutable", Capricorn: "Cardinal", Aquarius: "Fixed", Pisces: "Mutable",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "AC", "North Node": "☊", "South Node": "☋",
};

const YETZIRAH_DOUBLES: Record<string, { letter: string; name: string; quality: string }> = {
  Moon: { letter: "ב", name: "Bet", quality: "Wisdom / Folly" },
  Mars: { letter: "ג", name: "Gimel", quality: "Health / Disease" },
  Sun: { letter: "ד", name: "Dalet", quality: "Fertility / Desolation" },
  Venus: { letter: "כ", name: "Khaf", quality: "Life / Death" },
  Mercury: { letter: "פ", name: "Peh", quality: "Power / Servitude" },
  Saturn: { letter: "ר", name: "Resh", quality: "Peace / War" },
  Jupiter: { letter: "ת", name: "Tav", quality: "Grace / Indigence" },
};

export function InfiniteDiscoveryEngine({
  chart,
  onSelectDrawer,
  className = "",
  compact = false,
}: InfiniteDiscoveryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectModalItem, setInspectModalItem] = useState<DiscoveryItem | null>(null);

  const discoveryItems = useMemo<DiscoveryItem[]>(() => {
    if (!chart) return [];

    const bodies: ChartRow[] = [
      ...chart.movingBodies,
      ...(chart.ascendant ? [chart.ascendant] : []),
      ...(chart.northNode ? [chart.northNode] : []),
    ].filter((b): b is ChartRow => Boolean(b && Number.isFinite(b.longitude)));

    return bodies.map((body) => {
      const norm = normalizeLongitude(body.longitude);
      const signIdx = Math.floor(norm / 30);
      const sign = ZODIAC_SIGNS[signIdx];
      const element = ELEMENT_MAP[sign] || "Fire";
      const modality = MODALITY_MAP[sign] || "Cardinal";
      const houseNum = body.agentHouse || body.house || 1;

      // Nakshatra & Manzil overlays
      const nakName = body.overlay?.nakshatra || "Ashwini";
      const pada = body.overlay?.pada || 1;
      const nakMeta = NAKSHATRA_METADATA.find((m) => m.name === nakName) || NAKSHATRA_METADATA[0];

      const manzilName = body.overlay?.manzil || "Al-Sharatain";
      const manzilMeta = ARABIC_MANAZIL_METADATA.find((m) => m.name.includes(manzilName) || manzilName.includes(m.name)) || ARABIC_MANAZIL_METADATA[0];

      // Aspects
      const aspects: Array<{ target: string; aspect: string; orb: number }> = [];
      bodies.forEach((other) => {
        if (other.name === body.name) return;
        const diff = Math.abs(normalizeLongitude(body.longitude) - normalizeLongitude(other.longitude));
        const sep = Math.min(diff, 360 - diff);
        const checkAspect = (targetAngle: number, name: string) => {
          const orb = Math.abs(sep - targetAngle);
          if (orb <= 5) aspects.push({ target: other.name, aspect: name, orb });
        };
        checkAspect(0, "Conjunction");
        checkAspect(60, "Sextile");
        checkAspect(90, "Square");
        checkAspect(120, "Trine");
        checkAspect(180, "Opposition");
      });

      // Category
      let category: DiscoveryItem["category"] = "Personal";
      if (body.name === "Sun" || body.name === "Moon") category = "Luminary";
      else if (body.name === "Jupiter" || body.name === "Saturn") category = "Social";
      else if (body.name === "Uranus" || body.name === "Neptune" || body.name === "Pluto") category = "Outer";
      else if (body.name === "Ascendant") category = "Angle";
      else if (body.name.includes("Node")) category = "Node";

      // WHAT: Exact Astronomical Coordinates
      const degWithin = norm % 30;
      const d = Math.floor(degWithin);
      const m = Math.floor((degWithin - d) * 60);
      const displayDegree = `${d}°${String(m).padStart(2, "0")}′ ${sign}`;
      const what = `${body.name} is calculated at ${displayDegree} occupying House ${houseNum} in the ${element} ${modality} sign of ${sign}. It traverses Nakshatra ${nakName} (Pada ${pada}) and Arabic Manzil ${manzilName}.`;

      // WHY: Canon Knowledge
      const why = `In classical Firmament Canon, ${body.name} governs its core planetary archetype through ${sign}'s ${element} element. Nakshatra ruler ${nakMeta.ruler} and presiding deity ${nakMeta.deity} channel its subtle psychological instincts, while Manzil ${manzilMeta.name} (${manzilMeta.translation}) stamps it with the signature of "${manzilMeta.quality}".`;

      // HOW: Psychological & Behavioral Mechanics
      const how = `Under stress, this configuration operates through ${element === "Fire" ? "spontaneous action, creative assertion, and high courage" : element === "Earth" ? "pragmatic caution, resource consolidation, and steady endurance" : element === "Air" ? "conceptual analysis, communicative dialogue, and strategic detachment" : "intuitive empathy, emotional sensitivity, and boundary sanctuary"}. It anchors your experience in House ${houseNum}'s domain.`;

      // CONSEQUENCE: Constructive vs Shadow
      const consequence = {
        constructive: `Harnessing ${body.name} in ${sign} delivers exceptional ${nakMeta.quality.toLowerCase()}, sovereign clarity, and deliberate mastery over House ${houseNum}'s objectives.`,
        shadow: `When unintegrated or defensive, it risks overcompensating through ${element === "Fire" ? "impulsive pride or impatience" : element === "Earth" ? "rigidity, resistance to change, or fear of scarcity" : element === "Air" ? "overthinking, emotional avoidance, or scattered focus" : "defensive withdrawal, mood reactivity, or taking on others' burdens"}.`,
      };

      // MEANING: Full-Chart Synthesis
      const meaning = `${body.name} serves as a pivotal anchor in your living celestial architecture, linking ${body.overlay?.decan || "its elemental decan"} with the broader destiny arc of your chart.`;

      // Drawer link
      let drawerLink = 2; // Default to drawer 2 (Placements)
      if (body.name === "Sun" || body.name === "Moon" || body.name === "Ascendant") drawerLink = 1;

      return {
        id: `discovery-${body.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: body.name,
        category,
        symbol: PLANET_SYMBOLS[body.name] || "✧",
        displayDegree,
        longitude: body.longitude,
        sign,
        house: houseNum,
        element,
        modality,
        decan: body.overlay?.decan || `${sign} Decan`,
        nakshatra: {
          name: nakName,
          pada,
          ruler: nakMeta.ruler,
          deity: nakMeta.deity,
          symbol: nakMeta.symbol,
        },
        manzil: {
          name: manzilMeta.name,
          translation: manzilMeta.translation,
          quality: manzilMeta.quality,
        },
        seferYetzirahLetter: YETZIRAH_DOUBLES[body.name],
        aspects,
        what,
        why,
        how,
        consequence,
        meaning,
        relatedTechniqueIds: ["planetary-positions", "vedic-nakshatras", "arabic-manazil", "elemental-decans"],
        drawerLink,
      };
    });
  }, [chart]);

  const filteredItems = useMemo(() => {
    return discoveryItems.filter((item) => {
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Luminaries" && item.category === "Luminary") ||
        (activeFilter === "Personal" && (item.category === "Personal" || item.category === "Luminary")) ||
        (activeFilter === "Social & Outer" && (item.category === "Social" || item.category === "Outer")) ||
        (activeFilter === "Angles & Nodes" && (item.category === "Angle" || item.category === "Node"));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sign.toLowerCase().includes(q) ||
        item.nakshatra.name.toLowerCase().includes(q) ||
        item.manzil.name.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [discoveryItems, activeFilter, searchQuery]);

  const activeModal = inspectModalItem;

  return (
    <section
      aria-label="Infinite Discovery Engine"
      className={`rounded-3xl border border-amber-300/40 bg-gradient-to-b from-[#0B132B]/90 via-[#070B18]/95 to-[#030611] p-5 shadow-[0_0_35px_rgba(217,182,111,0.08)] backdrop-blur-xl sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
              The Absolute · Infinite Discovery Engine
            </p>
          </div>
          <h2 className="mt-1.5 font-serif text-2xl text-white sm:text-3xl font-semibold">
            Interactive Celestial Intelligence
          </h2>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Tap any planet, luminary, or lunar mansion to inspect its multi-layer doctrine: exact astronomical coordinates, ancient Canon rationale, behavioral manifestations, and full-chart integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs text-cyan-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>{discoveryItems.length} Connected Anchors</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["All", "Luminaries", "Personal", "Social & Outer", "Angles & Nodes"].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveFilter(category)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === category
                  ? "bg-amber-300/20 text-amber-200 border border-amber-300/60 shadow-[0_0_12px_rgba(217,182,111,0.2)]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search planets, signs, mansions..."
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Discovery Cards Grid */}
      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setInspectModalItem(item)}
            className="group relative cursor-pointer rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition-all duration-200 hover:border-amber-300/50 hover:bg-slate-900/80 hover:shadow-[0_0_24px_rgba(217,182,111,0.12)] space-y-3"
          >
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 font-serif text-lg font-bold text-amber-200 border border-white/10 group-hover:border-amber-300/40 group-hover:scale-105 transition-transform">
                  {item.symbol}
                </span>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-amber-200 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-300">
                    {item.displayDegree} · House {item.house}
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                {item.element} · {item.modality}
              </span>
            </div>

            {/* Mansions pill strip */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded bg-indigo-950/60 border border-indigo-400/30 px-2 py-0.5 text-indigo-200">
                Nakshatra: {item.nakshatra.name} (P{item.nakshatra.pada})
              </span>
              <span className="rounded bg-cyan-950/60 border border-cyan-400/30 px-2 py-0.5 text-cyan-200">
                Manzil: {item.manzil.name}
              </span>
            </div>

            {/* Teaser insight */}
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {item.what}
            </p>

            {/* Action footer */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-amber-300 font-semibold group-hover:text-amber-200">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>Tap to Deep-Dive</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Deep-Dive Window */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setInspectModalItem(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-300/50 bg-[#0A1024] p-6 shadow-[0_0_50px_rgba(217,182,111,0.2)] text-white space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl font-serif font-bold text-amber-200 border border-amber-400/40">
                  {activeModal.symbol}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl font-bold text-white">
                      {activeModal.name} in {activeModal.sign}
                    </h3>
                    <span className="rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] text-amber-200">
                      House {activeModal.house}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-cyan-300">
                    Exact Longitude: {activeModal.displayDegree} ({activeModal.longitude.toFixed(4)}°)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectModalItem(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: WHAT */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Compass className="h-3.5 w-3.5" />
                <span>1. WHAT: Astronomical Configuration</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{activeModal.what}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-300">
                <div className="rounded bg-white/5 p-2">
                  <span className="text-slate-400 block text-[10px]">Decan</span>
                  <strong>{activeModal.decan}</strong>
                </div>
                <div className="rounded bg-white/5 p-2">
                  <span className="text-slate-400 block text-[10px]">Nakshatra</span>
                  <strong>{activeModal.nakshatra.name} (P{activeModal.nakshatra.pada})</strong>
                </div>
                <div className="rounded bg-white/5 p-2">
                  <span className="text-slate-400 block text-[10px]">Arabic Manzil</span>
                  <strong>{activeModal.manzil.name}</strong>
                </div>
                <div className="rounded bg-white/5 p-2">
                  <span className="text-slate-400 block text-[10px]">Aspect Contacts</span>
                  <strong>{activeModal.aspects.length} close</strong>
                </div>
              </div>
            </div>

            {/* Section 2: WHY */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                <BookOpen className="h-3.5 w-3.5" />
                <span>2. WHY: Canon Rationale & Symbolic Lineage</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{activeModal.why}</p>
              {activeModal.seferYetzirahLetter && (
                <div className="mt-2 rounded-lg bg-indigo-950/40 border border-indigo-400/30 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-indigo-200 font-semibold">
                    <span>Sefer Yetzirah Double Letter: {activeModal.seferYetzirahLetter.letter} ({activeModal.seferYetzirahLetter.name})</span>
                    <span className="text-amber-300">{activeModal.seferYetzirahLetter.quality}</span>
                  </div>
                  <p className="text-slate-300 text-[10px]">
                    In authentic Kabbalistic cosmology, this letter governs the gateway between {activeModal.seferYetzirahLetter.quality.toLowerCase()} through your natal placement.
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: HOW & CONSEQUENCE */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Zap className="h-3.5 w-3.5" />
                <span>3. HOW: Psychological & Lived Manifestation</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{activeModal.how}</p>

              <div className="grid gap-2 sm:grid-cols-2 pt-2 text-[11px]">
                <div className="rounded-lg bg-emerald-950/30 border border-emerald-400/30 p-2.5 space-y-1">
                  <strong className="text-emerald-300 block">Constructive Power</strong>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    {activeModal.consequence.constructive}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-950/30 border border-rose-400/30 p-2.5 space-y-1">
                  <strong className="text-rose-300 block">Shadow / Friction Pattern</strong>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    {activeModal.consequence.shadow}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: MEANING & SYSTEMATIC DECONSTRUCTION LINK */}
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Layers className="h-3.5 w-3.5" />
                <span>4. MEANING: Total Chart Integration</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{activeModal.meaning}</p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                <span className="text-[11px] text-slate-400">
                  Connected to Systematic Deconstruction Drawer {activeModal.drawerLink}
                </span>

                {onSelectDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDrawer(activeModal.drawerLink);
                      setInspectModalItem(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 px-3.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 transition-all shadow-[0_0_15px_rgba(217,182,111,0.2)]"
                  >
                    <span>Inspect Drawer {activeModal.drawerLink}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
