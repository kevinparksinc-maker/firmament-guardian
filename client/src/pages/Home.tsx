import { lazy, Suspense, useEffect, useState } from "react";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import type { ProfileSection } from "@/config/profileNavigation";
import { trpc } from "@/lib/trpc";
import { ObservatorySoundscape } from "@/components/ObservatorySoundscape";
import { ProfileHomeScreen } from "@/components/ProfileHomeScreen";
import type { GuideTab } from "@/components/ProfileGuideScreen";
import { CosmicShareCard } from "@/components/CosmicShareCard";
import { NatalProfileBuilder, type UserProfileData, SAMPLE_PROFILE } from "@/components/NatalProfileBuilder";
import type { Worldview } from "../../../server/astrologyCore";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";

const ProfileChartScreen = lazy(() => import("@/components/ProfileChartScreen").then(module => ({ default: module.ProfileChartScreen })));
const ProfileReadingScreen = lazy(() => import("@/components/ProfileReadingScreen").then(module => ({ default: module.ProfileReadingScreen })));
const ProfileGuideScreen = lazy(() => import("@/components/ProfileGuideScreen").then(module => ({ default: module.ProfileGuideScreen })));

const exampleChart = {
  location: "Dallas, Texas, USA",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
  transitLocation: "Dallas, Texas, USA",
  transitLatitude: 32.7767,
  transitLongitude: -96.797,
  transitTimezone: "America/Chicago",
  transitDate: "",
  transitTime: "",
};
const emptyForm = {
  location: "",
  latitude: 0,
  longitude: 0,
  timezone: "",
  date: "",
  time: "",
  transitLocation: "",
  transitLatitude: 0,
  transitLongitude: 0,
  transitTimezone: "",
  transitDate: "",
  transitTime: "",
};
type ReadingMode = "natal" | "transit" | "combined";
export default function Home({ section = "home" }: { section?: ProfileSection }) {
  const { profile: activeProfile, setProfile: setActiveProfile, chart: result, setChart: setResult, savedProfiles } = useProfileSession();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [worldview, setWorldview] = useState<Worldview>("agent");
  const [locationQuery, setLocationQuery] = useState("");
  const [transitLocationQuery, setTransitLocationQuery] = useState("");
  const [readingQuestion, setReadingQuestion] = useState("");
  const [readingMode, setReadingMode] = useState<ReadingMode>("combined");
  const [showShareModal, setShowShareModal] = useState(false);
  const [, navigate] = useLocation();
  const [interpreterPrompt, setInterpreterPrompt] = useState<string | null>(() => {
    if (section !== "reading" || typeof window === "undefined") return null;
    try {
      const prompt = sessionStorage.getItem("fg:pending-interpreter-prompt");
      sessionStorage.removeItem("fg:pending-interpreter-prompt");
      return prompt;
    } catch { return null; }
  });

  const parseTab = (): GuideTab => {
    const tab = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("tab");
    return tab === "synastry" || tab === "weather" || tab === "podcast" || tab === "social" ? tab : "blueprint";
  };
  const [mainTab, setMainTab] = useState<GuideTab>(parseTab);
  useEffect(() => {
    const onSelect = (event: Event) => {
      const tab = (event as CustomEvent<{ tab: GuideTab }>).detail?.tab;
      if (["blueprint","synastry","weather","podcast","social"].includes(tab)) setMainTab(tab);
    };
    window.addEventListener("fg:select-tab", onSelect);
    return () => window.removeEventListener("fg:select-tab", onSelect);
  }, []);
  const [readingView, setReadingView] = useState<"guided" | "evidence">("guided");

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleAskMasterInterpreter = (question: string) => {
    if (section !== "reading") {
      try { sessionStorage.setItem("fg:pending-interpreter-prompt", question); } catch {}
      navigate("/reading");
      return;
    }
    setInterpreterPrompt(question);
    document.getElementById("master-interpreter-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const geo = trpc.hybrid.geocode.useQuery(
    { query: locationQuery },
    { enabled: false, retry: false }
  );
  const transitGeo = trpc.hybrid.geocode.useQuery(
    { query: transitLocationQuery },
    { enabled: false, retry: false }
  );
  const calculate = trpc.hybrid.calculate.useMutation({ onSuccess: setResult });
  const me = trpc.auth.me.useQuery();
  const saveChart = trpc.history.saveChart.useMutation();
  const calculateChart = async (
    nextWorldview: Worldview = worldview,
    nextReadingMode: ReadingMode = readingMode,
    formOverride?: typeof form
  ) => {
    let nextForm = { ...(formOverride ?? form) };
    setFormError("");
    if (
      nextWorldview !== "god" &&
      locationQuery.trim() &&
      !nextForm.timezone
    ) {
      const res = await geo.refetch();
      if (res.data)
        nextForm = {
          ...nextForm,
          location: res.data.label,
          latitude: res.data.latitude,
          longitude: res.data.longitude,
          timezone: res.data.timezone,
        };
      else {
        setFormError(
          res.error?.message ??
            "Location search is temporarily unavailable. Please resolve the city again."
        );
        return;
      }
    }
    if (
      nextReadingMode !== "natal" &&
      transitLocationQuery.trim() &&
      !nextForm.transitTimezone
    ) {
      const res = await transitGeo.refetch();
      if (res.data)
        nextForm = {
          ...nextForm,
          transitLocation: res.data.label,
          transitLatitude: res.data.latitude,
          transitLongitude: res.data.longitude,
          transitTimezone: res.data.timezone,
        };
      else {
        setFormError(
          res.error?.message ??
            "Transit location search is temporarily unavailable. Please resolve the city again."
        );
        return;
      }
    }
    if (
      nextWorldview !== "god" &&
      (!nextForm.location || !nextForm.timezone)
    ) {
      setFormError(
        "Resolve your birth city first, or click 'Try an example chart' below."
      );
      return;
    }
    if (
      nextWorldview !== "god" &&
      (!nextForm.date || !nextForm.time)
    ) {
      setFormError(
        "Agent View requires a birth date, birth time, and resolved birth city."
      );
      return;
    }
    if (
      nextWorldview === "god" &&
      nextReadingMode !== "transit" &&
      !nextForm.date
    ) {
      setFormError(
        "God View Natal readings require a birth date (birth time and city are optional). Enter a birth date or switch to Transit Chart."
      );
      return;
    }
    setForm(nextForm);
    calculate.mutate({
      ...nextForm,
      worldview: nextWorldview,
      readingScope: nextReadingMode,
      birthTimeKnown: Boolean(nextForm.time),
    });
  };
  const saveCurrentChart = () => {
    if (!result) return;
    if (!me.data) {
      startLogin();
      return;
    }
    saveChart.mutate({
      title: `${result.input.location || "God View"} · ${result.input.date || "current sky"}`,
      location: result.input.location || "God View",
      input: { ...form, worldview, readingScope: readingMode } as Record<
        string,
        unknown
      >,
      chart: result as unknown as Record<string, unknown>,
    });
  };
  const refreshLiveTransit = () => {
    if (!activeProfile || readingMode === "natal") return;
    const now = new Date();
    const tz = form.transitTimezone || form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const get = (key: string) => parts.find(p => p.type === key)?.value || "";
    calculate.mutate({
      ...form,
      transitDate: `${get("year")}-${get("month")}-${get("day")}`,
      transitTime: `${get("hour")}:${get("minute")}`,
      transitLocation: form.transitLocation || form.location,
      transitLatitude: form.transitLatitude || form.latitude,
      transitLongitude: form.transitLongitude || form.longitude,
      transitTimezone: form.transitTimezone || form.timezone,
      worldview,
      readingScope: readingMode,
      birthTimeKnown: Boolean(form.time),
    });
  };
  useEffect(() => {
    if (
      !result ||
      readingMode === "natal" ||
      (form.transitDate && form.transitTime)
    )
      return;
    const id = window.setInterval(refreshLiveTransit, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [result, readingMode, worldview, form]);
  const usePhoneLocation = () => {
    if (!navigator.geolocation) { setLocationStatus("Phone location is unavailable. Your saved transit location will be used."); return; }
    setLocationStatus("Requesting phone location permission…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || form.transitTimezone || form.timezone;
        const nextForm = { ...form, transitLocation: "Current phone location", transitLatitude: coords.latitude, transitLongitude: coords.longitude, transitTimezone: zone, transitDate: "", transitTime: "" };
        setForm(nextForm);
        setLocationStatus("Phone location applied to your transit chart.");
        calculate.mutate({ ...nextForm, worldview, readingScope: "combined", birthTimeKnown: Boolean(nextForm.time) });
      },
      () => setLocationStatus("Location permission unavailable or denied. Using your saved transit location."),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  };
  const handleSaveProfile = async (newProfile: UserProfileData) => {
    setActiveProfile(newProfile);
    const nextForm = {
      location: newProfile.location,
      latitude: newProfile.latitude,
      longitude: newProfile.longitude,
      timezone: newProfile.timezone,
      date: newProfile.date,
      time: newProfile.time,
      transitLocation: newProfile.transitLocation || newProfile.location,
      transitLatitude: newProfile.transitLatitude || newProfile.latitude,
      transitLongitude: newProfile.transitLongitude || newProfile.longitude,
      transitTimezone: newProfile.transitTimezone || newProfile.timezone,
      transitDate: "",
      transitTime: "",
    };
    setForm(nextForm);
    setLocationQuery(newProfile.location);
    setTransitLocationQuery(nextForm.transitLocation);
    await calculateChart(worldview, readingMode, nextForm);
    setIsProfileModalOpen(false);
  };

  const handleClearProfile = () => {
    setActiveProfile(null);
    setResult(null);
    setForm(emptyForm);
    setLocationQuery("");
    setTransitLocationQuery("");
    setIsProfileModalOpen(false);
  };

  const handleLoadSampleChart = () => {
    const sample = SAMPLE_PROFILE;
    setActiveProfile(sample);
    setForm(exampleChart);
    setLocationQuery(exampleChart.location);
    setTransitLocationQuery(exampleChart.transitLocation);
    void calculateChart(worldview, readingMode, exampleChart);
  };

  useEffect(() => {
    if (activeProfile) {
      const nextForm = {
        location: activeProfile.location,
        latitude: activeProfile.latitude,
        longitude: activeProfile.longitude,
        timezone: activeProfile.timezone,
        date: activeProfile.date,
        time: activeProfile.time,
        transitLocation: activeProfile.transitLocation || activeProfile.location,
        transitLatitude: activeProfile.transitLatitude || activeProfile.latitude,
        transitLongitude: activeProfile.transitLongitude || activeProfile.longitude,
        transitTimezone: activeProfile.transitTimezone || activeProfile.timezone,
        transitDate: "",
        transitTime: "",
      };
      setForm(nextForm);
      setLocationQuery(activeProfile.location);
      setTransitLocationQuery(nextForm.transitLocation);
      if (!result && !calculate.isPending) void calculateChart(worldview, readingMode, nextForm);
    }
  }, []);
  return (
    <div className="relative min-h-screen isolate bg-transparent text-slate-100 selection:bg-violet-400/30">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(3,5,12,.10),rgba(3,5,12,.58)_62%,rgba(3,5,12,.86)),url('/assets/firmament-starfield.png')] bg-cover bg-top bg-fixed"
        aria-hidden="true"
      />
      <ObservatorySoundscape />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-violet-700/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)] [background-size:64px_64px]" />
      </div>
      <main className="guardian-home-main relative z-10 mx-auto max-w-[1480px] px-5 py-6 md:px-10 md:py-10">
        <Suspense fallback={<p role="status" className="rounded-xl border border-cyan-200/20 bg-slate-950/70 p-5 text-sm text-cyan-100">Opening your celestial workspace…</p>}>
        {activeProfile && section === "chart" && (
          <ProfileChartScreen
            chart={result}
            calculating={calculate.isPending}
            worldview={worldview}
            readingMode={readingMode}
            onWorldviewChange={next => { setWorldview(next); void calculateChart(next, readingMode); }}
            onReadingModeChange={next => { setReadingMode(next); void calculateChart(worldview, next); }}
            error={formError || calculate.error?.message || ""}
          />
        )}

        {/* Core Natal Profile Building Gate - First Page Requirement */}
        {!activeProfile && (
          <>
            <NatalProfileBuilder
              mode="inline-gate"
              currentProfile={activeProfile}
              onSaveProfile={handleSaveProfile}
              onLoadSample={handleLoadSampleChart}
              isCalculating={calculate.isPending}
            />

          </>
        )}

        {/* Modal for editing profile anytime */}
        {isProfileModalOpen && <NatalProfileBuilder
          mode="dialog"
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentProfile={activeProfile}
          onSaveProfile={handleSaveProfile}
          onLoadSample={handleLoadSampleChart}
          isCalculating={calculate.isPending}
        />}

        {activeProfile && section === "home" && (
          <ProfileHomeScreen
            profile={activeProfile}
            chart={result}
            calculating={calculate.isPending}
            onEditProfile={() => setIsProfileModalOpen(true)}
            onSwitchProfile={handleClearProfile}
            savedProfiles={savedProfiles}
            onLoadProfile={handleSaveProfile}
            onRefreshTransits={refreshLiveTransit}
            onUsePhoneLocation={usePhoneLocation}
            locationStatus={locationStatus}
          />
        )}
        {activeProfile && !result && (section === "reading" || section === "guide") && (
          <section role="status" className="mx-auto max-w-3xl rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-6 text-slate-200">
            <h1 className="font-serif text-xl text-white">{section === "reading" ? "Preparing your personal reading" : "Preparing your celestial guide"}</h1>
            <p className="mt-3 text-sm">{calculate.isPending ? "Loading your calculated chart evidence…" : formError || calculate.error?.message || "Chart evidence is not yet available."}</p>
            <Link href="/chart" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-cyan-300/30 px-4 text-sm text-cyan-100">View chart status →</Link>
          </section>
        )}
        {result && (section === "reading" || section === "guide") && (
          <>
            {section === "reading" && (
              <ProfileReadingScreen
                chart={result}
                readingView={readingView}
                onReadingViewChange={setReadingView}
                readingMode={readingMode}
                readingQuestion={readingQuestion}
                interpreterPrompt={interpreterPrompt}
                onClearInterpreterPrompt={() => setInterpreterPrompt(null)}
                onLoadSampleChart={handleLoadSampleChart}
                onOpenProfileBuilder={() => setIsProfileModalOpen(true)}
                onReadingModeChange={setReadingMode}
              />
            )}
            {section === "guide" && (
              <ProfileGuideScreen
                result={result}
                mainTab={mainTab}
                setMainTab={setMainTab}
                worldview={worldview}
                setWorldview={setWorldview}
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                calculateChart={calculateChart}
                refreshLiveTransit={refreshLiveTransit}
                saveCurrentChart={saveCurrentChart}
                savingChart={saveChart.isPending}
                calculating={calculate.isPending}
                readingView={readingView}
                hasAccount={Boolean(me.data)}
                setShowShareModal={setShowShareModal}
                handleAskMasterInterpreter={handleAskMasterInterpreter}
              />
            )}

          </>
        )}
        </Suspense>
      </main>

      {/* 1-Tap Cosmic Share Card & Social Export Modal */}
      <CosmicShareCard
        open={showShareModal}
        onOpenChange={setShowShareModal}
        chart={result}
      />
    </div>
  );
}