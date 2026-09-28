import { useState } from "react";
import { ArrowLeft, Clock3, Loader2, MapPin, MessageCircle, Moon, Orbit, Sparkles, Sun } from "lucide-react";
import { Link } from "wouter";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { HORARY_TOPICS } from "@shared/horary";
import { formatLongitude } from "@shared/hybrid";
import type { HoraryChart } from "../../../server/horary";

function localDateTime() {
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

type HoraryResult = { chart: HoraryChart; reading: string };

export default function HoraryPage() {
  const initialMoment = localDateTime();
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState<"querent" | "other">("querent");
  const [topicHouse, setTopicHouse] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [place, setPlace] = useState<ResolvedPlace | null>(null);
  const [date, setDate] = useState(initialMoment.date);
  const [time, setTime] = useState(initialMoment.time);
  const [horary, setHorary] = useState<HoraryResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

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

  const resolvePlace = async () => {
    if (locationQuery.trim().length < 2) return;
    const result = await geocode.refetch();
    if (!result.data) return;
    const resolved = { ...result.data, query: result.data.label.trim() };
    setPlace(resolved);
    setLocationQuery(result.data.label);
  };

  const locationIsResolved = Boolean(place && place.query === locationQuery.trim());
  const canCast = question.trim().length >= 10 && topicHouse !== "" && locationIsResolved && date.length === 10 && time.length === 5 && !cast.isPending;

  const castQuestion = () => {
    if (!canCast || !place) return;
    cast.reset();
    setHorary(null);
    setMessages([]);
    followUp.reset();
    cast.mutate({
      question: question.trim(),
      subject,
      topicHouse: Number(topicHouse),
      location: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
      date,
      time,
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
        <header className="mb-8 border-b border-white/10 pb-8">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-cyan-200"><span className="h-px w-8 bg-cyan-200"/>Firmament / Horary</div>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight text-white md:text-6xl">One question. One chart. A careful answer.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">Ask a clear, present-tense question. Firmament will cast a chart for the moment and place you provide, explain the testimony in connected plain language, and keep follow-up chat anchored to that same chart.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <Card className="border-white/10 bg-white/[0.045] text-slate-100 shadow-2xl shadow-black/20">
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Sparkles className="h-5 w-5 text-cyan-200"/>Ask your horary question</CardTitle><p className="text-sm leading-6 text-slate-400">Use the time and place where the question became clear and important to you. Keep it to one sincere question.</p></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label htmlFor="horary-question" className="text-slate-200">Your question</Label><textarea id="horary-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder="For example: Is this the right time to accept the job offer I received?" className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"/><p className="text-xs text-slate-500">One specific question works better than several questions combined. {question.trim().length < 10 ? "Enter at least 10 characters." : ""}</p></div>
              <div className="space-y-2"><Label htmlFor="horary-subject" className="text-slate-200">Who is the question about?</Label><select id="horary-subject" value={subject} onChange={event => setSubject(event.target.value as "querent" | "other")} className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/50"><option value="querent">Me — I am the person in the question</option><option value="other">Another person — I am asking about them</option></select><p className="text-xs text-slate-500">You remain the querent (House 1). Another person is represented by House 7.</p></div>
              <div className="space-y-2"><Label htmlFor="horary-topic" className="text-slate-200">What area relative to {subject === "querent" ? "me" : "this person"}?</Label><select id="horary-topic" value={topicHouse} onChange={event => setTopicHouse(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/50"><option value="">Choose the relevant topic house</option>{HORARY_TOPICS.map(topic => <option key={topic.house} value={topic.house}>House {topic.house} from {subject === "querent" ? "me" : "this person"} — {topic.label}</option>)}</select><p className="text-xs text-slate-500">The asker remains House 1; another person is House 7. For someone else, the topic house is turned from House 7—for example, their 10th house is actual chart House 4.</p></div>
              <div className="space-y-2"><Label htmlFor="horary-location" className="text-slate-200">Where were you when you asked?</Label><div className="flex gap-2"><Input id="horary-location" value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder="City, region, country" className="border-white/10 bg-black/20 text-white"/><Button type="button" variant="outline" onClick={resolvePlace} disabled={geocode.isFetching || locationQuery.trim().length < 2} className="shrink-0 border-white/10 bg-white/[0.04] text-cyan-100 hover:bg-white/[0.08]"><MapPin className="mr-2 h-4 w-4"/>{geocode.isFetching ? "Resolving" : "Resolve"}</Button></div>{locationIsResolved && place && <p className="text-xs text-emerald-200">{place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}° · {place.timezone}</p>}{geocode.error && <p className="text-xs text-rose-300">{geocode.error.message}</p>}{place && !locationIsResolved && <p className="text-xs text-amber-200">Resolve this location again before casting the question chart.</p>}</div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="horary-date" className="text-slate-200">Local date asked</Label><Input id="horary-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="border-white/10 bg-black/20 text-white"/></div><div className="space-y-2"><Label htmlFor="horary-time" className="text-slate-200">Local time asked</Label><Input id="horary-time" type="time" value={time} onChange={event => setTime(event.target.value)} className="border-white/10 bg-black/20 text-white"/></div></div>
              {cast.error && <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-200">{cast.error.message}</div>}
              <Button type="button" onClick={castQuestion} disabled={!canCast} className="h-12 w-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50">{cast.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Casting the question chart and preparing your reading…</> : <><Orbit className="mr-2 h-4 w-4"/>Cast chart & interpret</>}</Button>
            </CardContent>
          </Card>

          <Card className="border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.07] to-violet-100/[0.035] text-slate-100">
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><Clock3 className="h-5 w-5 text-cyan-200"/>How the judgment works</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-400"><p>The chart is calculated for the question’s local date, time, and resolved location using Firmament’s existing tropical ephemeris and Polich–Page houses.</p><p>The first version distinguishes you (House 1), the person asked about (House 1 or 7), and the selected topic house counted from that person. It calculates their rulers, the Moon, and close major aspects so the reading can explain what supports, complicates, or leaves the answer uncertain.</p><p className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-slate-500">This is reflective astrological interpretation—not certainty, a guarantee, or a substitute for medical, legal, or financial advice. The feature will say when a traditional factor has not been calculated rather than inventing it.</p></CardContent>
          </Card>
        </section>

        {horary && <section className="mt-8 space-y-6">
          <Card className="border-cyan-200/15 bg-white/[0.035] text-slate-100">
            <CardHeader className="border-b border-white/10"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Question chart evidence</p><CardTitle className="mt-2 max-w-3xl font-serif text-2xl text-white">{horary.chart.question}</CardTitle></div><span className="inline-flex items-center gap-2 text-xs text-slate-400"><Clock3 className="h-4 w-4"/>{new Date(horary.chart.askedAt).toLocaleString(undefined, { timeZone: horary.chart.timezone })} local</span></div><p className="mt-2 text-xs text-slate-500">{horary.chart.location} · {horary.chart.houseSystem}</p></CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Querent · House 1</p><p className="mt-2 text-lg font-medium text-cyan-100">{horary.chart.querentRuler}</p><p className="text-xs text-slate-500">Ascendant {horary.chart.ascendant.display} · {horary.chart.ascendant.sign}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Person asked about · House {horary.chart.subjectHouse}</p><p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.subjectRuler}</p><p className="text-xs text-slate-500">{horary.chart.subject === "querent" ? "Same as the querent" : "Turned House 7 person"}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Matter · chart House {horary.chart.actualTopicHouse}</p><p className="mt-2 text-lg font-medium text-violet-100">{horary.chart.topicRuler}</p><p className="text-xs text-slate-500">Relative House {horary.chart.topicHouse} · {horary.chart.topicLabel}</p></div><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Moon · co-significator</p><p className="mt-2 text-lg font-medium text-amber-100">{horary.chart.moon.display}</p><p className="text-xs text-slate-500">{horary.chart.moon.sign} · House {horary.chart.moon.house}{horary.chart.moon.retrograde ? " · retrograde" : ""}</p></div></div>
              <details className="group rounded-xl border border-white/10 bg-black/10 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-200">Inspect calculated placements, houses, and major contacts</summary><div className="mt-4 grid gap-5 xl:grid-cols-2"><div><p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">Classical planets</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Planet</th><th className="py-2 pr-3">Position</th><th className="py-2">House</th></tr></thead><tbody className="divide-y divide-white/5">{horary.chart.placements.filter(row => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(row.name)).map(row => <tr key={row.name}><td className="py-2 pr-3 text-slate-200">{row.name}{row.retrograde ? " ℞" : ""}</td><td className="py-2 pr-3 font-mono text-cyan-100">{row.display}</td><td className="py-2 text-slate-400">{row.house}</td></tr>)}</tbody></table></div></div><div><p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">House cusps and rulers</p><div className="grid grid-cols-2 gap-2">{horary.chart.houses.map(row => <div key={row.house} className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-400"><span className="text-slate-200">H{row.house}</span> {row.sign} · {row.ruler}<span className="block font-mono text-[10px] text-slate-600">{formatLongitude(row.longitude)}</span></div>)}</div><p className="mb-2 mt-5 text-xs uppercase tracking-[.16em] text-slate-500">Relevant major aspects · 5° orb</p>{horary.chart.relevantAspects.length ? <div className="flex flex-wrap gap-2">{horary.chart.relevantAspects.map((aspect, index) => <span key={`${aspect.first}-${aspect.second}-${index}`} className="rounded-full border border-cyan-200/10 bg-cyan-100/[0.04] px-2.5 py-1 text-[11px] text-cyan-100">{aspect.first} {aspect.aspect} {aspect.second} · {aspect.orb}° {aspect.phase}</span>)}</div> : <p className="text-xs text-slate-500">No close major contact among these significators was calculated.</p>}</div></div></details>
              <p className="text-xs text-slate-500">Evidence first; interpretation remains symbolic and provisional. The same question chart stays fixed for this conversation.</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-cyan-200/15 bg-white/[0.035] text-slate-100"><CardHeader className="border-b border-white/10"><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Sun className="h-5 w-5 text-cyan-200"/>The horary reading</CardTitle><p className="text-sm text-slate-400">The interpretation moves from the question and its significators to the Moon, the supporting or conflicting testimony, and a practical next step.</p></CardHeader><CardContent className="p-0"><div className="p-4 sm:p-6"><div className="prose prose-invert max-w-none prose-headings:text-white prose-p:leading-7 prose-p:text-slate-300 prose-strong:text-cyan-100">{horary.reading}</div></div></CardContent></Card>

          <Card className="overflow-hidden border-violet-200/15 bg-white/[0.035] text-slate-100"><CardHeader className="border-b border-white/10"><CardTitle className="flex items-center gap-2 font-serif text-2xl"><MessageCircle className="h-5 w-5 text-violet-200"/>Continue with this chart</CardTitle><p className="text-sm leading-6 text-slate-400">Ask what a specific testimony means or challenge the reading. Follow-ups use this same question chart, not a new or silently recalculated chart.</p></CardHeader><CardContent className="space-y-3 p-4 sm:p-6"><AIChatBox messages={messages} onSendMessage={sendFollowUp} isLoading={followUp.isPending} height="540px" placeholder="Ask a follow-up about this horary judgment…" emptyStateMessage="Your horary chart is ready for follow-up questions." suggestedPrompts={["Which chart factor most strongly supports that conclusion?", "What is the main uncertainty or counter-testimony?", "What practical next step follows from this judgment?"]}/>{followUp.error && <p role="alert" className="text-sm text-rose-300">{followUp.error.message}</p>}</CardContent></Card>
        </section>}

        <footer className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-600"><Moon className="h-3.5 w-3.5"/>A question chart is a distinct horary reading; it does not modify your natal chart or the sports simulation project.</footer>
      </main>
    </div>
  );
}
