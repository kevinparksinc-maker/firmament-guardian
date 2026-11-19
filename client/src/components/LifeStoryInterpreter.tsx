import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

const STAGES = [
  { key: "birth_origins", title: "Birth: The World You Enter", period: "Home, family circumstances and the start of the journey" },
  { key: "childhood", title: "Childhood: Home, School & First Discoveries", period: "Growing up, early experiences and first opportunities" },
  { key: "adolescence", title: "Teenage Years: Turning Points", period: "Education, friendships, first openings and new directions" },
  { key: "early_adulthood", title: "Young Adulthood: Work, Love & Independence", period: "Life outside childhood and the first adult crossroads" },
  { key: "adult_development", title: "Adult Years: Family, Achievements & Trials", period: "Building a life and confronting major reversals" },
  { key: "later_life", title: "Later Years: Contribution & Legacy", period: "What later chapters of life may bring and leave behind" },
  { key: "turning_points", title: "The Major Turning Points", period: "A lifetime of evidence-supported openings and setbacks" },
  { key: "future_chapters", title: "The Road Ahead", period: "Upcoming life chapters in the supplied timing windows" },
] as const;

export function LifeStoryInterpreter({ chart }: { chart: ChartResult }) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<Record<number, string>>({});
  const [active, setActive] = useState<number | null>(null);
  const story = trpc.lifeStory.generateChapter.useMutation();

  const read = async (index: number) => {
    if (story.isPending) return;
    setActive(index);
    if (chapters[index]) return;
    const stage = STAGES[index];
    try {
      const answer = await story.mutateAsync({ chart, chapterKey: stage.key });
      setChapters(previous => ({ ...previous, [index]: answer.content }));
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
          <p className="mt-1 max-w-xl text-sm text-slate-300">A deep, chronological life journey—from childhood and first opportunities to adulthood, major changes and legacy.</p>
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
        <p className="text-xs text-slate-400">Choose a chapter of life's journey. Read about possible real-world experiences and turning points from symbolic chart evidence—not a behavior or personality profile.</p>
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
