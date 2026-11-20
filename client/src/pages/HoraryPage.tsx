import { useEffect, useRef, useState } from "react";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { ArrowLeft, Clock3, Loader2, LocateFixed, MapPin, MessageCircle, Moon, Orbit, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { localDateTime } from "@/lib/transitTime";
import { HORARY_TOPICS } from "@shared/horary";
import { HoraryLookaheadEvidence } from "@/components/HoraryLookaheadEvidence";
import { HoraryOrrery } from "@/components/HoraryOrrery";
import { FrameRelationshipPanel } from "@/components/FrameRelationshipPanel";
import { TraditionalHoraryEvidence } from "@/components/TraditionalHoraryEvidence";
import { HoraryChamber2050 } from "@/components/HoraryChamber2050";
import { formatLongitude } from "@shared/hybrid";
import type { HoraryInput, HoraryChart } from "../../../server/horary";

function currentLocalDateTime() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

type ResolvedPlace = {
  query: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type HoraryResult = {
  inputKey: string;
  chart: HoraryChart;
  reading: string | null;
  synthesisStatus: "ai_completed" | "ai_unavailable";
};

export default function HoraryPage() {
  const { profile: activeProfile } = useProfileSession();
  const initialMoment = currentLocalDateTime();
  const utils = trpc.useUtils();

  const [question, setQuestion] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [date, setDate] = useState(initialMoment.date);
  const [time, setTime] = useState(initialMoment.time);

  // Optional advanced house overrides & natal comparison (auto-detected by default)
  const [overrideSubject, setOverrideSubject] = useState<"auto" | "querent" | "other">("auto");
  const [overrideSubjectHouse, setOverrideSubjectHouse] = useState("");
  const [overrideTopicHouse, setOverrideTopicHouse] = useState("");

  const [birthLocationQuery, setBirthLocationQuery] = useState("");
  const [birthPlace, setBirthPlace] = useState<ResolvedPlace | null>(null);
  const [includeNatal, setIncludeNatal] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");

  const [horary, setHorary] = useState<HoraryResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const activeChart = useRef<HoraryChart | undefined>(undefined);
  activeChart.current = horary?.chart;

  const geocode = trpc.hybrid.geocode.useQuery({ query: locationQuery }, { enabled: false, retry: false });
  const birthGeocode = trpc.hybrid.geocode.useQuery({ query: birthLocationQuery }, { enabled: false, retry: false });
  const cast = trpc.horary.open.useMutation({
    onSuccess: (result, input) => {
      setHorary({ ...result, inputKey: JSON.stringify(input) });
      setMessages([]);
    },
  });
  const followUp = trpc.horary.followUp.useMutation({
    onSuccess: (answer, input) => {
      if (activeChart.current === input.chart) {
        setMessages(current => [...current, { role: "assistant", content: answer }]);
      }
    },
  });

  const applyCurrentMoment = (timezone: string) => {
    const moment = localDateTime(new Date(), timezone);
    setDate(moment.date);
    setTime(moment.time);
  };

  const resolveCurrentLocation = (silentOnDeny = false) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      if (!silentOnDeny) setLocationError("Browser location is unavailable here. Enter your city below.");
      return;
    }
    setLocatingGps(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const data = await utils.hybrid.reverseGeocode.fetch({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          const resolved: ResolvedPlace = { ...data, query: data.label.trim() };
          setPlace(resolved);
          setLocationQuery(data.label);
          applyCurrentMoment(data.timezone);
        } catch (err) {
          if (!silentOnDeny) {
            setLocationError(err instanceof Error ? err.message : "Could not resolve your coordinates. Enter a city instead.");
          }
        } finally {
          setLocatingGps(false);
        }
      },
      () => {
        setLocatingGps(false);
        if (!silentOnDeny) {
          setLocationError("Location permission was declined. Type your city and tap Resolve.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  useEffect(() => {
    resolveCurrentLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvePlace = async (): Promise<ResolvedPlace | null> => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) return null;
    setLocationError(null);
    const result = await geocode.refetch();
    if (!result.data) return null;
    const resolved: ResolvedPlace = { ...result.data, query: result.data.label.trim() };
    setPlace(resolved);
    setLocationQuery(result.data.label);
    return resolved;
  };

  const resolveBirthPlace = async () => {
    if (birthLocationQuery.trim().length < 2) return;
    const result = await birthGeocode.refetch();
    if (!result.data) return;
    const resolved = { ...result.data, query: result.data.label.trim() };
    setBirthPlace(resolved);
    setBirthLocationQuery(result.data.label);
  };

  useEffect(() => {
    if (!activeProfile) return;
    const resolved = {
      query: activeProfile.location,
      label: activeProfile.location,
      latitude: activeProfile.latitude,
      longitude: activeProfile.longitude,
      timezone: activeProfile.timezone,
    };
    setIncludeNatal(!activeProfile.birthTimeUnknown);
    setBirthPlace(resolved);
    setBirthLocationQuery(activeProfile.location);
    setBirthDate(activeProfile.date);
    setBirthTime(activeProfile.birthTimeUnknown ? "" : activeProfile.time);
  }, [
    activeProfile?.id,
    activeProfile?.date,
    activeProfile?.time,
    activeProfile?.location,
    activeProfile?.latitude,
    activeProfile?.longitude,
    activeProfile?.timezone,
    activeProfile?.birthTimeUnknown,
  ]);

  const locationIsResolved = Boolean(place && place.query === locationQuery.trim());
  const birthLocationIsResolved = Boolean(birthPlace && birthPlace.query === birthLocationQuery.trim());
  const hasCompleteNatal = birthLocationIsResolved && birthDate.length === 10 && birthTime.length === 5;
  const canSubmit =
    question.trim().length >= 10 &&
    locationQuery.trim().length >= 2 &&
    date.length === 10 &&
    time.length === 5 &&
    (!includeNatal || hasCompleteNatal) &&
    !cast.isPending &&
    !geocode.isFetching;

  const buildCastInput = (resolvedPlace: ResolvedPlace): HoraryInput => ({
    question: question.trim(),
    ...(overrideSubject !== "auto" ? { subject: overrideSubject } : {}),
    ...(overrideSubject === "other" && overrideSubjectHouse ? { subjectHouse: Number(overrideSubjectHouse) } : {}),
    ...(overrideTopicHouse ? { topicHouse: Number(overrideTopicHouse) } : {}),
    location: resolvedPlace.label,
    latitude: resolvedPlace.latitude,
    longitude: resolvedPlace.longitude,
    timezone: resolvedPlace.timezone,
    date,
    time,
    ...(includeNatal && hasCompleteNatal && birthPlace
      ? {
          natal: {
            location: birthPlace.label,
            latitude: birthPlace.latitude,
            longitude: birthPlace.longitude,
            timezone: birthPlace.timezone,
            date: birthDate,
            time: birthTime,
          },
        }
      : {}),
  });

  const currentCastInput = place && locationIsResolved ? buildCastInput(place) : null;
  const resultIsStale = Boolean(
    horary && (horary.inputKey !== JSON.stringify(currentCastInput) || (includeNatal && !hasCompleteNatal))
  );

  const castQuestion = async () => {
    if (!canSubmit) return;
    let resolved = place && locationIsResolved ? place : null;
    if (!resolved) {
      resolved = await resolvePlace();
      if (!resolved) return;
    }
    const nextInput = buildCastInput(resolved);
    cast.reset();
    setHorary(null);
    setMessages([]);
    followUp.reset();
    cast.mutate(nextInput);
  };

  const sendFollowUp = (content: string) => {
    if (!horary || resultIsStale || followUp.isPending || !content.trim()) return;
    const next = [...messages, { role: "user" as const, content: content.trim() }];
    setMessages(next);
    followUp.mutate({
      chart: horary.chart,
      history: [
        { role: "user", content: horary.chart.question },
        ...(horary.reading ? [{ role: "assistant" as const, content: horary.reading }] : []),
        ...messages.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system"),
      ],
      question: content.trim(),
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-100 selection:bg-cyan-300/25">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-32 h-[34rem] w-[34rem] rounded-full bg-cyan-700/15 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the astrology app
          </Link>
          <Link
            href="/zodiac-readings"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200/25 bg-amber-100/[0.07] px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-100/[0.12]"
          >
            <Sparkles className="h-4 w-4" />
            Twelve Zodiac Sign Readings
          </Link>
        </div>

        <header className="mb-8 border-b border-white/10 pb-8">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-cyan-200">
            <span className="h-px w-8 bg-cyan-200" />
            THE ABSOLUTE · HORARY CHAMBER
          </div>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight text-white md:text-6xl">
            Ask the question. Let the astrologer read the chart.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Write what you want to know in your own words. The Absolute identifies the subject, turns any required houses, selects the traditional significators, casts the moment chart, and translates the testimony into clear language.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <Card className="border-white/10 bg-white/[0.045] text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-2xl">
                <Sparkles className="h-5 w-5 text-cyan-200" />
                Ask your question
              </CardTitle>
              <p className="text-sm leading-6 text-slate-400">
                One clear, sincere question is all you need—the houses and rulers are determined automatically.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="horary-question" className="text-slate-200">
                  Your question
                </Label>
                <textarea
                  id="horary-question"
                  value={question}
                  onChange={event => setQuestion(event.target.value)}
                  maxLength={1000}
                  placeholder="For example: What does this app need to make it complete?"
                  className="min-h-32 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
                />
                {question.trim().length > 0 && question.trim().length < 10 && (
                  <p className="text-xs text-slate-400">Enter at least 10 characters so the chart question is clear.</p>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      Location & question time
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Defaults to your current moment; adjust if you are casting for another time or place.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resolveCurrentLocation(false)}
                    disabled={locatingGps}
                    className="border-white/10 bg-white/[0.04] text-cyan-100 hover:bg-white/[0.08]"
                  >
                    {locatingGps ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Locating
                      </>
                    ) : (
                      <>
                        <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
                        Use current location & time
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horary-location" className="text-slate-200">
                    Place where you asked
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="horary-location"
                      value={locationQuery}
                      onChange={event => setLocationQuery(event.target.value)}
                      placeholder="City, region, country"
                      className="border-white/10 bg-black/20 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void resolvePlace()}
                      disabled={geocode.isFetching || locationQuery.trim().length < 2}
                      className="shrink-0 border-white/10 bg-white/[0.04] text-cyan-100 hover:bg-white/[0.08]"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {geocode.isFetching ? "Resolving" : "Resolve"}
                    </Button>
                  </div>
                  {locationIsResolved && place && (
                    <p className="text-xs text-emerald-200">
                      {place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}° · {place.timezone}
                    </p>
                  )}
                  {(geocode.error || locationError) && (
                    <p className="text-xs text-rose-300">{geocode.error?.message || locationError}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="horary-date" className="text-slate-200">
                      Local date asked
                    </Label>
                    <Input
                      id="horary-date"
                      type="date"
                      value={date}
                      onChange={event => setDate(event.target.value)}
                      className="border-white/10 bg-black/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horary-time" className="text-slate-200">
                      Local time asked
                    </Label>
                    <Input
                      id="horary-time"
                      type="time"
                      value={time}
                      onChange={event => setTime(event.target.value)}
                      className="border-white/10 bg-black/20 text-white"
                    />
                  </div>
                </div>
              </div>

              <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-amber-200" />
                  Optional natal comparison & manual house overrides
                </summary>
                <div className="mt-4 space-y-5">
                  <div className="space-y-3 rounded-xl border border-amber-200/15 bg-amber-100/[0.03] p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[.18em] text-amber-200">Optional natal layer</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Compare the question-moment chart against a saved or entered birth chart for added personal context.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-amber-100">
                      <input
                        type="checkbox"
                        checked={includeNatal}
                        onChange={event => setIncludeNatal(event.target.checked)}
                      />
                      Include a natal comparison
                    </label>
                    <fieldset disabled={!includeNatal} className="space-y-3 disabled:opacity-50">
                      <div className="flex gap-2">
                        <Input
                          id="birth-location"
                          value={birthLocationQuery}
                          onChange={event => setBirthLocationQuery(event.target.value)}
                          placeholder="Birth city, region, country"
                          className="border-white/10 bg-black/20 text-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void resolveBirthPlace()}
                          disabled={birthGeocode.isFetching || birthLocationQuery.trim().length < 2}
                          className="shrink-0 border-white/10 bg-white/[0.04] text-amber-100 hover:bg-white/[0.08]"
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          {birthGeocode.isFetching ? "Resolving" : "Resolve"}
                        </Button>
                      </div>
                      {birthLocationIsResolved && birthPlace && (
                        <p className="text-xs text-emerald-200">
                          {birthPlace.latitude.toFixed(4)}°, {birthPlace.longitude.toFixed(4)}° · {birthPlace.timezone}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          aria-label="Birth date"
                          type="date"
                          value={birthDate}
                          onChange={event => setBirthDate(event.target.value)}
                          className="border-white/10 bg-black/20 text-white"
                        />
                        <Input
                          aria-label="Birth time"
                          type="time"
                          value={birthTime}
                          onChange={event => setBirthTime(event.target.value)}
                          className="border-white/10 bg-black/20 text-white"
                        />
                      </div>
                      {includeNatal && !hasCompleteNatal && (
                        <p className="text-xs text-amber-200">
                          Resolve the birth place and enter both birth date and time to enable the natal layer.
                        </p>
                      )}
                    </fieldset>
                  </div>

                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-slate-300">
                      Manual house override (experienced astrologers)
                    </p>
                    <p className="text-xs leading-5 text-slate-400">
                      Leave on auto-detect so the astrologer selects the subject, turned houses, and topic houses from your question.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="horary-subject-override" className="text-xs text-slate-300">
                          Subject framing
                        </Label>
                        <select
                          id="horary-subject-override"
                          value={overrideSubject}
                          onChange={event => setOverrideSubject(event.target.value as "auto" | "querent" | "other")}
                          className="h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-xs text-slate-100 outline-none focus:border-cyan-300/50"
                        >
                          <option value="auto">Auto-detect from question</option>
                          <option value="querent">Querent (House 1)</option>
                          <option value="other">Another person (turned house)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="horary-topic-override" className="text-xs text-slate-300">
                          Topic house
                        </Label>
                        <select
                          id="horary-topic-override"
                          value={overrideTopicHouse}
                          onChange={event => setOverrideTopicHouse(event.target.value)}
                          className="h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-xs text-slate-100 outline-none focus:border-cyan-300/50"
                        >
                          <option value="">Auto-detect from question</option>
                          {HORARY_TOPICS.map(topic => (
                            <option key={topic.house} value={topic.house}>
                              House {topic.house} — {topic.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {overrideSubject === "other" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="horary-subject-house-override" className="text-xs text-slate-300">
                          Other person’s base house
                        </Label>
                        <select
                          id="horary-subject-house-override"
                          value={overrideSubjectHouse}
                          onChange={event => setOverrideSubjectHouse(event.target.value)}
                          className="h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-xs text-slate-100 outline-none focus:border-cyan-300/50"
                        >
                          <option value="">Infer from question</option>
                          <option value="3">Sibling — House 3</option>
                          <option value="4">Mother / parent / family — House 4</option>
                          <option value="5">Child — House 5</option>
                          <option value="7">Partner / counterpart — House 7</option>
                          <option value="10">Father / boss / authority — House 10</option>
                          <option value="11">Friend / group — House 11</option>
                          <option value="12">Other / hidden matter — House 12</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </details>

              {cast.error && (
                <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-200">
                  {cast.error.message}
                </div>
              )}

              <Button
                type="button"
                onClick={() => void castQuestion()}
                disabled={!canSubmit}
                className="h-12 w-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
              >
                {cast.isPending || geocode.isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing question, casting chart, and preparing your reading…
                  </>
                ) : (
                  <>
                    <Orbit className="mr-2 h-4 w-4" />
                    Cast chart & read
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.07] to-violet-100/[0.035] text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Clock3 className="h-5 w-5 text-cyan-200" />
                How the astrologer reads it
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-400">
              <p>
                First, the engine examines what your question is genuinely asking—whether it concerns a personal project, career offer, lost object, or another person—and assigns the traditional primary and supporting houses automatically.
              </p>
              <p>
                Next, it calculates Swiss Ephemeris equatorial XYZ coordinates projected into the fixed firmament frame alongside sunrise-anchored Equal Houses, traditional dignities, reception, lunar applications, Lots, and fixed stars.
              </p>
              <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-slate-500">
                Your answer is written in clear, everyday language first, while every planet, house, and degree remains available in the Evidence panel below.
              </p>
            </CardContent>
          </Card>
        </section>

        {horary && (
          <section className="mt-8 flex flex-col space-y-6">
            <div className="order-first space-y-3">
              {resultIsStale && (
                <p role="status" className="rounded-xl border border-amber-200/30 bg-amber-100/10 p-4 text-sm text-amber-100">
                  You changed the question or chart inputs. The reading below still belongs to the previous cast. Cast again to update its calculations and answer; follow-up chat is paused until then.
                </p>
              )}
              <nav aria-label="Question reading sections" className="flex flex-wrap gap-3 text-sm text-cyan-100">
                {[
                  ["answer", "Answer"],
                  ["evidence", "Calculation evidence"],
                  ["conversation", "Follow-up"],
                  ["chart", "Three-layer chart"],
                ].map(([id, label]) => (
                  <a key={id} href={`#horary-${id}`} className="rounded-full border border-white/15 px-3 py-2 hover:bg-white/10">
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            <div id="horary-answer" className="order-1 scroll-mt-6 space-y-3">
              {horary.reading ? (
                <HoraryChamber2050 chart={horary.chart} reading={horary.reading} />
              ) : (
                <p role="alert" className="rounded-xl border border-amber-200/30 p-4 text-sm text-amber-100">
                  The chart is ready, but its interpretation could not be completed. Cast again to retry.
                </p>
              )}
            </div>

            <Card id="horary-evidence" className="order-2 scroll-mt-6 border-cyan-200/15 bg-white/[0.035] text-slate-100">
              <CardHeader className="border-b border-white/10">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Question chart evidence</p>
                    <CardTitle className="mt-2 max-w-3xl font-serif text-2xl text-white">
                      {horary.chart.question}
                    </CardTitle>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    {new Date(horary.chart.askedAt).toLocaleString(undefined, { timeZone: horary.chart.timezone })} local
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {horary.chart.location} · {horary.chart.houseSystem} · Interpreted focus: {horary.chart.questionAnalysis?.matterSubject ?? horary.chart.topicLabel}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Querent · House 1</p>
                    <p className="mt-2 text-lg font-medium text-cyan-100">{horary.chart.querentRuler}</p>
                    <p className="text-xs text-slate-500">
                      Ascendant {horary.chart.ascendant.display} · {horary.chart.ascendant.sign}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">
                      Subject · House {horary.chart.subjectHouse}
                    </p>
                    <p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.subjectRuler}</p>
                    <p className="text-xs text-slate-500">
                      {horary.chart.subject === "querent"
                        ? "Same as the querent"
                        : `Turned House ${horary.chart.subjectHouse}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">
                      Matter · chart House {horary.chart.actualTopicHouse}
                    </p>
                    <p className="mt-2 text-lg font-medium text-violet-100">{horary.chart.topicRuler}</p>
                    <p className="text-xs text-slate-500">
                      Relative House {horary.chart.topicHouse} · {horary.chart.topicLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Moon · co-significator</p>
                    <p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.moon.display}</p>
                    <p className="text-xs text-slate-500">
                      {horary.chart.moon.sign} · House {horary.chart.moon.house}
                      {horary.chart.moon.retrograde ? " · retrograde" : ""}
                    </p>
                  </div>
                </div>

                {horary.chart.additionalTopicHouses && horary.chart.additionalTopicHouses.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-xs text-slate-300">
                    <p className="mb-1.5 text-[10px] uppercase tracking-[.16em] text-slate-500">
                      Additional supporting houses assigned for this question
                    </p>
                    <p>{horary.chart.questionAnalysis?.reasoning}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-slate-400">
                      {horary.chart.additionalTopicHouses.map(h => (
                        <span key={h.actualHouse}>
                          House {h.actualHouse} ({h.label}) · {h.sign} ({h.ruler})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <details className="group rounded-xl border border-white/10 bg-black/10 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-200">
                    Inspect calculated placements, houses, and major contacts
                  </summary>
                  <div className="mt-4 grid gap-5 xl:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">Classical planets</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-2 pr-3">Planet</th>
                              <th className="py-2 pr-3">Position</th>
                              <th className="py-2">House</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {horary.chart.placements
                              .filter(row => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(row.name))
                              .map(row => (
                                <tr key={row.name}>
                                  <td className="py-2 pr-3 text-slate-200">
                                    {row.name}
                                    {row.retrograde ? " ℞" : ""}
                                  </td>
                                  <td className="py-2 pr-3 font-mono text-cyan-100">{row.display}</td>
                                  <td className="py-2 text-slate-400">{row.house}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">House cusps and rulers</p>
                      <div className="grid grid-cols-2 gap-2">
                        {horary.chart.houses.map(row => (
                          <div
                            key={row.house}
                            className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-400"
                          >
                            <span className="text-slate-200">H{row.house}</span> {row.sign} · {row.ruler}
                            <span className="block font-mono text-[10px] text-slate-600">{formatLongitude(row.longitude)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mb-2 mt-5 text-xs uppercase tracking-[.16em] text-slate-500">
                        Relevant major aspects · 5° orb
                      </p>
                      {horary.chart.relevantAspects.length ? (
                        <div className="flex flex-wrap gap-2">
                          {horary.chart.relevantAspects.map((aspect, index) => (
                            <span
                              key={`${aspect.first}-${aspect.second}-${index}`}
                              className="rounded-full border border-cyan-200/10 bg-cyan-100/[0.04] px-2.5 py-1 text-[11px] text-cyan-100"
                            >
                              {aspect.first} {aspect.aspect} {aspect.second} · {aspect.orb}° {aspect.phase}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No close major contact among these significators was calculated.</p>
                      )}
                    </div>
                  </div>
                  <HoraryLookaheadEvidence chart={horary.chart} />
                </details>

                <TraditionalHoraryEvidence chart={horary.chart} />
              </CardContent>
            </Card>

            <div className="order-3">
              <FrameRelationshipPanel
                rows={horary.chart.placements as unknown as import("../../../server/astronomy").ChartRow[]}
                title="God's View of the Horary Agent"
                intro="The horary testimony remains primary. This panel adds the broader fixed zodiac frame and explains how the same question-time positions are translated through the local horary houses."
              />
            </div>

            <Card id="horary-conversation" className="order-4 scroll-mt-6 overflow-hidden border-violet-200/15 bg-white/[0.035] text-slate-100">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 font-serif text-2xl">
                  <MessageCircle className="h-5 w-5 text-violet-200" />
                  Continue with this chart
                </CardTitle>
                <p className="text-sm leading-6 text-slate-400">
                  Ask what a specific testimony means or explore practical next steps. Follow-ups use this same question chart.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <fieldset disabled={resultIsStale} className="disabled:opacity-50">
                  <AIChatBox
                    messages={messages}
                    onSendMessage={sendFollowUp}
                    isLoading={followUp.isPending}
                    height="540px"
                    placeholder="Ask a follow-up about this horary reading…"
                    emptyStateMessage="Your horary chart is ready for follow-up questions."
                    suggestedPrompts={[
                      "What is the strongest practical next step from this reading?",
                      "What is the main obstacle or tension to resolve first?",
                      "What timing or sequence does the chart point toward?",
                    ]}
                  />
                </fieldset>
                {followUp.error && (
                  <p role="alert" className="text-sm text-rose-300">
                    {followUp.error.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <div id="horary-chart" className="order-5 scroll-mt-6">
              <HoraryOrrery
                natal={horary.chart.natalChart}
                transit={horary.chart.transitChart}
                god={horary.chart.godChart}
                questionHouses={horary.chart.houses}
              />
            </div>
          </section>
        )}

        <footer className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-600">
          <Moon className="h-3.5 w-3.5" />
          A question chart is a distinct horary reading; it does not modify your natal chart.
        </footer>
      </main>
    </div>
  );
}
