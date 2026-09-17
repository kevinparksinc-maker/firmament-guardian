import { useRef, useState } from "react";
import { BookOpen, Brain, Check, Compass, Loader2, MessageCircle, Mic, MicOff, Sparkles, WandSparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { AudioReader } from "@/components/AudioReader";
import type { ChartResult } from "../../../server/astronomy";

type ReadingMode = "natal" | "transit" | "combined";
type ChapterStatus = "pending" | "loading" | "complete" | "error";
type Chapter = { id: string; title: string; subtitle: string; focus: string; status: ChapterStatus; content?: string; error?: string };
type Interpretation = { intelligence: string; reading: string; generatedAt: string; chapters: Chapter[] };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
function followUpPrompts(question: string) {
  const q = question.toLowerCase();
  if (/relationship|love|partner|dating|marriage|friend|family|trust/.test(q)) return ["What pattern do I repeat when I feel emotionally unsafe?", "How can I set a boundary without closing my heart?", "What is this transit asking me to understand about reciprocity?"];
  if (/work|career|money|purpose|success|business|job|calling/.test(q)) return ["What strength in my chart am I underusing at work?", "Where might fear be shaping my career decisions?", "What practical choice would align me with this transit?"];
  if (/future|when|how long|change|next|timing|will/.test(q)) return ["What is the mature lesson beneath this current activation?", "What can I do now instead of waiting for certainty?", "What evidence would show that I am moving through this well?"];
  if (/feel|emotion|anxious|pressure|sad|angry|hurt|stress|overwhelm/.test(q)) return ["What need is underneath this reaction?", "How does my protective strategy help me—and what does it cost?", "What would self-respect look like in the next real-life moment?"];
  return ["What deeper pattern is this question pointing toward?", "How might this show up in an ordinary day or relationship?", "What honest choice would help me work with this transit?"];
}
const modes: Array<{ value: ReadingMode; label: string; short: string; description: string }> = [
  { value: "natal", label: "Natal chart", short: "The foundation", description: "Your enduring birth-chart story" },
  { value: "transit", label: "Transit reading", short: "The present chapter", description: "What the selected moment is activating" },
  { value: "combined", label: "Natal + transit", short: "The full picture", description: "Your foundation meeting the present moment" },
];
const prose = "prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-medium prose-headings:text-white prose-headings:tracking-tight prose-h2:mb-4 prose-h2:mt-2 prose-h2:text-2xl sm:prose-h2:text-3xl prose-h3:mb-2 prose-h3:mt-7 prose-h3:text-lg prose-h3:text-cyan-100 prose-p:my-4 prose-p:text-[15px] prose-p:leading-8 prose-p:text-slate-300 prose-li:my-2 prose-li:text-slate-300 prose-strong:text-cyan-100 prose-blockquote:border-cyan-300/40 prose-blockquote:text-slate-300";

export function InterpretationPanel({ chart }: { chart: ChartResult }) {
  const [mode, setMode] = useState<ReadingMode>("combined");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [oralQuestion, setOralQuestion] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastAnswer, setLastAnswer] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const generate = trpc.interpretation.generate.useMutation();
  const chapterMutation = trpc.interpretation.chapter.useMutation();
  const chat = trpc.interpretation.followUp.useMutation({ onSuccess: answer => { setLastAnswer(answer); setMessages(current => [...current, { role: "assistant", content: answer }]); } });
  const selected = modes.find(item => item.value === mode)!;

  const updateChapter = (id: string, patch: Partial<Chapter>) => setInterpretation(current => current ? { ...current, chapters: current.chapters.map(chapter => chapter.id === id ? { ...chapter, ...patch } : chapter) } : current);
  const generateChapterAt = async (base: Interpretation, index: number) => {
    const chapter = base.chapters[index];
    if (!chapter) return;
    setActiveChapter(chapter.id);
    updateChapter(chapter.id, { status: "loading", error: undefined });
    const completed = base.chapters.slice(0, index).filter(item => item.status === "complete").map(item => item.title);
    try {
      const result = await chapterMutation.mutateAsync({ chart, mode, intelligence: base.intelligence, chapterId: chapter.id as never, completedChapters: completed });
      setInterpretation(current => current ? { ...current, chapters: current.chapters.map(item => item.id === chapter.id ? { ...item, status: "complete", content: result } : item) } : current);
      setActiveChapter(null);
      const nextIndex = index + 1;
      if (nextIndex < base.chapters.length) await generateChapterAt({ ...base, chapters: base.chapters.map(item => item.id === chapter.id ? { ...item, status: "complete", content: result } : item) }, nextIndex);
    } catch (error) {
      updateChapter(chapter.id, { status: "error", error: error instanceof Error ? error.message : "This chapter could not be completed." });
      setActiveChapter(null);
    }
  };
  const run = async () => {
    setInterpretation(null); setMessages([]); setFollowUps([]); setActiveChapter("intelligence");
    try {
      const base = await generate.mutateAsync({ chart, mode });
      const initial = { ...base, chapters: base.chapters as Chapter[] };
      setInterpretation(initial);
      await generateChapterAt(initial, 0);
    } finally { setActiveChapter(null); }
  };
  const retryChapter = async (index: number) => { if (interpretation) await generateChapterAt(interpretation, index); };
  const send = (question: string, questionMode: ReadingMode = mode) => { if (!interpretation) return; setFollowUps(followUpPrompts(question)); const next = [...messages, { role: "user" as const, content: question }]; setMessages(next); chat.mutate({ chart, interpretation: { intelligence: interpretation.intelligence, reading: interpretation.chapters.filter(chapter => chapter.content).map(chapter => `## ${chapter.title}\n${chapter.content}`).join("\n\n") }, mode: questionMode, history: next.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system"), question }); };
  const submitOralQuestion = () => { const question = oralQuestion.trim(); if (!question || !interpretation || chat.isPending) return; send(question, "combined"); setOralQuestion(""); };
  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const SpeechRecognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition(); recognition.lang = "en-US"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = event => { let transcript = ""; for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index]?.[0]?.transcript ?? ""; setOralQuestion(transcript); };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; }; recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition; setIsListening(true); recognition.start();
  };
  const busy = Boolean(activeChapter) || generate.isPending || chapterMutation.isPending;
  const completedCount = interpretation?.chapters.filter(chapter => chapter.status === "complete").length ?? 0;

  return <section id="ai-reading" className="mt-10 scroll-mt-8 space-y-7 border-t border-white/10 pt-10 sm:mt-14 sm:pt-14">
    <div className="mx-auto max-w-4xl text-center"><div className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.28em] text-cyan-300"><BookOpen className="h-4 w-4"/> Your personal reading</div><h2 className="font-serif text-4xl leading-tight text-white sm:text-5xl">A story written in your sky</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">This is a private self-knowledge profile, not a data dump. Choose a layer and let the guide unfold the patterns, needs, gifts, defenses, relationships, and growth edges you may recognize in your own life.</p></div>
    <Card className="mx-auto max-w-5xl overflow-hidden border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.08] via-white/[0.035] to-violet-200/[0.06] text-slate-100 shadow-2xl shadow-cyan-950/20"><CardContent className="p-4 sm:p-6"><div className="mb-4 flex items-center gap-3 text-sm text-slate-300"><Compass className="h-4 w-4 text-cyan-300"/><span>What would you like to read?</span></div><div className="grid gap-3 md:grid-cols-3">{modes.map(item => <button key={item.value} type="button" onClick={() => { setMode(item.value); setInterpretation(null); setMessages([]); }} className={`group rounded-2xl border p-4 text-left transition-all sm:p-5 ${mode === item.value ? "border-cyan-300/60 bg-cyan-200/10 shadow-lg shadow-cyan-950/20" : "border-white/10 bg-black/10 hover:border-white/25 hover:bg-white/[0.06]"}`}><div className="flex items-start justify-between gap-3"><div><div className="text-base font-semibold text-white">{item.label}</div><div className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/70">{item.short}</div></div>{mode === item.value && <span className="rounded-full bg-cyan-300/15 p-1 text-cyan-200"><Check className="h-4 w-4"/></span>}</div><div className="mt-4 text-sm leading-6 text-slate-400">{item.description}</div></button>)}</div></CardContent></Card>
    {!interpretation && <div className="mx-auto max-w-5xl"><Button onClick={run} disabled={busy} className="h-12 w-full rounded-xl bg-cyan-400 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-300">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <WandSparkles className="mr-2 h-4 w-4"/>}{busy ? "Opening the first chapter…" : `Begin your ${selected.label.toLowerCase()}`}</Button></div>}
    {generate.error && <div className="mx-auto max-w-5xl rounded-2xl border border-rose-300/20 bg-rose-400/10 p-5 text-sm leading-6 text-rose-100"><div className="font-medium">The chart map could not be opened.</div><div className="mt-1 text-rose-200/80">{generate.error.message}</div><Button variant="outline" onClick={run} className="mt-4 border-rose-200/30 bg-transparent text-rose-100 hover:bg-rose-100/10">Try again</Button></div>}
    {interpretation ? <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs uppercase tracking-[0.24em] text-cyan-300">{selected.short}</div><h3 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Your {selected.label.toLowerCase()}</h3><p className="mt-2 text-sm text-slate-400">A deep reading for {chart.input.location}, unfolding one substantial chapter at a time.</p></div><div className="text-left sm:text-right"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Your book</div><div className="mt-1 text-sm text-cyan-200">{completedCount} of {interpretation.chapters.length} chapters read</div></div></div>
      <Card className="overflow-hidden border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.07] to-white/[0.025] text-slate-100"><CardHeader className="border-b border-cyan-200/10 px-5 py-5 sm:px-7"><CardTitle className="flex items-center gap-3 font-serif text-2xl text-white"><Brain className="h-5 w-5 text-cyan-300"/>At a glance</CardTitle><p className="text-sm text-slate-400">The chart map that gives every chapter its context. This factual map is available even when deeper AI chapters are temporarily unavailable.</p></CardHeader><CardContent className={`space-y-5 px-5 py-6 sm:px-8 sm:py-8 ${prose}`}><AudioReader text={interpretation.intelligence} label="Listen to the chart map"/><Streamdown>{interpretation.intelligence}</Streamdown></CardContent></Card>
      <div className="space-y-4">{interpretation.chapters.map((chapter, index) => <Card key={chapter.id} className={`overflow-hidden text-slate-100 ${chapter.status === "complete" ? "border-white/10 bg-white/[0.035]" : chapter.status === "loading" ? "border-cyan-300/30 bg-cyan-100/[0.05]" : chapter.status === "error" ? "border-rose-300/20 bg-rose-400/[0.05]" : "border-white/10 bg-black/10"}`}><CardHeader className="cursor-pointer px-5 py-5 sm:px-7" onClick={() => chapter.status === "complete" && setActiveChapter(activeChapter === chapter.id ? null : chapter.id)}><div className="flex items-start gap-4"><div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${chapter.status === "complete" ? "bg-cyan-300/15 text-cyan-200" : "bg-white/[0.07] text-slate-500"}`}>{chapter.status === "complete" ? <Check className="h-4 w-4"/> : index + 1}</div><div className="min-w-0 flex-1"><div className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Chapter {index + 1}</div><CardTitle className="mt-1 font-serif text-2xl text-white">{chapter.title}</CardTitle><p className="mt-1 text-sm text-slate-400">{chapter.subtitle}</p></div>{chapter.status === "loading" && <Loader2 className="mt-2 h-5 w-5 animate-spin text-cyan-300"/>}</div></CardHeader>{chapter.status === "loading" && <CardContent className="px-5 pb-7 pt-0 text-sm leading-7 text-slate-400 sm:px-7">The guide is listening carefully to this part of the chart…</CardContent>}{chapter.status === "error" && <CardContent className="px-5 pb-7 pt-0 sm:px-7"><p className="text-sm leading-6 text-rose-200">{chapter.error}</p><Button variant="outline" onClick={() => retryChapter(index)} className="mt-4 border-rose-200/30 bg-transparent text-rose-100 hover:bg-rose-100/10">Retry this chapter</Button></CardContent>}{chapter.status === "complete" && activeChapter === chapter.id && <CardContent className={`space-y-5 border-t border-white/10 px-5 py-7 sm:px-8 sm:py-10 ${prose}`}><AudioReader text={chapter.content ?? ""} label={`Listen to ${chapter.title}`}/><Streamdown>{chapter.content}</Streamdown></CardContent>}</Card>)}</div>
      {chapterMutation.error && !interpretation.chapters.some(chapter => chapter.status === "error") && <p className="text-sm text-rose-300">A chapter could not be completed. Your completed chapters are safe; retry the unfinished chapter above.</p>}
      <Card className="overflow-hidden border-cyan-200/15 bg-gradient-to-br from-cyan-100/[0.06] to-violet-100/[0.04] text-slate-100"><CardHeader className="border-b border-cyan-200/10 px-5 py-5 sm:px-7"><CardTitle className="flex items-center gap-3 font-serif text-2xl text-white"><Mic className="h-5 w-5 text-cyan-300"/>Ask your natal + transit chart</CardTitle><p className="text-sm leading-6 text-slate-400">Ask any question aloud or type it below. The guide interprets your answer from the birth chart together with the selected transit moment.</p></CardHeader><CardContent className="space-y-4 p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row"><textarea value={oralQuestion} onChange={event => setOralQuestion(event.target.value)} placeholder="For example: Why do I feel so much pressure in my relationships right now?" className="min-h-24 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"/><div className="flex shrink-0 gap-2 sm:flex-col"><Button type="button" variant="outline" onClick={toggleListening} className={`h-11 border-cyan-200/20 bg-cyan-100/5 ${isListening ? "text-rose-200" : "text-cyan-100"}`}>{isListening ? <MicOff className="mr-2 h-4 w-4"/> : <Mic className="mr-2 h-4 w-4"/>}{isListening ? "Stop" : "Speak"}</Button><Button type="button" onClick={submitOralQuestion} disabled={!oralQuestion.trim() || chat.isPending} className="h-11 bg-cyan-400 text-slate-950 hover:bg-cyan-300">{chat.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}Ask</Button></div></div>{isListening && <p className="text-xs text-cyan-200">Listening… speak naturally, then tap Ask.</p>}{lastAnswer && <div className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-6"><div className="text-xs uppercase tracking-[0.2em] text-cyan-300">The chart’s answer</div><AudioReader text={lastAnswer} label="Listen to the answer"/><div className={prose}><Streamdown>{lastAnswer}</Streamdown></div></div>}<p className="text-xs leading-5 text-slate-500">Voice input uses your browser’s microphone permission. If voice input is unavailable, type your question instead.</p>{followUps.length > 0 && <div className="space-y-3 border-t border-white/10 pt-4"><div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Go deeper</div><div className="grid gap-2 sm:grid-cols-3">{followUps.map(prompt => <button key={prompt} type="button" onClick={() => { setOralQuestion(prompt); send(prompt, "combined"); }} disabled={chat.isPending} className="rounded-xl border border-cyan-200/15 bg-cyan-100/[0.04] p-3 text-left text-sm leading-5 text-slate-300 transition hover:border-cyan-200/40 hover:bg-cyan-100/[0.09] disabled:opacity-50">{prompt}</button>)}</div></div>}</CardContent></Card><Card className="overflow-hidden border-violet-200/15 bg-violet-100/[0.035] text-slate-100"><CardHeader className="border-b border-violet-200/10 px-5 py-5 sm:px-7"><CardTitle className="flex items-center gap-3 font-serif text-2xl text-white"><MessageCircle className="h-5 w-5 text-violet-300"/>Conversation history</CardTitle><p className="text-sm text-slate-400">Continue asking about any completed chapter or pattern.</p></CardHeader><CardContent className="p-0"><AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="420px" placeholder="Ask about your reading…" emptyStateMessage="Ask about a pattern, placement, or passage" suggestedPrompts={["Tell me more about the central theme.", "How might this show up in relationships?", "What is the honest lesson here?", "What should I pay attention to in daily life?"]}/></CardContent></Card>
      {chat.error && <p className="text-sm text-rose-300">{chat.error.message}</p>}
    </div> : <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-cyan-200/15 bg-cyan-100/[0.02] p-8 text-center text-sm leading-7 text-slate-400 sm:p-10">Choose a reading above. The guide will build the chart map first, then unfold a full-depth personal book one chapter at a time. Completed chapters remain available if a later chapter needs a retry.</div>}
  </section>;
}
