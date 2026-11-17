import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

const STAGES = [
  { title: "Birth, Parents, Childhood & School", period: "Early roots & school years", focus: "core nature, mother and father dynamics, home atmosphere, inherited burdens, school learning style, and early friendships" },
  { title: "Gifts, Hobbies, Friends & Youth", period: "Adolescence & emerging passions", focus: "natural gifts vs. hidden potential, concrete hobbies and interests, friendships, hidden rivals, loyalty, betrayal, and early love" },
  { title: "Money, Career, Love & Marriage", period: "Building adulthood", focus: "earning power, debt and financial hardship vs. lasting wealth, employment vs. business ownership, attraction, sex, marriage, heartbreak, and your own part in conflict" },
  { title: "Children, Health, Hardship & Survival", period: "Tests, family & rebuilding", focus: "children and parenting, daily health habits without medical diagnoses, major setbacks, injustice, poor choices, and how you rebuild" },
  { title: "Faith, Turning Points & Later Years", period: "Purpose, timing & legacy", focus: "faith and relationship with God or core beliefs, turning points anchored in calculated timing cycles, greatest blessings, hardest lessons, and legacy" },
] as const;

export function LifeStoryInterpreter({ chart }: { chart: ChartResult }) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<Record<number, string>>({});
  const [active, setActive] = useState<number | null>(null);
  const story = trpc.interpretation.host.useMutation();

  const read = async (index: number) => {
    if (story.isPending) return;
    setActive(index);
    if (chapters[index]) return;
    const stage = STAGES[index];
    const question = [
      "Write a rich, continuous, plainspoken LIFE STORY chapter using ONLY the attached calculated natal chart and computed canon/evidence layers.",
      `Chapter: ${stage.title}. Life stage: ${stage.period}. Explore: ${stage.focus}.`,
      "Write like a direct, perceptive reader—NEVER like a psychiatrist or therapist (no shrink jargon). Separate Natural Gifts, Hidden Potential, Developed Strengths, and Weaknesses; deduce concrete hobbies/interests only when backed by chart testimony; explain WHY the astrological factors (planets, rulers, houses, aspects, Nakshatras/Manazil, Lots, Fixed Stars) lead to each conclusion.",
      "Do not invent biographical events, trauma, marriage dates, or medical diagnoses. Anchor any timing statements strictly in calculated timing cycles; where timing cycles are absent, state natal themes clearly. Include honest shortcomings or what the person themselves contributes to difficulties when supported by testimony.",
      "Make this a substantial, cohesive narrative chapter in plain 2026 English—not a bullet list of disconnected placements.",
    ].join("\n\n");
    try {
      const answer = await story.mutateAsync({ chart, mode: "natal", history: [], question });
      setChapters(previous => ({ ...previous, [index]: answer }));
    } catch {
      // The mutation error is shown below and the chapter can be retried.
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-violet-950/40 to-slate-950 p-4 shadow-[0_0_28px_rgba(217,70,239,0.13)] sm:p-6" aria-label="Life Story Interpreter">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-fuchsia-200"><BookOpen className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Firmament Life Story</span></div>
          <h2 className="mt-2 font-serif text-2xl text-white">The Story Within Your Stars</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">A deep, chapter-by-chapter portrait drawn from your calculated birth chart and the existing Master Interpreter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/life-story"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span>Open Dedicated Life Story Suite →</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            className="rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/15 px-4 py-3 text-sm font-semibold text-fuchsia-100 shadow-[0_0_16px_rgba(232,121,249,0.14)]"
          >
            {open ? "Close Life Story" : "Explore Quick Stages"}
          </button>
        </div>
      </div>
      {open && <div className="relative mt-5 space-y-3">
        <p className="text-xs text-slate-400">Choose a life stage to generate its own detailed narrative. Chapters are based on symbolic chart evidence, not verified personal history.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STAGES.map((stage, index) => <button key={stage.title} type="button" disabled={story.isPending} onClick={() => void read(index)} className={`rounded-xl border p-3 text-left transition hover:border-fuchsia-300/70 hover:bg-fuchsia-400/10 ${active === index ? "border-fuchsia-300/70 bg-fuchsia-400/10" : "border-white/15 bg-white/5"}`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-fuchsia-300" />{stage.title}</span>
            <span className="mt-1 block text-xs text-slate-400">{stage.period}{chapters[index] ? " · Ready" : ""}</span>
          </button>)}
        </div>
        {story.isPending && <p role="status" className="flex items-center gap-2 text-sm text-fuchsia-200"><Loader2 className="h-4 w-4 animate-spin" />Writing this chapter from your chart evidence…</p>}
        {story.error && !story.isPending && <p role="alert" className="text-sm text-rose-300">Chapter generation failed: {story.error.message}. Select the chapter to retry.</p>}
        {active !== null && chapters[active] && <article className="rounded-2xl border border-fuchsia-300/20 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 sm:p-6">
          <Streamdown>{chapters[active]}</Streamdown>
        </article>}
      </div>}
    </section>
  );
}
