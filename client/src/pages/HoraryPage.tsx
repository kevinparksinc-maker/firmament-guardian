import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, Loader2, MapPin, MessageCircle, Moon, Navigation, Orbit, Sparkles, Sun } from "lucide-react";
import { Link } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { HoraryLookaheadEvidence } from "@/components/HoraryLookaheadEvidence";
import { HoraryOrrery } from "@/components/HoraryOrrery";
import { FrameRelationshipPanel } from "@/components/FrameRelationshipPanel";
import { TraditionalHoraryEvidence } from "@/components/TraditionalHoraryEvidence";
import { HoraryChamber2050 } from "@/components/HoraryChamber2050";
import { formatLongitude } from "@shared/hybrid";
import type { HoraryChart } from "../../../server/horary";

function localDateTime(timezone?: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { ...(timezone ? { timeZone: timezone } : {}), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "00";
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const time = `${value("hour")}:${value("minute")}`;
  return { date, time };
}

type ResolvedPlace = {
  query: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type HoraryResult = { chart: HoraryChart; reading: string };

export default function HoraryPage() {
  const [question, setQuestion] = useState("");
  const [expertOverrides, setExpertOverrides] = useState(false);
  const [subjectHouse, setSubjectHouse] = useState("");
  const [topicHouse, setTopicHouse] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [horary, setHorary] = useState<HoraryResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const trpcUtils = trpc.useUtils();
  const geocode = trpc.hybrid.geocode.useQuery({ query: locationQuery }, { enabled: false, retry: false });
  const cast = trpc.horary.open.useMutation({
    onSuccess: result => {
      setHorary(result);
      setMessages([]);
    },
  });
  const followUp = trpc.horary.followUp.useMutation({
    onSuccess: answer => setMessages(current => [...current, { role: "assistant", content: answer }]),
  });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          const res = await trpcUtils.hybrid.reverseGeocode.fetch({ latitude, longitude }).catch(() => null);
          const resolvedPlace: ResolvedPlace = {
            query: res?.label ?? `GPS (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
            label: res?.label ?? `GPS (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
            latitude,
            longitude,
            timezone: res?.timezone ?? tz,
          };
          setPlace(resolvedPlace);
          setLocationQuery(resolvedPlace.label);
        } catch {
          setGpsError("Could not resolve GPS place name. Coordinates recorded.");
        } finally {
          setIsLocating(false);
        }
      },
      err => {
        setIsLocating(false);
        setGpsError(err.message || "Location access was denied or timed out.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const resolvePlace = async () => {
    if (locationQuery.trim().length < 2) return;
    const result = await geocode.refetch();
    if (!result.data) return;
    const resolved = { ...result.data, query: result.data.label.trim() };
    setPlace(resolved);
    setLocationQuery(result.data.label);
  };

  useEffect(() => {
    useCurrentLocation();
    // Request the question location once; manual city entry remains the fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locationIsResolved = Boolean(place && place.query === locationQuery.trim());
  const canCast = question.trim().length >= 10 && locationIsResolved && !cast.isPending;

  const castQuestion = () => {
    if (!canCast || !place) return;
    const timezone = place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const moment = localDateTime(timezone);
    cast.reset();
    setHorary(null);
    setMessages([]);
    followUp.reset();
    cast.mutate({
      question: question.trim(),
      manualOverrides: expertOverrides,
      ...(expertOverrides && subjectHouse ? { subjectHouse: Number(subjectHouse) } : {}),
      ...(expertOverrides && topicHouse ? { topicHouse: Number(topicHouse) } : {}),
      location: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone,
      date: moment.date,
      time: moment.time,
    });
  };

  const sendFollowUp = (content: string) => {
    if (!horary || followUp.isPending || !content.trim()) return;
    const next = [...messages, { role: "user" as const, content: content.trim() }];
    setMessages(next);
    followUp.mutate({
      chart: horary.chart,
      history: [
        { role: "user", content: horary.chart.question },
        { role: "assistant", content: horary.reading },
        ...next.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system"),
      ],
      question: content.trim(),
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b14] text-slate-100 selection:bg-cyan-300/25">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-36 -top-32 h-[34rem] w-[34rem] rounded-full bg-cyan-700/15 blur-3xl"/><div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-violet-600/10 blur-3xl"/><div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:64px_64px]"/></div>
      <main className="relative z-10 mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white"><ArrowLeft className="h-4 w-4"/>Back to the astrology app</Link>
        <div className="mb-6 rounded-2xl border border-amber-200/25 bg-gradient-to-r from-amber-100/[0.09] via-violet-100/[0.06] to-cyan-100/[0.06] p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.23em] text-amber-200">THE QUESTION CHAMBER · 2050 OBSERVATORY</p><div className="mt-3 grid gap-3 text-xs leading-6 text-slate-300 sm:grid-cols-3"><p><strong className="block text-amber-100">01. Ask clearly</strong>Write one question that matters to you.</p><p><strong className="block text-amber-100">02. Set the moment</strong>Resolve where and when your question became important.</p><p><strong className="block text-amber-100">03. Read the testimony</strong>Explore the two chart frames, evidence and plain-English synthesis.</p></div></div>
        <Link href="/zodiac-readings" className="mb-7 flex items-center gap-3 rounded-xl border border-amber-200/30 bg-amber-100/[0.07] px-5 py-4 text-sm text-amber-100 hover:bg-amber-100/[0.12]"><Sparkles className="h-5 w-5"/> Explore the second engine: Twelve Zodiac Sign Readings →</Link>
        <header className="mb-8 border-b border-white/10 pb-8">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-cyan-200"><span className="h-px w-8 bg-cyan-200"/>FIRMAMENT GUARDIAN / HORARY CHAMBER</div>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight text-white md:text-6xl">One question. One chart. A careful answer.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">Ask a clear, present-tense question. Firmament Guardian will cast a chart for the moment and place you provide, explain the testimony in connected plain language, and keep follow-up chat anchored to that same chart.</p>
        </header>

        <section className="mb-7 rounded-2xl border border-amber-200/25 bg-gradient-to-r from-[#27243c]/80 via-[#14273c]/80 to-[#102038]/70 p-4 shadow-xl shadow-black/20 sm:p-6" aria-label="Horary question readiness">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">QUESTION INTAKE · AUTOMATIC HOUSE INTELLIGENCE</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Write your question in your own words. The Absolute identifies the people, matter, radical and turned houses, and significators. The question moment is captured when you cast.</p>
          <p className="mt-2 text-xs text-cyan-100">{locationIsResolved && place ? `Location detected: ${place.label}` : isLocating ? "Detecting question location…" : "Location permission unavailable? Enter the city where you are asking below."}</p>
        </section>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <Card className="border-white/10 bg-white/[0.045] text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Sparkles className="h-5 w-5 text-cyan-200"/>Ask your horary question</CardTitle><p className="text-sm leading-6 text-slate-400">Use the time and place where the question became clear and important to you. Keep it to one sincere question.</p></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="horary-question" className="text-slate-200">Your question</Label>
                <textarea id="horary-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder="Ask in your own words—for example, ‘Will my sister find a new job?’" className="min-h-36 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"/>
                <p className="text-xs text-slate-500">Be specific about who is involved and what you want to know. {question.trim().length < 10 ? "Enter at least 10 characters." : ""}</p>
              </div>
              {(cast.error?.message.toLowerCase().includes("who does") || cast.error?.message.toLowerCase().includes("clarify") || cast.error?.message.toLowerCase().includes("which person")) && <div role="alert" className="space-y-3 rounded-xl border border-amber-200/25 bg-amber-100/[0.05] p-4"><p className="text-sm text-amber-100">{cast.error.message}</p><Input aria-label="Clarification" value={clarificationAnswer} onChange={event => setClarificationAnswer(event.target.value)} placeholder="For example: my brother or mother" className="border-white/10 bg-black/20 text-white"/><Button type="button" onClick={() => { if (!clarificationAnswer.trim()) return; const answer = clarificationAnswer.trim().replace(/^my\s+/i, ""); setQuestion(current => `${current} [Clarification: my ${answer}]`); setClarificationAnswer(""); cast.reset(); }} disabled={!clarificationAnswer.trim()} className="bg-amber-200 text-slate-950 hover:bg-amber-100">Add clarification</Button></div>}
              <details className="rounded-xl border border-white/10 bg-black/10 p-4">
                <summary className="cursor-pointer text-sm text-slate-300">Advanced · manual house overrides (optional)</summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">Automatic assignments remain the default. Experts may override the person’s radical house and the matter house relative to that person.</p>
                <label className="mt-3 block text-xs text-slate-300"><input type="checkbox" checked={expertOverrides} onChange={event => setExpertOverrides(event.target.checked)} className="mr-2"/>Enable manual house overrides</label>
                {expertOverrides && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-300">Person’s radical house<select value={subjectHouse} onChange={event => setSubjectHouse(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-sm text-white"><option value="">Automatic</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>House {i+1}</option>)}</select></label><label className="text-xs text-slate-300">Matter house from that person<select value={topicHouse} onChange={event => setTopicHouse(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-sm text-white"><option value="">Automatic</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>House {i+1}</option>)}</select></label></div>}
              </details>
              <details open={!locationIsResolved} className="rounded-xl border border-white/10 bg-black/10 p-4">
                <summary className="cursor-pointer text-sm text-slate-300">Question location {locationIsResolved ? "· detected" : "· enter city if location access is unavailable"}</summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="horary-location" className="text-slate-200">Where were you when you asked?</Label>
                <div className="flex flex-wrap gap-2">
                  <Input id="horary-location" value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder="City, region, country" className="min-w-[180px] flex-1 border-white/10 bg-black/20 text-white"/>
                  <Button type="button" variant="outline" onClick={resolvePlace} disabled={geocode.isFetching || locationQuery.trim().length < 2} className="shrink-0 border-white/10 bg-white/[0.04] text-cyan-100 hover:bg-white/[0.08]">
                    <MapPin className="mr-2 h-4 w-4"/>{geocode.isFetching ? "Resolving" : "Resolve"}
                  </Button>
                  <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={isLocating} className="shrink-0 border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20">
                    {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Navigation className="mr-2 h-4 w-4"/>}
                    {isLocating ? "Locating..." : "Use GPS"}
                  </Button>
                </div>
                {gpsError && <p className="text-xs text-rose-300">{gpsError}</p>}
                {locationIsResolved && place && <p className="text-xs text-emerald-200">{place.label} · {place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}° · {place.timezone}</p>}
                {geocode.error && <p className="text-xs text-rose-300">{geocode.error.message}</p>}
                {place && !locationIsResolved && <p className="text-xs text-amber-200">Resolve this location again before casting the question chart.</p>}
              </div>
              </details>
              {cast.error && <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-200">{cast.error.message}</div>}
              <Button type="button" onClick={castQuestion} disabled={!canCast} className="h-12 w-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50">{cast.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Casting the question chart and preparing your reading…</> : <><Orbit className="mr-2 h-4 w-4"/>Cast chart & interpret</>}</Button>
            </CardContent>
          </Card>

          <Card className="border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.07] to-violet-100/[0.035] text-slate-100">
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><Clock3 className="h-5 w-5 text-cyan-200"/>How the judgment works</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-400"><p>The chart is calculated for the question’s local date, time, and resolved location using Bible Believers Astrology’s tropical ephemeris with geocentric planetary longitudes and Equal House cusps from the calculated Ascendant. The Moon may also expose a separate topocentric, parallax-corrected longitude; houses and aspects use the canonical geocentric value.</p><p>The question-intelligence layer identifies each person and matter from context, then applies radical and turned-house rules independently. It records the exact supporting wording and each house ruler; it does not force every question into a 1st-versus-7th-house pattern. The expanded evidence also lists upcoming exact planetary contacts and stations; those are astronomical dates, not predictions of real-world events.</p><p className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-slate-500">This is reflective astrological interpretation—not certainty, a guarantee, or a substitute for medical, legal, or financial advice. The feature will say when a traditional factor has not been calculated rather than inventing it.</p></CardContent>
          </Card>
        </section>

        {horary && <section className="mt-8 flex flex-col space-y-6">
          <Card className="order-2 border-cyan-200/15 bg-white/[0.035] text-slate-100">
            <CardHeader className="border-b border-white/10"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Question chart evidence</p><CardTitle className="mt-2 max-w-3xl font-serif text-2xl text-white">{horary.chart.question}</CardTitle></div><span className="inline-flex items-center gap-2 text-xs text-slate-400"><Clock3 className="h-4 w-4"/>{new Date(horary.chart.askedAt).toLocaleString(undefined, { timeZone: horary.chart.timezone })} local</span></div><p className="mt-2 text-xs text-slate-500">{horary.chart.location} · {horary.chart.houseSystem}</p></CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <details className="rounded-xl border border-cyan-200/20 bg-cyan-100/[0.035] p-4"><summary className="cursor-pointer text-sm font-medium text-cyan-100">Why these houses?</summary><p className="mt-2 text-xs leading-5 text-slate-400">Each assignment below is based on traditional radical-house doctrine, with turned houses counted from the identified person where needed. The quoted wording shows what in your question triggered the assignment.</p><p className="mt-3 text-xs leading-5 text-slate-300"><strong className="text-white">Interpreted action:</strong> {horary.chart.houseSelection.questionIntent.action}. <strong className="text-white">Desired outcome:</strong> {horary.chart.houseSelection.questionIntent.desiredOutcome}</p><p className="mt-1 text-xs text-slate-400"><strong className="text-white">Events and objects:</strong> {[...horary.chart.houseSelection.questionIntent.events, ...horary.chart.houseSelection.questionIntent.objects].join(" · ")}</p><div className="mt-3 space-y-3">{horary.chart.houseSelection.assignments.map(row=><div key={row.id} className="rounded-lg border border-white/10 bg-black/15 p-3"><p className="text-sm font-medium text-white">{row.label} · House {row.house} · ruler {row.ruler}</p><p className="mt-1 text-xs text-amber-100">Question wording: “{row.wording}”</p><p className="mt-1 text-xs leading-5 text-slate-400">{row.reasoning}</p></div>)}</div><p className="mt-3 text-xs text-slate-400">Other resolved significators: {horary.chart.houseSelection.significators.map(row=>`${row.planet} (${row.roles.join(", ")})`).join("; ")}</p></details>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Querent · House 1</p><p className="mt-2 text-lg font-medium text-cyan-100">{horary.chart.querentRuler}</p><p className="text-xs text-slate-500">Ascendant {horary.chart.ascendant.display} · {horary.chart.ascendant.sign}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Person asked about · House {horary.chart.subjectHouse}</p><p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.subjectRuler}</p><p className="text-xs text-slate-500">{horary.chart.subject === "querent" ? "Same as the querent" : horary.chart.houseSelection.assignments.find(row => row.role === "person")?.reasoning}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Matter · chart House {horary.chart.actualTopicHouse}</p><p className="mt-2 text-lg font-medium text-violet-100">{horary.chart.topicRuler}</p><p className="text-xs text-slate-500">Relative House {horary.chart.topicHouse} · {horary.chart.topicLabel}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Moon · co-significator</p><p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.moon.display}</p><p className="text-xs text-slate-500">{horary.chart.moon.sign} · House {horary.chart.moon.house}{horary.chart.moon.retrograde ? " · retrograde" : ""}</p></div></div>
              <details className="group rounded-xl border border-white/10 bg-black/10 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-200">Inspect calculated placements, houses, and major contacts</summary><div className="mt-4 grid gap-5 xl:grid-cols-2"><div><p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">Classical planets</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Planet</th><th className="py-2 pr-3">Position</th><th className="py-2">House</th></tr></thead><tbody className="divide-y divide-white/5">{horary.chart.placements.filter(row => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(row.name)).map(row => <tr key={row.name}><td className="py-2 pr-3 text-slate-200">{row.name}{row.retrograde ? " ℞" : ""}</td><td className="py-2 pr-3 font-mono text-cyan-100">{row.display}</td><td className="py-2 text-slate-400">{row.house}</td></tr>)}</tbody></table></div></div><div><p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">House cusps and rulers</p><div className="grid grid-cols-2 gap-2">{horary.chart.houses.map(row => <div key={row.house} className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-400"><span className="text-slate-200">H{row.house}</span> {row.sign} · {row.ruler}<span className="block font-mono text-[10px] text-slate-600">{formatLongitude(row.longitude)}</span></div>)}</div><p className="mb-2 mt-5 text-xs uppercase tracking-[.16em] text-slate-500">Relevant major aspects · 5° orb</p>{horary.chart.relevantAspects.length ? <div className="flex flex-wrap gap-2">{horary.chart.relevantAspects.map((aspect, index) => <span key={`${aspect.first}-${aspect.second}-${index}`} className="rounded-full border border-cyan-200/10 bg-cyan-100/[0.04] px-2.5 py-1 text-[11px] text-cyan-100">{aspect.first} {aspect.aspect} {aspect.second} · {aspect.orb}° {aspect.phase}</span>)}</div> : <p className="text-xs text-slate-500">No close major contact among these significators was calculated.</p>}</div></div><HoraryLookaheadEvidence chart={horary.chart} /></details>
              <p className="text-xs text-slate-500">Technical evidence is optional; the answer above is the primary reading. Interpretation remains symbolic and provisional, and the same question chart stays fixed for this conversation.</p>
              <TraditionalHoraryEvidence chart={horary.chart} />
            </CardContent>
          </Card>

          <div className="order-3"><FrameRelationshipPanel rows={horary.chart.placements as unknown as import("../../../server/astronomy").ChartRow[]} title="God's View of the Horary Agent" intro="The horary testimony remains primary. This panel adds the broader fixed zodiac frame and explains how the same question-time positions are translated through the local horary houses." /></div>

          <div className="order-1"><HoraryChamber2050 chart={horary.chart} reading={horary.reading}/></div>

          <Card className="order-4 overflow-hidden border-violet-200/15 bg-white/[0.035] text-slate-100"><CardHeader className="border-b border-white/10"><CardTitle className="flex items-center gap-2 font-serif text-2xl"><MessageCircle className="h-5 w-5 text-violet-200"/>Continue with this chart</CardTitle><p className="text-sm leading-6 text-slate-400">Ask what a specific testimony means or challenge the reading. Follow-ups use this same question chart, not a new or silently recalculated chart.</p></CardHeader><CardContent className="space-y-3 p-4 sm:p-6"><AIChatBox messages={messages} onSendMessage={sendFollowUp} isLoading={followUp.isPending} height="540px" placeholder="Ask a follow-up about this horary judgment…" emptyStateMessage="Your horary chart is ready for follow-up questions." suggestedPrompts={["Which chart factor most strongly supports that conclusion?", "What is the main uncertainty or counter-testimony?", "What practical next step follows from this judgment?"]}/>{followUp.error && <p role="alert" className="text-sm text-rose-300">{followUp.error.message}</p>}</CardContent></Card>
          <div className="order-5"><HoraryOrrery natal={horary.chart.natalChart} transit={horary.chart.transitChart} god={horary.chart.godChart}/></div>
        </section>}

        <footer className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-600"><Moon className="h-3.5 w-3.5"/>A question chart is a distinct horary reading; it does not modify your natal chart.</footer>
      </main>
    </div>
  );
}
