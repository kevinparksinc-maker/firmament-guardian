import { Link } from "wouter";
import { AccountControl } from "@/components/AccountControl";
import { ActiveProfileBar, type UserProfileData } from "@/components/NatalProfileBuilder";
import type { ChartResult } from "../../../server/astronomy";

type ProfileHomeScreenProps = {
  profile: UserProfileData;
  chart: ChartResult | null;
  calculating: boolean;
  onEditProfile: () => void;
  onSwitchProfile: () => void;
};

export function ProfileHomeScreen({ profile, chart, calculating, onEditProfile, onSwitchProfile }: ProfileHomeScreenProps) {
  const overview = chart
    ? `${chart.movingBodies.length} moving bodies · ${chart.frozenStars.length} fixed stars · 12 ${chart.worldview === "god" ? "fixed" : "personal"} houses`
    : calculating ? "Calculating your saved natal chart…" : "Your calculated chart is not available yet.";

  return (
    <>
      {chart && (
        <ActiveProfileBar
          profile={profile}
          chart={chart}
          onEditProfile={onEditProfile}
          onSwitchProfile={onSwitchProfile}
        />
      )}
      <section aria-label="Celestial profile overview" className="mx-auto mb-8 max-w-3xl rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-white">Your Celestial Observatory</h1>
          <AccountControl />
        </div>
        <p className="mt-2 text-slate-300">{profile.name}</p>
        <p className="my-4 text-sm text-cyan-100">{overview}</p>
        <Link href="/chart" className="inline-flex min-h-12 items-center rounded-xl bg-cyan-300 px-6 font-semibold text-slate-950">
          Open your diamond chart →
        </Link>
      </section>
    </>
  );
}
