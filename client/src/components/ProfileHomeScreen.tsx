import { Link } from "wouter";
import { ArrowUpRight, Diamond } from "lucide-react";
import { AccountControl } from "@/components/AccountControl";
import { type UserProfileData } from "@/components/NatalProfileBuilder";
import type { ChartResult } from "../../../server/astronomy";

type ProfileHomeScreenProps = {
  profile: UserProfileData;
  chart: ChartResult | null;
  calculating: boolean;
  onEditProfile: () => void;
  onSwitchProfile: () => void;
  onRefreshTransits?: () => void;
};

/**
 * Home is an entry dashboard, not another reading or discovery surface.
 * Keep the full chart, discovery cards, transits and interpretations in their
 * single dedicated destinations: Chart, Guide and Reading.
 */
export function ProfileHomeScreen({ profile, chart, calculating, onEditProfile, onSwitchProfile }: ProfileHomeScreenProps) {
  const summary = chart
    ? `${chart.movingBodies.length} moving bodies · ${chart.frozenStars.length} fixed stars · 12 ${chart.worldview === "god" ? "fixed" : "personal"} houses`
    : calculating
      ? "Calculating your chart…"
      : "Your chart is not calculated yet.";

  return <div className="mx-auto max-w-4xl pb-4">
    <section className="relative overflow-hidden rounded-3xl border border-amber-300/35 bg-[radial-gradient(ellipse_at_60%_0%,rgba(99,45,154,.35),transparent_60%),linear-gradient(140deg,rgba(6,18,48,.95),rgba(17,10,40,.94))] p-5 shadow-[0_16px_65px_rgba(0,0,0,.32)] sm:p-8" aria-label="Personal firmament dashboard">
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-200">Firmament Guardian · Your personal sky</span>
        <AccountControl />
      </div>
      <h1 className="mt-5 font-serif text-3xl leading-tight text-white sm:text-5xl">Welcome to your firmament, {profile.name}.</h1>
      <p className="mt-3 text-sm text-slate-300">{profile.date || "Your natal chart"} · {profile.location || "Birth location not supplied"}</p>
      <p className="mt-4 text-xs text-cyan-200/80" role="status">{summary}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/chart" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-200/15 px-5 text-sm font-semibold text-amber-100 hover:bg-amber-200/25">
          <Diamond size={17} /> Open your diamond chart <ArrowUpRight size={16} />
        </Link>
        <button type="button" onClick={onEditProfile} className="min-h-12 rounded-xl border border-white/20 px-4 text-sm text-slate-200 hover:bg-white/10">Edit birth details</button>
        <button type="button" onClick={onSwitchProfile} className="min-h-12 rounded-xl border border-white/20 px-4 text-sm text-slate-200 hover:bg-white/10">Switch profile</button>
      </div>
      <nav aria-label="Explore your chart" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-sm">
        <Link href="/reading" className="text-fuchsia-200 underline-offset-4 hover:underline">Full personal reading →</Link>
        <Link href="/guide" className="text-cyan-200 underline-offset-4 hover:underline">Discoveries & traditional guide →</Link>
      </nav>
    </section>
  </div>;
}
