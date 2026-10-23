import { Link } from "wouter";
import { BookOpen, Diamond, Heart, MoonStar, Orbit, Sparkles, Users, AudioLines, ArrowUpRight } from "lucide-react";
import { AccountControl } from "@/components/AccountControl";
import { ActiveProfileBar, type UserProfileData } from "@/components/NatalProfileBuilder";
import { PersonalDiscoveryCarousel } from "@/components/PersonalDiscoveryCarousel";
import { LiveTransitFeed } from "@/components/LiveTransitFeed";
import type { ChartResult } from "../../../server/astronomy";

type ProfileHomeScreenProps = {
  profile: UserProfileData;
  chart: ChartResult | null;
  calculating: boolean;
  onEditProfile: () => void;
  onSwitchProfile: () => void;
  onRefreshTransits?: () => void;
};

const gateways = [
  { href: "/chart", title: "Your Diamond Chart", subtitle: "The complete calculated 360° observatory", Icon: Diamond, accent: "text-cyan-200 border-cyan-300/35 from-cyan-300/15" },
  { href: "/reading", title: "Master Interpreter", subtitle: "Explore what your celestial evidence means", Icon: BookOpen, accent: "text-fuchsia-200 border-fuchsia-300/35 from-fuchsia-300/15" },
  { href: "/guide?tab=synastry", title: "Synastry & Chemistry", subtitle: "Discover connections between two charts", Icon: Heart, accent: "text-rose-200 border-rose-300/35 from-rose-300/15" },
  { href: "/guide?tab=weather", title: "Cosmic Weather", subtitle: "Investigate unfolding natal–transit contacts", Icon: Orbit, accent: "text-amber-200 border-amber-300/35 from-amber-300/15" },
  { href: "/guide?tab=podcast", title: "Audio Observatory", subtitle: "Listen to your personalized reading", Icon: AudioLines, accent: "text-violet-200 border-violet-300/35 from-violet-300/15" },
  { href: "/guide?tab=social", title: "Loved Ones", subtitle: "Explore the people in your celestial orbit", Icon: Users, accent: "text-cyan-200 border-cyan-300/35 from-cyan-300/15" },
] as const;

export function ProfileHomeScreen({ profile, chart, calculating, onEditProfile, onSwitchProfile, onRefreshTransits }: ProfileHomeScreenProps) {
  const summary = chart
    ? `${chart.movingBodies.length} moving bodies · ${chart.frozenStars.length} fixed stars · 12 ${chart.worldview === "god" ? "fixed" : "personal"} houses`
    : calculating ? "Calculating your saved natal chart…" : "Your calculated chart is not available yet.";

  return <div className="mx-auto max-w-5xl space-y-6 pb-4">
    <section className="relative overflow-hidden rounded-3xl border border-amber-300/35 bg-[radial-gradient(ellipse_at_60%_0%,rgba(99,45,154,.35),transparent_60%),linear-gradient(140deg,rgba(6,18,48,.95),rgba(17,10,40,.94))] p-5 shadow-[0_16px_65px_rgba(0,0,0,.32)] sm:p-8" aria-label="Personal firmament welcome">
      <div className="pointer-events-none absolute right-5 top-4 text-7xl text-amber-200/10" aria-hidden="true">✦</div>
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-200">Firmament Guardian · Your personal sky</span>
        <AccountControl />
      </div>
      <h1 className="relative mt-5 font-serif text-3xl leading-tight text-white sm:text-5xl">Welcome to your firmament, {profile.name}.</h1>
      <p className="relative mt-3 text-sm text-slate-300">{profile.date || "Your natal chart"} · {profile.location || "Birth location not supplied"}</p>
      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        <Link href="/chart" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-200/15 px-5 text-sm font-semibold text-amber-100 hover:bg-amber-200/25">
          <Diamond size={17} /> Open your diamond chart <ArrowUpRight size={16} />
        </Link>
        <button type="button" onClick={onEditProfile} className="min-h-12 rounded-xl border border-white/20 px-4 text-sm text-slate-200 hover:bg-white/10">Edit birth details</button>
      </div>
      <p className="relative mt-4 text-xs text-cyan-200/80">{summary}</p>
    </section>

    {chart && <ActiveProfileBar profile={profile} chart={chart} onEditProfile={onEditProfile} onSwitchProfile={onSwitchProfile} />}

    {chart ? <>
      <PersonalDiscoveryCarousel chart={chart} />
      <section className="rounded-3xl border border-violet-300/25 bg-slate-950/55 p-4 sm:p-6" aria-label="Live celestial influences">
        <div className="mb-4 flex items-center gap-2 text-violet-200"><MoonStar size={19}/><h2 className="font-serif text-2xl text-white">Your Celestial Weather</h2></div>
        <p className="mb-4 text-sm leading-6 text-slate-300">Your natal placements stay fixed. Transit testimony comes from the calculated moment and location—not from a randomized forecast.</p>
        {chart.readingScope !== "natal" ? <LiveTransitFeed chart={chart} onRefresh={onRefreshTransits} /> :
          <div className="rounded-xl border border-cyan-200/15 bg-black/20 p-4 text-sm text-slate-300">This is a natal-only chart. <Link href="/chart" className="font-semibold text-cyan-200 underline">Open Chart</Link> and choose Natal + Transit to see personal active influences.</div>}
      </section>
    </> : <section role="status" className="rounded-2xl border border-cyan-200/20 bg-slate-950/65 p-5 text-slate-200">{calculating ? "Calculating your personalized discoveries…" : "No calculated discoveries are available yet. Open your chart to check its status."}</section>}

    <section aria-label="Celestial tools" className="space-y-3">
      <div className="flex items-center gap-2"><Sparkles size={19} className="text-amber-200"/><h2 className="font-serif text-2xl text-white">Explore your observatory</h2></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gateways.map(({ href, title, subtitle, Icon, accent }) =>
          <Link key={href} href={href} className={`group flex min-h-28 items-start gap-4 rounded-2xl border bg-gradient-to-br ${accent} to-slate-950/80 p-5 transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200`}>
            <Icon size={25} className="shrink-0" />
            <span className="flex-1"><strong className="block text-base text-white">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-300">{subtitle}</span></span>
            <ArrowUpRight size={16} className="shrink-0 opacity-70"/>
          </Link>
        )}
      </div>
    </section>
  </div>;
}
