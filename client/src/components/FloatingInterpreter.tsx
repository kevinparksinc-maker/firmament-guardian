import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
const Chat = lazy(() =>
  import("./AIChatBox").then(module => ({ default: module.AIChatBox }))
);
type Message = { role: "user" | "assistant"; content: string };

export function FloatingInterpreter() {
  const { chart, energyChart, profile } = useProfileSession();
  const [path] = useLocation();
  const currentChart =
    path.startsWith("/energy") || path === "/forecast" ? energyChart : chart;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const host = trpc.interpretation.host.useMutation();
  const generation = useRef(0);
  const identity =
    profile?.id ||
    `${profile?.date || ""}:${profile?.time || ""}:${profile?.location || ""}`;
  useEffect(() => {
    generation.current++;
    setMessages([]);
    host.reset();
    return () => {
      generation.current++;
    };
  }, [identity]);
  const send = (question: string) => {
    if (host.isPending || !question.trim()) return;
    const request = generation.current;
    const history = [
      ...messages,
      { role: "user" as const, content: question.trim() },
    ];
    setMessages(history);
    host.mutate(
      {
        question: question.trim(),
        history: history.slice(-12),
        chart: currentChart || undefined,
        mode: currentChart?.readingScope || "natal",
      },
      {
        onSuccess: answer => {
          if (generation.current === request)
            setMessages(current => [
              ...current,
              { role: "assistant", content: answer },
            ]);
        },
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open AI guide"
          title="Ask the AI guide"
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/60 bg-[#14213b] text-amber-100 shadow-lg shadow-black/50 hover:bg-[#203251] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Sparkles size={25} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] overflow-y-auto border-white/15 bg-[#080f1f] p-4 text-slate-100 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Your AI guide
          </DialogTitle>
          <DialogDescription className="pr-6 text-slate-400">
            Ask a question or explore a pattern.{" "}
            {currentChart
              ? "Your calculated chart evidence is connected."
              : "Calculate a chart for personal interpretation."}
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<p role="status">Opening your chat…</p>}>
          <Chat
            messages={messages}
            onSendMessage={send}
            isLoading={host.isPending}
            height="min(55dvh, 500px)"
            emptyStateMessage="What would you like to explore?"
            suggestedPrompts={[
              "Help me understand my chart",
              "What should I focus on today?",
            ]}
          />
        </Suspense>
        {host.error && (
          <p role="alert" className="text-sm text-rose-200">
            {host.error.message} Your conversation is still here; try again.
          </p>
        )}
        {messages.length > 0 && (
          <button
            type="button"
            disabled={host.isPending}
            onClick={() => {
              generation.current++;
              setMessages([]);
              host.reset();
            }}
            className="justify-self-start text-xs text-slate-400 underline"
          >
            Clear conversation
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
