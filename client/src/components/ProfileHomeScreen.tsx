import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Compass,
  Diamond,
  Heart,
  Moon,
  MoonStar,
  Orbit,
  Pencil,
  Send,
  Sparkles,
  Sun,
  Zap,
  Flame,
  ShieldCheck,
  ChevronRight,
  Layers,
  Users,
} from "lucide-react";
import { CelestialOrb } from "@/components/CelestialOrb";
import { DiamondChart } from "@/components/DiamondChart";
import { ChartWheel } from "@/components/ChartWheel";
import { TransitLocationBar } from "@/components/TransitLocationBar";
import { PersonalDiscoveryCarousel } from "@/components/PersonalDiscoveryCarousel";
import { ProfileSwitcherModal } from "@/components/ProfileSwitcherModal";
import { AbsoluteTheme, EnergyStatusCard, StatePanel } from "@/components/absolute-ui";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import type { UserProfileData } from "@/components/NatalProfileBuilder";
import type { ChartResult, TransitContact } from "../../../server/astronomy";
import { aspectWeightMultiplier } from "../../../shared/chartRules";

type ProfileHomeScreenProps = {
  profile: UserProfileData;
  chart: ChartResult | null;
  calculating: boolean;
  onEditProfile: () => void;
  onSwitchProfile: () => void;
  onRefreshTransits?: () => void;
  savedProfiles?: UserProfileData[];
  onLoadProfile?: (profile: UserProfileData) => void;
};

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const DEGREE = (longitude: number) => {
  const normalized = ((longitude % 360) + 360) % 360;
  const within = normalized % 30;
  const degrees = Math.floor(within);
  const minutes = Math.floor((within - degrees) * 60 + 0.00001);
  const signIndex = Math.floor(normalized / 30);
  return `${degrees}°${String(minutes).padStart(2, "0")}′ ${SIGN_GLYPHS[signIndex]}`;
};

const ELEMENTAL_DECANS: Record<string, string[]> = {
  Aries: ["Aries", "Leo", "Sagittarius"],
  Taurus: ["Taurus", "Virgo", "Capricorn"],
  Gemini: ["Gemini", "Libra", "Aquarius"],
  Cancer: ["Cancer", "Scorpio", "Pisces"],
  Leo: ["Leo", "Sagittarius", "Aries"],
  Virgo: ["Virgo", "Capricorn", "Taurus"],
  Libra: ["Libra", "Aquarius", "Gemini"],
  Scorpio: ["Scorpio", "Pisces", "Cancer"],
  Sagittarius: ["Sagittarius", "Aries", "Leo"],
  Capricorn: ["Capricorn", "Taurus", "Virgo"],
  Aquarius: ["Aquarius", "Gemini", "Libra"],
  Pisces: ["Pisces", "Cancer", "Scorpio"],
};

function signAt(longitude: number | undefined): string {
  return typeof longitude === "number" && Number.isFinite(longitude)
    ? SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]
    : "Unavailable";
}

const MAX_ORB = 5;
const aspectFlow: Record<TransitContact["aspect"], number> = {
  trine: 1,
  sextile: 1,
  square: -1,
  opposition: -1,
  conjunction: 0,
  semisextile: 1,
  semisquare: -1,
  sesquiquadrate: -1,
  quincunx: 0,
};

const percentWeight = (orb: number) =>
  orb > MAX_ORB ? 0 : orb <= 1.25 ? 100 : orb <= 2.5 ? 80 : orb <= 3.75 ? 60 : 40;

export function ProfileHomeScreen({
  profile,
  chart,
  calculating,
  onEditProfile,
}: ProfileHomeScreenProps) {
  const [, navigate] = useLocation();
  const { savedProfiles } = useProfileSession();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [activeSignal, setActiveSignal] = useState<"Sun" | "Moon" | "Ascendant" | null>(null);
  const [quickQuestion, setQuickQuestion] = useState("");
  const [chartMode, setChartMode] = useState<"diamond" | "wheel">("diamond");

  const sun = chart?.movingBodies?.find((body) => body.name === "Sun");
  const moon = chart?.movingBodies?.find((body) => body.name === "Moon");
  const asc = chart?.ascendant;

  const signals = [
    {
      title: "Sun" as const,
      value: signAt(sun?.longitude),
      caption: "Core Divine Purpose",
      Icon: Sun,
      tint: "text-[#D9B66F]",
      border: "border-[#D9B66F]/40",
      glow: "shadow-[0_0_16px_rgba(217,182,111,0.2)]",
      source: sun,
    },
    {
      title: "Moon" as const,
      value: signAt(moon?.longitude),
      caption: "Intuitive Sanctuary",
      Icon: Moon,
      tint: "text-[#8B5CF6]",
      border: "border-[#8B5CF6]/40",
      glow: "shadow-[0_0_16px_rgba(139,92,246,0.2)]",
      source: moon,
    },
    {
      title: "Ascendant" as const,
      value: chart?.agentViewAvailable ? signAt(asc?.longitude) : "Aligned",
      caption: "Incarnate Horizon",
      Icon: Compass,
      tint: "text-[#22D3EE]",
      border: "border-[#22D3EE]/40",
      glow: "shadow-[0_0_16px_rgba(34,211,238,0.2)]",
      source: chart?.agentViewAvailable ? asc : undefined,
    },
  ];

  // Comprehensive Energy Snapshot calculation
  const energySnapshot = useMemo(() => {
    if (!chart || chart.readingScope === "natal") return null;
    const contacts = (chart.transits || []).flatMap((body) =>
      (body?.natalContacts || [])
        .filter((contact) => Number.isFinite(contact.orb) && contact.orb <= MAX_ORB)
        .map((contact) => ({
          ...contact,
          transit: body.name,
          strength: Math.round(percentWeight(contact.orb) * (contact.weightMultiplier ?? aspectWeightMultiplier(contact.aspect))),
        }))
    );

    const flowContacts = contacts.filter((c) => aspectFlow[c.aspect] === 1);
    const frictionContacts = contacts.filter((c) => aspectFlow[c.aspect] === -1);
    const flow = flowContacts.reduce((sum, c) => sum + c.strength, 0);
    const friction = frictionContacts.reduce((sum, c) => sum + c.strength, 0);
    const total = flow + friction || 1;
    const flowPct = Math.round((flow / total) * 100);
    const frictionPct = 100 - flowPct;

    const signal =
      !contacts.length
        ? "Equilibrium"
        : flow > friction * 1.25
        ? "Harmonious Flow"
        : friction > flow * 1.25
        ? "Dynamic Friction"
        : "Balanced Synthesis";

    // Find tightest aspect for next peak calculated window
    const tightest = [...contacts].sort((a, b) => a.orb - b.orb)[0];
    const nextShiftDesc = tightest
      ? `Transit ${tightest.transit} ${tightest.aspect} natal ${tightest.natalName} (orb ${tightest.orb.toFixed(2)}°)`
      : "Moon ingress transition approaching in ~14h";

    return {
      contactsCount: contacts.length,
      flowPct,
      frictionPct,
      signal,
      nextShiftDesc,
      tightest,
    };
  }, [chart]);

  const handleLaunchHorary = () => {
    if (quickQuestion.trim()) {
      try {
        sessionStorage.setItem("fg:horary-prefill-question", quickQuestion.trim());
      } catch {}
    }
    navigate("/horary");
  };

  // Concise personalized cosmic insight from chart
  const cosmicInsight = useMemo(() => {
    if (!chart) return "Aligning your natal coordinates with the fixed stars...";
    const sunSign = signAt(sun?.longitude);
    const moonSign = signAt(moon?.longitude);
    return `Anchored in ${sunSign} solar vitality with a ${moonSign} emotional sanctuary, your firmament code commands creative sovereignty.`;
  }, [chart, sun, moon]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-24 pt-2 text-[#E8EDF7]">
      {/* SECTION 1: HERO — THE OBSERVATORY EXPERIENCE */}
      <section
        aria-label="Welcome and Celestial Identity"
        className="relative overflow-hidden rounded-3xl border border-[#D9B66F]/30 bg-[linear-gradient(135deg,#080B14_0%,#101628_60%,#141932_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:p-8"
      >
        {/* Background Ambient Radiance */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]"
          aria-hidden="true"
        />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#D9B66F]">
                THE ABSOLUTE · CELESTIAL OBSERVATORY
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono text-cyan-300">Aldebaran Fixed Framework</span>
            </div>

            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Welcome, {profile.name}
              </h1>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                Natal anchor: {profile.date} at {profile.birthTimeUnknown ? "12:00 PM (Untimed)" : profile.time} in{" "}
                <strong className="text-white">{profile.location}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
              <div className="flex items-start gap-2.5">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-[#D9B66F]" />
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {cosmicInsight}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-950/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/60 transition-all active:scale-95 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
              >
                <Users size={13} className="text-cyan-300" />
                <span>Switch / Load Profile ({savedProfiles.length})</span>
              </button>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9B66F]/50 bg-[#D9B66F]/10 px-4 py-2 text-xs font-semibold text-[#D9B66F] hover:bg-[#D9B66F]/20 transition-all active:scale-95"
              >
                <Pencil size={13} />
                <span>Adjust Birth Data</span>
              </Link>
              <div className="hidden sm:block">
                <TransitLocationBar variant="pill" />
              </div>
            </div>
          </div>

          {/* Animated Gyroscopic Celestial Orb */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <CelestialOrb size={220} intensity="high" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[10px] font-mono tracking-wider text-slate-400">
                LIVE SKY SYNCHRONIZATION
              </div>
            </div>
          </div>
        </div>

        {/* Big Three Divine Signals Cards */}
        <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-[#080B14]/80 p-4 sm:p-5 backdrop-blur-lg">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#D9B66F]" />
              <h2 className="font-serif text-sm sm:text-base font-bold text-white">
                Your Three Divine Signals (Big Three)
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Tap for exact degrees & decans</span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/10">
            {signals.map(({ title, value, caption, Icon, tint, border, glow, source }) => (
              <button
                type="button"
                key={title}
                disabled={!chart || !source}
                onClick={() => setActiveSignal((current) => (current === title ? null : title))}
                className={`group flex min-w-0 flex-col items-center p-2 text-center transition-all ${
                  activeSignal === title ? "scale-105" : "hover:opacity-90"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${border} bg-black/40 ${glow} transition-transform group-hover:scale-110`}
                >
                  <Icon size={22} className={tint} />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-300">{title}</span>
                <span className="mt-0.5 font-serif text-base font-bold text-white sm:text-lg">
                  {chart ? value : "—"}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">{caption}</span>
              </button>
            ))}
          </div>

          {/* Expanded Planetary Dossier */}
          {activeSignal &&
            (() => {
              const selected = signals.find((s) => s.title === activeSignal);
              if (!selected?.source) return null;
              const src = selected.source;
              const lon = src.longitude;
              const sign = signAt(lon);
              const decan = Math.min(2, Math.floor((((lon % 360) + 360) % 30) / 10));
              return (
                <div className="mt-4 rounded-xl border border-[#D9B66F]/40 bg-[#101628]/95 p-4 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-[#D9B66F]">
                      {activeSignal} · {DEGREE(lon)} {sign}
                    </h3>
                    <span className="font-mono text-[10px] text-cyan-300">
                      {typeof src.house === "number" ? `House ${src.house}` : "Horizon Ascendant"}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Elemental Decan {decan + 1} ({ELEMENTAL_DECANS[sign]?.[decan] ?? sign}) · Absolute Longitude:{" "}
                    <span className="font-mono text-cyan-200">{lon.toFixed(4)}°</span>
                  </p>
                  <div className="flex gap-4 pt-1">
                    <Link href="/chart" className="text-[#D9B66F] hover:underline font-semibold">
                      Inspect in Diamond Observatory →
                    </Link>
                    <Link href="/reading" className="text-cyan-300 hover:underline font-semibold">
                      Read Full Dossier →
                    </Link>
                  </div>
                </div>
              );
            })()}
        </div>
      </section>

      {/* SECTION 2: LIVE ENERGY READ CENTERPIECE */}
      <AbsoluteTheme>
        {energySnapshot ? (
          <EnergyStatusCard
            eyebrow="Live Planetary Transits"
            title="Daily Cosmic Energy Read"
            statusLabel={energySnapshot.signal}
            statusTone={
              energySnapshot.signal === "Harmonious Flow"
                ? "good"
                : energySnapshot.signal === "Dynamic Friction"
                  ? "friction"
                  : "mixed"
            }
            windowLabel={`${energySnapshot.contactsCount} Active Planetary Contacts`}
            nextShiftLabel={energySnapshot.nextShiftDesc}
            action={<TransitLocationBar variant="compact" />}
          >
            <div className="space-y-4">
              <div>
                <div className="abs-between text-xs font-semibold">
                  <span style={{ color: "var(--abs-good)" }}>Harmony {energySnapshot.flowPct}%</span>
                  <span style={{ color: "var(--abs-friction)" }}>Friction {energySnapshot.frictionPct}%</span>
                </div>
                <div
                  className="abs-meter"
                  role="img"
                  aria-label={`Harmony ${energySnapshot.flowPct}%; Friction ${energySnapshot.frictionPct}%`}
                >
                  <span className="abs-meter-good" style={{ width: `${energySnapshot.flowPct}%` }} />
                  <span className="abs-meter-friction" style={{ width: `${energySnapshot.frictionPct}%` }} />
                </div>
              </div>
              <Link href="/energy" className="abs-link-button">
                <Zap size={15} aria-hidden="true" />
                <span>Explore Full Energy Read</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </EnergyStatusCard>
        ) : (
          <section aria-label="Live Energy Read Centerpiece">
            <StatePanel
              kind={calculating ? "loading" : "empty"}
              title={calculating ? "Energy read is loading" : "Energy read unavailable"}
              message={calculating
                ? "Synthesizing planetary ephemeris..."
                : "Transits calculating. Open the Energy tab to explore."}
            />
          </section>
        )}
      </AbsoluteTheme>

      {/* SECTION 3: TWO DISTINCTIVE FEATURE CARDS (HORARY & SYNASTRY) */}
      <section aria-label="Featured Astrological Chambers" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9B66F]">
              Celestial Instruments
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Featured Divination & Relationship Studios
            </h2>
          </div>
          <Link href="/explore" className="text-xs text-[#D9B66F] hover:text-white font-semibold transition-colors">
            All Specialized Tools →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: HORARY CHAMBER */}
          <div className="relative overflow-hidden rounded-3xl border border-[#8B5CF6]/40 bg-[linear-gradient(135deg,#130D2B_0%,#080B14_70%)] p-6 shadow-[0_15px_40px_rgba(139,92,246,0.18)] space-y-4 hover:border-[#8B5CF6]/70 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300 border border-violet-400/30 shadow-[0_0_16px_rgba(139,92,246,0.2)]">
                <MoonStar size={26} />
              </div>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold text-violet-200">
                Question of the Second
              </span>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-white">HORARY CHAMBER</h3>
              <p className="text-xs text-violet-200/80 mt-1">
                "Ask the Firmament" — Receive an immediate celestial judgment calculated for this exact moment.
              </p>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLaunchHorary()}
                placeholder="e.g. Will this contract or venture succeed?"
                className="w-full rounded-xl border border-violet-400/30 bg-[#080B14]/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleLaunchHorary}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-600/30 px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-violet-600/50 transition-all active:scale-95"
              >
                <span>Cast Horary Chart</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Traditional Lilly significators, moon void-of-course, and perfection of aspects.
            </p>
          </div>

          {/* Card 2: SYNASTRY STUDIO */}
          <div className="relative overflow-hidden rounded-3xl border border-[#D9B66F]/40 bg-[linear-gradient(135deg,#1E1609_0%,#080B14_70%)] p-6 shadow-[0_15px_40px_rgba(217,182,111,0.18)] space-y-4 hover:border-[#D9B66F]/70 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9B66F]/20 text-[#D9B66F] border border-[#D9B66F]/30 shadow-[0_0_16px_rgba(217,182,111,0.2)]">
                <Heart size={26} />
              </div>
              <span className="rounded-full border border-[#D9B66F]/30 bg-[#D9B66F]/10 px-3 py-1 text-[10px] font-semibold text-[#D9B66F]">
                Dual-Orbit Chemistry
              </span>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-white">SYNASTRY STUDIO</h3>
              <p className="text-xs text-amber-200/80 mt-1">
                "Explore Cosmic Connections" — Compare two birth charts for soul resonance and mutual aspects.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>
                  Person A: <strong className="text-white">{profile.name}</strong>
                </span>
                <span className="text-[10px] font-mono text-[#D9B66F]">Natal Anchor</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Overlay a partner or collaborator's coordinates for romantic or business synastry.
              </p>
            </div>

            <Link
              href="/synastry"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9B66F]/50 bg-[#D9B66F]/20 px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-[#D9B66F]/30 transition-all active:scale-95"
            >
              <span>Compare Profiles</span>
              <ArrowRight size={14} />
            </Link>

            <p className="text-[10px] text-slate-400">
              Dual-wheel concentric overlays, cross-house placements, and composite harmony indices.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: COMPACT NORTH INDIAN DIAMOND CHART PREVIEW */}
      <section aria-label="Chart Preview" className="rounded-3xl border border-[#D9B66F]/25 bg-[#080B14]/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Diamond size={16} className="text-[#D9B66F]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9B66F]">
                Birth Chart Centerpiece
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              North Indian Diamond Projection
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setChartMode("diamond")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  chartMode === "diamond" ? "bg-[#D9B66F] text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                Diamond
              </button>
              <button
                type="button"
                onClick={() => setChartMode("wheel")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  chartMode === "wheel" ? "bg-[#22D3EE] text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                Circular Wheel
              </button>
            </div>
            <Link
              href="/chart"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <span>Full Studio</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {chart ? (
          chartMode === "diamond" ? (
            <DiamondChart chart={chart} compact />
          ) : (
            <ChartWheel chart={chart} />
          )
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            {calculating ? "Plotting planetary coordinates..." : "Chart unavailable"}
          </div>
        )}
      </section>

      {/* SECTION 5: INTERACTIVE INSIGHT CAROUSEL (EVIDENCE-GROUNDED) */}
      <section aria-label="Personal Celestial Insights" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
              Doctrine & Astrological Evidence
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Cosmic Archetypes & Mansion Codes
            </h2>
          </div>
          <Link href="/reading" className="text-xs text-cyan-300 hover:text-white font-semibold transition-colors">
            Full Readings Center →
          </Link>
        </div>

        {chart ? (
          <PersonalDiscoveryCarousel chart={chart} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-xs text-slate-400">
            Calculating personal archetypes...
          </div>
        )}
      </section>

      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onOpenNewProfile={onEditProfile}
      />
    </div>
  );
}
