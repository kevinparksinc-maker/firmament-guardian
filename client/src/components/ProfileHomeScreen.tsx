import { useMemo } from "react";
import { Link } from "wouter";
import { calculateEnergyRead } from "@/lib/energyScoring";
import type { UserProfileData } from "./NatalProfileBuilder";
import type { ChartResult } from "../../../server/astronomy";

type Props = {
  profile: UserProfileData;
  chart: ChartResult | null;
  calculating: boolean;
  onEditProfile: () => void;
  onSwitchProfile: () => void;
  onRefreshTransits?: () => void;
  savedProfiles?: UserProfileData[];
  onLoadProfile?: (profile: UserProfileData) => void;
};
export function ProfileHomeScreen({
  profile,
  chart,
  calculating,
  onEditProfile,
  onRefreshTransits,
}: Props) {
  const energy = useMemo(() => calculateEnergyRead(chart), [chart]);
  const bodies = [
    chart?.movingBodies.find(body => body.name === "Sun"),
    chart?.movingBodies.find(body => body.name === "Moon"),
    chart?.ascendant,
  ];
  return (
    <section className="mx-auto max-w-4xl space-y-9 pb-20 text-slate-100">
      <header className="space-y-4 rounded-3xl border border-amber-200/20 bg-[linear-gradient(135deg,#14213b,#080f1f)] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-amber-200">
          The Absolute · Your observatory
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl">
          Welcome, {profile.name}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-slate-300">
          Your birth chart is the starting point. Read its main message, then
          follow the evidence or explore today's sky.
        </p>
        <p className="text-xs leading-6 text-slate-400">
          {profile.date} ·{" "}
          {profile.birthTimeUnknown ? "Time unknown" : profile.time} ·{" "}
          {profile.location}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onEditProfile}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm"
          >
            Edit profile
          </button>
          <Link
            href="/profiles"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm"
          >
            Saved profiles
          </Link>
        </div>
      </header>
      <section aria-label="Your main chart signals" className="space-y-4">
        <h2 className="font-serif text-xl text-amber-100">Your main signals</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Sun", "Moon", "Ascendant"].map((label, i) => (
            <Link
              href="/chart"
              key={label}
              className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="font-serif text-xl">
                {bodies[i]?.display ||
                  (calculating ? "Calculating…" : "Unavailable")}
              </p>
              {bodies[i]?.agentHouse && (
                <p className="text-xs text-slate-400">
                  Agent House {bodies[i]!.agentHouse}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
      <section
        aria-label="Your next step"
        className="grid gap-5 sm:grid-cols-2"
      >
        <Link
          href="/reading"
          className="space-y-3 rounded-2xl border border-amber-200/25 bg-amber-200/5 p-6"
        >
          <h2 className="font-serif text-2xl text-amber-100">
            Read your chart
          </h2>
          <p className="text-sm leading-6 text-slate-300">
            Start with the main interpretation. Open the full explanation and
            calculation evidence at your own pace.
          </p>
          <span className="block text-sm text-amber-200">
            Open reading summary →
          </span>
        </Link>
        <div className="space-y-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/5 p-6">
          <h2 className="font-serif text-2xl text-cyan-100">
            Your current energy
          </h2>
          {energy ? (
            <>
              <p className="text-sm">{energy.signal}</p>
              <p className="text-sm text-slate-300">
                Harmony {energy.flowPct}% · Friction {energy.frictionPct}%
              </p>
              <p className="text-xs text-slate-400">
                {energy.contactsCount} contacts · Calculated{" "}
                {new Date(chart!.transitDate).toLocaleString([], {
                  timeZone:
                    chart!.input.transitTimezone || chart!.input.timezone,
                })}
              </p>
            </>
          ) : (
            <p role="status" className="text-sm text-slate-300">
              {calculating
                ? "Calculating current energy…"
                : "Current energy is ready to calculate."}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Link href="/energy" className="text-sm text-cyan-200">
              Open Energy Read →
            </Link>
            <button
              type="button"
              disabled={calculating}
              onClick={onRefreshTransits}
              className="text-xs text-slate-400 underline disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>
      <Link
        href="/explore"
        className="block rounded-2xl border border-white/10 bg-slate-950/50 p-6"
      >
        <h2 className="font-serif text-xl">Explore the page index →</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Find the forecast, transit chart, Horary, Synastry, patterns and saved
          records.
        </p>
      </Link>
    </section>
  );
}
