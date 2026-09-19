import { useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { GuardianVoiceButton, speakGuardian } from "@/components/GuardianVoiceButton";

type ChatMessage = { role: "user" | "assistant"; content: string };

const starterPrompts = [
  "How do I use Firmament?",
  "What do I need for my natal chart?",
  "What are transits and the chart wheel?",
];

export function WelcomeHost() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Welcome to Firmament. I’m your chart host. Ask me how to use this app, what information to enter, or what the natal and transit views mean." },
  ]);
  const [question, setQuestion] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const host = trpc.interpretation.host.useMutation({
    onSuccess: answer => { setMessages(current => [...current, { role: "assistant", content: answer }]); if (autoSpeak) speakGuardian(answer); },
  });

  const send = (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || host.isPending) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setQuestion("");
    host.mutate({ question: trimmed, history: next.slice(-10) });
  };

  return (
    <section aria-label="Firmament AI Host" className="firmament-host mb-8 overflow-hidden rounded-3xl border border-cyan-200/20 bg-gradient-to-br from-cyan-300/[0.12] via-violet-300/[0.09] to-white/[0.035] shadow-2xl shadow-cyan-950/20">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/15"><Bot className="h-5 w-5 text-cyan-200" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> Firmament Host</div><p className="mt-1 text-xs text-slate-400">Your guide to using the observatory</p></div>
            <div className="flex items-center gap-1.5"><button type="button" onClick={() => speakGuardian("Guardian voice is ready. Welcome to Firmament.")} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-300/[.06] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"><Volume2 className="h-3 w-3" /> Test voice</button><button type="button" onClick={() => setAutoSpeak(value => !value)} aria-pressed={autoSpeak} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] transition ${autoSpeak ? "border-violet-200/40 bg-violet-300/15 text-violet-100" : "border-white/10 bg-white/[.04] text-slate-500 hover:text-slate-300"}`}><span>{autoSpeak ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}</span>{autoSpeak ? "Voice replies" : "Voice off"}</button></div>
          </div>
          <div className="h-64 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4" aria-live="polite">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex items-start gap-2.5 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/15"><Bot className="h-3.5 w-3.5 text-cyan-200" /></div>}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-violet-400/20 text-violet-50" : "bg-white/[0.07] text-slate-200"}`}>{message.role === "assistant" ? <><Streamdown>{message.content}</Streamdown><div className="mt-1 flex justify-end"><GuardianVoiceButton text={message.content} /></div></> : message.content}</div>
              {message.role === "user" && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-300/15"><UserRound className="h-3.5 w-3.5 text-violet-200" /></div>}
            </div>)}
            {host.isPending && <div className="flex items-center gap-2 text-xs text-cyan-200/70"><Loader2 className="h-4 w-4 animate-spin" /> The host is thinking…</div>}
          </div>
          {host.error && <p className="mt-2 text-xs text-rose-200">The host is temporarily offline. The chart tools are still available. ({host.error.message})</p>}
          <div className="mt-3 flex gap-2"><Textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask the host how to use Firmament…" className="min-h-12 resize-none border-white/10 bg-black/20 text-slate-100" /><Button onClick={() => send()} disabled={!question.trim() || host.isPending} className="h-12 shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200" aria-label="Ask Firmament Host"><Send className="h-4 w-4" /></Button></div>
        </div>
        <div className="border-t border-white/10 bg-black/15 p-5 sm:p-7 lg:border-l lg:border-t-0"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Start here</p><h2 className="mt-2 font-serif text-2xl text-white">Not sure what to click?</h2><p className="mt-3 text-sm leading-6 text-slate-400">Ask me anything about entering your birth information, calculating a chart, reading houses, or understanding current transits.</p><div className="mt-5 space-y-2">{starterPrompts.map(prompt => <button key={prompt} type="button" onClick={() => send(prompt)} className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-left text-xs text-slate-300 transition hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-white">{prompt}</button>)}</div></div>
      </div>
    </section>
  );
}
