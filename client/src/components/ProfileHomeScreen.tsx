import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Compass, Diamond, Pencil, Sparkles, Sun, Moon, UserRound } from "lucide-react";
import { AccountControl } from "@/components/AccountControl";
import { PersonalDiscoveryCarousel } from "@/components/PersonalDiscoveryCarousel";
import { PersonalCosmicForecast } from "@/components/PersonalCosmicForecast";
import type { UserProfileData } from "@/components/NatalProfileBuilder";
import type { ChartResult } from "../../../server/astronomy";

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

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
function signAt(longitude: number | undefined): string {
  return typeof longitude === "number" && Number.isFinite(longitude)
    ? SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]
    : "Unavailable";
}

/** Single-purpose dashboard. Long readings, carousel and advanced instruments live on their dedicated routes. */
export function ProfileHomeScreen({ profile, chart, calculating, onEditProfile, savedProfiles = [], onLoadProfile, onRefreshTransits }: ProfileHomeScreenProps) {
  const [activeSignal, setActiveSignal] = useState<"Sun" | "Moon" | "Ascendant" | null>(null);
  const sun = chart?.movingBodies.find(body => body.name === "Sun");
  const moon = chart?.movingBodies.find(body => body.name === "Moon");
  const asc = chart?.ascendant;
  const signals = [
    { title: "Sun", value: signAt(sun?.longitude), caption: "Identity", Icon: Sun, tint: "text-amber-300", source: sun },
    { title: "Moon", value: signAt(moon?.longitude), caption: "Emotional nature", Icon: Moon, tint: "text-fuchsia-300", source: moon },
    { title: "Ascendant", value: chart?.agentViewAvailable ? signAt(asc?.longitude) : "Unavailable", caption: "Outer expression", Icon: Compass, tint: "text-indigo-200", source: chart?.agentViewAvailable ? asc : undefined },
  ];
  return <div className="mx-auto max-w-[660px] space-y-4 pb-5 text-slate-100">
    <header className="flex items-center justify-between gap-3 px-1 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-200/70 text-3xl text-amber-200 shadow-[0_0_22px_rgba(232,190,105,.12)]" aria-hidden="true">✧</span>
        <div><p className="font-serif text-lg uppercase tracking-[.09em] text-[#ecd39b] sm:text-2xl">THE ABSOLUTE</p><p className="text-[9px] uppercase tracking-[.19em] text-slate-400">Uncovering Your Divine Code · From the Lights in the Firmament</p></div>
      </div>
      <AccountControl />
    </header>

    <section className="relative overflow-hidden rounded-3xl border border-[#e2c38b]/20 bg-[linear-gradient(180deg,rgba(8,20,42,.58),rgba(4,11,27,.88)),url('/assets/firmament-starfield.png')] bg-cover bg-center p-6 shadow-[0_20px_60px_rgba(0,0,0,.4)] sm:p-8" aria-label="Welcome to your firmament">
      <div className="pointer-events-none absolute right-[12%] top-[17%] text-6xl text-amber-100/75 blur-[1px]" aria-hidden="true">✦</div>
      <div className="relative max-w-[78%]"><p className="font-serif text-3xl leading-tight text-[#fff8ed] sm:text-4xl">THE ABSOLUTE</p><p className="mt-3 text-sm leading-6 text-slate-300">Uncovering Your Divine Code<br/>From the Lights in the Firmament</p></div>
    </section>

    <PersonalCosmicForecast chart={chart} calculating={calculating} onRefresh={onRefreshTransits} />

    <section className="flex items-center justify-between gap-3 rounded-2xl border border-blue-300/20 bg-[#111622]/90 p-4" aria-label="Current birth profile">
      <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-400/15 text-blue-100"><UserRound size={25}/></span>
        <div className="min-w-0">
          <h2 className="font-serif text-lg text-white flex items-center gap-2">
            <span>Your Profile</span>
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-300/30">Edit Details</span>
          </h2>
          <p className="truncate text-xs text-slate-300">{profile.name} · {profile.date} · {profile.location}</p>
        </div>
      </Link>
      <Link href="/profile" aria-label="Edit birth profile" className="shrink-0 rounded-lg p-3 text-amber-200 hover:bg-white/10">
        <Pencil size={17}/>
      </Link>
    </section>

    <section className="rounded-2xl border border-blue-300/20 bg-[#111622]/90 p-4 sm:p-5" aria-label="Calculated chart at a glance">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3"><h2 className="flex items-center gap-2 font-serif text-lg text-white"><Sparkles size={17} className="text-[#f1cf8a]"/> At a Glance</h2><p className="text-[11px] text-slate-400">Your three divine signals</p></div>
      <div className="grid grid-cols-3">
        {signals.map(({title,value,caption,Icon,tint,source}, index) => <button type="button" key={title}
          disabled={!chart || !source}
          aria-expanded={activeSignal === title}
          onClick={() => setActiveSignal(current => current === title ? null : title as "Sun" | "Moon" | "Ascendant")}
          className={`group flex min-w-0 flex-col items-center px-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${index ? "border-l border-white/10" : ""}`}>
          <span className="rounded-full border border-white/10 bg-white/[0.04] p-3 shadow-[0_0_14px_rgba(212,175,55,.12)] transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:scale-110">
            <Icon size={23} className={tint} aria-hidden="true"/>
          </span>
          <span className="mt-2 text-xs text-slate-300">{title}</span>
          <span className="mt-1 break-words font-serif text-base text-white sm:text-xl">{chart ? value : "—"}</span>
          <span className="mt-1 text-[10px] text-slate-400">{caption}</span>
        </button>)}
      </div>
      {activeSignal && (() => {
        const selected = signals.find(signal => signal.title === activeSignal);
        if (!selected?.source) return null;
        const source = selected.source;
        return <div role="region" aria-live="polite" className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-black/25 p-3 text-sm text-slate-200">
          <strong className="text-[#F3D38C]">{activeSignal} · {selected.value}</strong>
          <p className="mt-2">Calculated longitude: {source.longitude.toFixed(2)}°{typeof source.house === "number" ? ` · House ${source.house}` : ""}</p>
          <p className="mt-1 text-xs text-slate-400">{selected.caption} in the traditional chart interpretation. Explore the full chart for its aspects and supporting testimony.</p>
          <Link href="/chart" className="mt-2 inline-block text-xs font-semibold text-amber-200 underline underline-offset-2">View on diamond chart →</Link>
        </div>;
      })()}
      {!chart && <p className="mt-4 text-center text-xs text-amber-200" role="status">{calculating ? "Calculating your divine signals…" : "Chart values unavailable; no illustrative placements are shown."}</p>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/chart" className="group relative isolate flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl border border-[#eec77e]/70 bg-[linear-gradient(115deg,rgba(109,77,41,.42),rgba(9,22,45,.96)_45%,rgba(4,19,39,.98))] p-5 shadow-[0_0_28px_rgba(238,199,126,.15)] transition-all duration-300 hover:border-amber-200 hover:shadow-[0_0_38px_rgba(238,199,126,.29)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/10 text-amber-100 shadow-[0_0_19px_rgba(238,199,126,.2)] transition-transform duration-300 motion-safe:group-hover:scale-110"><Diamond size={32} strokeWidth={1.1}/></span>
        <span className="min-w-0 flex-1"><strong className="block font-serif text-lg text-white">Your Diamond Chart</strong><span className="mt-1 block text-xs leading-4 text-slate-300">Explore the 360° observatory, God/Agent frames, planets and stars.</span></span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4c96f] text-slate-950 shadow-[0_0_16px_rgba(244,201,111,.35)] transition-transform motion-safe:group-hover:translate-x-1"><ArrowRight size={18}/></span>
      </Link>

      <Link href="/life-story" className="group relative isolate flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl border border-fuchsia-400/70 bg-[linear-gradient(115deg,rgba(112,26,117,.42),rgba(15,23,42,.96)_45%,rgba(3,7,18,.98))] p-5 shadow-[0_0_28px_rgba(217,70,239,.15)] transition-all duration-300 hover:border-fuchsia-300 hover:shadow-[0_0_38px_rgba(217,70,239,.29)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_19px_rgba(217,70,239,.2)] transition-transform duration-300 motion-safe:group-hover:scale-110"><BookOpen size={30} strokeWidth={1.3}/></span>
        <span className="min-w-0 flex-1"><strong className="block font-serif text-lg text-white">Life Story Mode</strong><span className="mt-1 block text-xs leading-4 text-slate-300">Chronological life stages, annual profections & planetary return milestones.</span></span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-400 text-slate-950 shadow-[0_0_16px_rgba(232,121,249,.35)] transition-transform motion-safe:group-hover:translate-x-1"><ArrowRight size={18}/></span>
      </Link>
    </div>

    {chart && <PersonalDiscoveryCarousel chart={chart} compact />}

    <section aria-label="Saved birth profiles" className="rounded-2xl border border-white/5 bg-[#111622]/85 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-200">Saved Profiles</h2>
        <span className="text-xs text-[#D4AF37]">{savedProfiles.length} saved</span>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {savedProfiles.length === 0 ? <p className="text-xs text-slate-400">Your saved birth profiles will appear here.</p> : savedProfiles.map((saved, index) => (
          <button type="button" key={`${saved.name}:${saved.date}:${saved.time}:${index}`} onClick={() => onLoadProfile?.(saved)}
            className="min-w-[145px] max-w-[195px] snap-start rounded-xl border border-white/10 bg-[#172034] p-3 text-left transition hover:border-[#D4AF37]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
            <span className="block truncate text-sm font-medium text-white">{saved.name}</span>
            <span className="mt-1 block truncate text-[11px] text-slate-400">{saved.date}</span>
            <span className="block truncate text-[11px] text-slate-400">{saved.location}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Saved on this browser only; profiles do not yet sync between deployments.</p>
    </section>

    <nav aria-label="Other personal experiences" className="flex flex-wrap justify-center gap-x-7 gap-y-3 px-3 py-2 text-xs text-slate-300">
      <Link href="/reading" className="hover:text-amber-200">Master Interpreter →</Link>
      <Link href="/guide" className="hover:text-amber-200">Divine Guide →</Link>
    </nav>
  </div>;
}
