import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  BookOpenText,
  Clock,
  Compass,
  Crown,
  Diamond,
  Eye,
  Flame,
  Grid,
  Heart,
  HelpCircle,
  History as HistoryIcon,
  Layers,
  LayoutGrid,
  MoonStar,
  Orbit,
  Sparkles,
  Star,
  Users,
  UserRound,
  Zap,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { SavedProfilePicker } from "@/components/SavedProfilePicker";

export default function ExplorePage() {
  const { chart, profile, setProfile } = useProfileSession();
  const [, navigate] = useLocation();
  const [selectedSystemModal, setSelectedSystemModal] = useState<string | null>(null);

  const ANCIENT_SYSTEMS = [
    {
      id: "gates",
      title: "Twelve Divine Gates",
      subtitle: "360° ZODIAC SECTORS",
      description: "Sign-by-sign celestial illumination across temporal house sectors and divine gates.",
      href: "/zodiac-readings",
      icon: Sparkles,
      color: "text-amber-300",
      borderColor: "border-amber-300/30",
      badge: "Interactive Gates",
    },
    {
      id: "nakshatras",
      title: "27 Vedic Nakshatras",
      subtitle: "LUNAR MANSION SYSTEM",
      description: "Ancient Indian sidereal lunar asterisms divided into 13°20' sectors and four padas each.",
      href: "/chart",
      icon: MoonStar,
      color: "text-indigo-300",
      borderColor: "border-indigo-300/30",
      badge: "Vedic Wisdom",
    },
    {
      id: "manzils",
      title: "28 Arabic Manzils",
      subtitle: "DESERT NAVIGATION ASTERISMS",
      description: "Classical Arabic lunar stations used for elemental timing, talismanic magic, and weather.",
      href: "/chart",
      icon: Compass,
      color: "text-cyan-300",
      borderColor: "border-cyan-300/30",
      badge: "Hermetic Canon",
    },
    {
      id: "xiu",
      title: "28 Chinese Xiu",
      subtitle: "FOUR HEAVENLY HERALDS",
      description: "Equatorial lunar lodges grouped under the Azure Dragon, Black Tortoise, White Tiger, and Vermilion Bird.",
      href: "/chart",
      icon: Eye,
      color: "text-rose-300",
      borderColor: "border-rose-300/30",
      badge: "Daoist Astronomy",
    },
    {
      id: "kabbalah",
      title: "Kabbalistic Sefer Yetzirah",
      subtitle: "TWENTY-TWO DIVINE LETTERS",
      description: "Correspondences of Hebrew sacred letters to planetary rulers, zodiac signs, and paths on the Tree of Life.",
      href: "/reading",
      icon: Crown,
      color: "text-violet-300",
      borderColor: "border-violet-300/30",
      badge: "Esoteric Tree",
    },
    {
      id: "decans",
      title: "36 Elemental Decans",
      subtitle: "EGYPTIAN HEAVENLY FACES",
      description: "10-degree subdivisions of the zodiac signs representing distinct archetypal sub-currents.",
      href: "/chart",
      icon: Layers,
      color: "text-emerald-300",
      borderColor: "border-emerald-300/30",
      badge: "Egyptian Doctrine",
    },
    {
      id: "stars",
      title: "Fixed Star Beacons",
      subtitle: "ROYAL STARS & CONSTELLATIONS",
      description: "High-magnitude galactic beacons (Sirius, Regulus, Aldebaran, Antares, Spica, Algol) in precise degree contact.",
      href: "/chart",
      icon: Star,
      color: "text-amber-200",
      borderColor: "border-amber-300/40",
      badge: "Stellar Beacons",
    },
  ];

  const OBSERVATORY_TOOLS = [
    {
      title: "3D Divine Sky Map",
      description: "Interactive real-time celestial sphere displaying constellations, orbital arcs, and your local horizon.",
      href: "/sky",
      icon: Orbit,
      badge: "3D Visualizer",
    },
    {
      title: "Planetary Hours Clock",
      description: "Chaldean planetary hour calculator based on exact solar dawn and dusk for your active transit location.",
      href: "/energy",
      icon: Clock,
      badge: "Timing Tool",
    },
    {
      title: "Astronomical Position Tables",
      description: "Precise degrees, speeds, house coordinates, and aspect orbs computed with high-accuracy ephemeris.",
      href: "/guide?tab=blueprint",
      icon: Grid,
      badge: "Ephemeris Data",
    },
    {
      title: "Life Story Biographical Chapters",
      description: "Annual profections, planetary returns, and chronological developmental epochs across your lifetime.",
      href: "/life-story",
      icon: BookOpenText,
      badge: "Biographical",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-24 pt-2 text-[#E8EDF7]">
      {/* Header */}
      <div className="space-y-2 border-b border-white/10 pb-5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-[#D9B66F]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#D9B66F]">
            Celestial Directory & Tools
          </p>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Explore The Firmament
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Access the complete suite of ancient astrological frameworks, specialized divination chambers, relationship synastry, and astronomical observatory instruments.
        </p>
      </div>

      {/* SECTION 1: FEATURED SPECIALIZED TOOLS (TOP PROMINENT CARDS) */}
      <section aria-label="Featured Tools" className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Priority Instruments</span>
          <h2 className="font-serif text-2xl text-white">Featured Divination & Relationship Suites</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Card 1: Horary Chamber */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-400/40 bg-[linear-gradient(135deg,rgba(30,27,75,.8),rgba(15,23,42,.95))] p-6 shadow-[0_12px_40px_rgba(79,70,229,.15)] transition-all hover:border-indigo-300/70 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <MoonStar size={26} />
              </div>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-200">
                Real-Time Divination
              </span>
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">Horary Astrology Chamber</h3>
              <p className="mt-1 text-xs text-indigo-200/80 font-mono uppercase tracking-wider">
                Ask a Question · Cast the Exact Sky Moment
              </p>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Traditional horary divination using strict medieval rules, significator rulers, planetary perfections, and strictures against judgment. Answers questions about love, career, missing items, or decisions.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/horary"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/50 bg-indigo-600/30 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-600/50 transition-colors"
              >
                <span>Open Horary Chamber</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Card 2: Synastry Studio */}
          <div className="relative overflow-hidden rounded-3xl border border-rose-400/40 bg-[linear-gradient(135deg,rgba(76,5,25,.7),rgba(15,23,42,.95))] p-6 shadow-[0_12px_40px_rgba(244,63,94,.15)] transition-all hover:border-rose-300/70 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
                <Heart size={26} />
              </div>
              <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200">
                Two-Chart Resonance
              </span>
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">Synastry Studio</h3>
              <p className="mt-1 text-xs text-rose-200/80 font-mono uppercase tracking-wider">
                Romantic, Business & Friendship Compatibility
              </p>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Superimpose two natal blueprints in dual-wheel or North Indian diamond projections. Calculate inter-aspect harmonies, house overlays, composite chemistry, and relationship archetypes.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/synastry"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/50 bg-rose-600/30 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-rose-600/50 transition-colors"
              >
                <span>Open Synastry Studio</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ANCIENT ASTROLOGY SYSTEMS */}
      <section aria-label="Ancient Astrology Systems" className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Classical Doctrines</span>
          <h2 className="font-serif text-2xl text-white">Ancient Astrology Systems</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            The Firmament synthesizes seven ancient traditions into unified, non-conflicting mathematical layers.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ANCIENT_SYSTEMS.map(sys => {
            const Icon = sys.icon;
            return (
              <Link
                key={sys.id}
                href={sys.href}
                className={`group rounded-2xl border ${sys.borderColor} bg-slate-950/70 p-5 transition-all hover:bg-slate-900/90 hover:scale-[1.01] flex flex-col justify-between space-y-3`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ${sys.color}`}>
                      <Icon size={19} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                      {sys.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                      {sys.title}
                    </h3>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
                      {sys.subtitle}
                    </p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {sys.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-amber-300 pt-2 border-t border-white/5">
                  <span>Explore system</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: OBSERVATORY TOOLS */}
      <section aria-label="Observatory Tools" className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Technical Instruments</span>
          <h2 className="font-serif text-2xl text-white">Observatory & Calculation Tools</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {OBSERVATORY_TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-[#0d1627]/80 p-5 transition-all hover:border-cyan-300/40 hover:bg-[#101b30]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <Icon size={22} />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                      {tool.title}
                    </h3>
                    <span className="rounded-full bg-cyan-400/10 border border-cyan-300/20 px-2 py-0.5 text-[9px] font-semibold text-cyan-300">
                      {tool.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: PERSONAL LIBRARY */}
      <section aria-label="Personal Library" className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Archival Records</span>
          <h2 className="font-serif text-2xl text-white">Personal Library & History</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 border border-amber-300/20">
                <UserRound size={20} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-white">Saved Birth Profiles</h3>
                <p className="text-xs text-slate-400">Switch or manage stored chart coordinates</p>
              </div>
            </div>
            <SavedProfilePicker
              onLoad={(p) => {
                setProfile(p);
                navigate("/chart");
              }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-300/20">
                  <HistoryIcon size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-white">Question & Chart Archives</h3>
                  <p className="text-xs text-slate-400">Past Horary questions and saved interpretations</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-2">
                Revisit previously cast horary divination answers, query logs, saved synastry partnerships, and past cosmic weather readings.
              </p>
            </div>

            <Link
              href="/history"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/40 bg-fuchsia-400/15 px-4 py-2.5 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-400/25 transition-colors"
            >
              <span>View Archival History</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
