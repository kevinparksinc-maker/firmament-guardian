import { useState } from "react";
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronUp,
  Compass,
  GitBranch,
  Layers,
  Scale,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

type ReadingMode = "natal" | "transit" | "combined";

interface BehavioralIntelligencePanelProps {
  chart: ChartResult;
  mode: ReadingMode;
  question: string;
  onSelectPrompt?: (prompt: string) => void;
}

const CONFIDENCE_COLORS: Record<number, string> = {
  5: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
  4: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
  3: "border-violet-300/40 bg-violet-400/15 text-violet-100",
  2: "border-amber-300/35 bg-amber-400/15 text-amber-100",
  1: "border-white/20 bg-white/10 text-slate-300",
};

const EVENT_CONFIDENCE_COLORS: Record<string, string> = {
  E5: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
  E4: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
  E3: "border-violet-300/40 bg-violet-400/15 text-violet-100",
  E2: "border-amber-300/35 bg-amber-400/15 text-amber-100",
  E1: "border-white/20 bg-white/10 text-slate-300",
};

const CHANNEL_LABELS: Record<string, string> = {
  planet: "Planet",
  sign: "Sign",
  house: "House",
  aspect: "Aspect",
  angularity: "Angularity",
  repetition: "Repetition",
  development: "Development",
};

export function BehavioralIntelligencePanel({
  chart,
  mode,
  question,
  onSelectPrompt,
}: BehavioralIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<
    "behaviors" | "events" | "polarities" | "matrix"
  >("behaviors");
  const [expandedBehaviorId, setExpandedBehaviorId] = useState<string | null>(
    null
  );
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const reportQuery = trpc.astrologyKnowledge.behavioralReport.useQuery({
    chart,
    question: question || "What should I understand from this chart?",
    mode,
  });

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
    return (
      <Card className="mx-auto max-w-5xl border-cyan-200/15 bg-black/25 text-slate-200">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-400">
          <Brain className="h-5 w-5 animate-pulse text-cyan-300" />
          Evaluating 7-channel Human Behavior & Life-Event Pattern Intelligence…
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const activeBehavior =
    report.dominantBehaviors.find(b => b.id === expandedBehaviorId) ??
    report.dominantBehaviors[0];

  return (
    <Card className="mx-auto max-w-5xl overflow-hidden border-cyan-200/20 bg-gradient-to-br from-slate-950/90 via-cyan-950/20 to-violet-950/25 text-slate-100 shadow-2xl shadow-cyan-950/25">
      <CardHeader className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              <Brain className="h-4 w-4" /> Pattern Recognition Identity
            </div>
            <CardTitle className="mt-1.5 font-serif text-2xl text-white sm:text-3xl">
              Human Behavior & Life-Event Intelligence
            </CardTitle>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
              Deterministic 7-channel convergence across Planet, Sign, House,
              Aspect, Angularity, Repetition, and Development—translating sky
              geometry into observable triggers, motivations, protective
              responses, polarities, and life-situation signatures.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
            >
              {report.dominantBehaviors.length} Core Behaviors
            </Badge>
            <Badge
              variant="outline"
              className="border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs text-violet-100"
            >
              {report.activeLifeEvents.length} Life-Event Signatures
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100"
            >
              {report.activeContradictions.length} Polarity Tensions
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("behaviors")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === "behaviors"
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100 shadow-sm"
                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            Behavioral Patterns
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === "events"
                ? "border-violet-300/60 bg-violet-300/15 text-violet-100 shadow-sm"
                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Life-Event Signatures
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("polarities")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === "polarities"
                ? "border-amber-300/60 bg-amber-300/15 text-amber-100 shadow-sm"
                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            Polarity & Tensions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === "matrix"
                ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-100 shadow-sm"
                : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Interactions & Vocabulary
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-7">
        {activeTab === "behaviors" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                Ordered by 7-channel convergence strength and question
                relevance. Click any pattern to inspect its full Trigger →
                Response → Motivation → Maturity chain.
              </span>
            </div>

            <div className="space-y-3">
              {report.dominantBehaviors.map(behavior => {
                const isExpanded =
                  (expandedBehaviorId ?? activeBehavior?.id) === behavior.id;
                return (
                  <div
                    key={behavior.id}
                    className={`rounded-2xl border transition ${
                      isExpanded
                        ? "border-cyan-300/40 bg-cyan-950/25"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBehaviorId(isExpanded ? null : behavior.id)
                      }
                      className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-cyan-300/80">
                            #{behavior.codeNumber}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                            {behavior.domainLabel}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                              CONFIDENCE_COLORS[behavior.confidenceLevel] ??
                              CONFIDENCE_COLORS[1]
                            }`}
                          >
                            {behavior.confidenceLabel}
                          </span>
                          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
                            State: {behavior.state}
                          </span>
                          <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-0.5 text-[11px] text-violet-200">
                            Response: {behavior.responseStyle}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl text-white">
                          {behavior.name}
                        </h4>
                        <p className="text-sm leading-6 text-slate-300">
                          <span className="font-medium text-cyan-200">
                            {behavior.languagePrefix}{" "}
                          </span>
                          {behavior.definition}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-cyan-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-5 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
                        {/* 7-Channel Evidence Badges */}
                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                            Active Evidence Channels ({behavior.channels.length}
                            /7)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                "planet",
                                "sign",
                                "house",
                                "aspect",
                                "angularity",
                                "repetition",
                                "development",
                              ] as const
                            ).map(ch => {
                              const active = behavior.channels.includes(ch);
                              return (
                                <span
                                  key={ch}
                                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                                    active
                                      ? "border-cyan-300/40 bg-cyan-300/15 font-medium text-cyan-100"
                                      : "border-white/5 bg-white/[0.02] text-slate-600"
                                  }`}
                                >
                                  {CHANNEL_LABELS[ch]}
                                </span>
                              );
                            })}
                          </div>
                          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-300">
                            {behavior.supportingEvidence.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 rounded-lg bg-black/25 px-3 py-1.5"
                              >
                                <span className="mt-0.5 font-mono text-[10px] uppercase text-cyan-300">
                                  [{item.channel}]
                                </span>
                                <span>{item.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Trigger -> Response -> Motivation -> Loop Grid */}
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                              1. What Activates This (Triggers)
                            </div>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                              {behavior.triggerPatterns.map(tr => (
                                <li key={tr}>• {tr}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                              2. Underlying Motivation
                            </div>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                              {behavior.motivationPatterns.map(mot => (
                                <li key={mot}>• {mot}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                              3. Internal vs. External Response
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                              <strong className="text-slate-100">
                                Inside:
                              </strong>{" "}
                              {behavior.internalResponse}
                            </p>
                            <p className="mt-1.5 text-xs leading-5 text-slate-300">
                              <strong className="text-slate-100">
                                Outside:
                              </strong>{" "}
                              {behavior.externalResponse}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                              4. Automatic vs. Stress Loop
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                              <strong className="text-slate-100">
                                Automatic:
                              </strong>{" "}
                              {behavior.automaticExpression}
                            </p>
                            <p className="mt-1.5 text-xs leading-5 text-slate-300">
                              <strong className="text-slate-100">
                                Under stress:
                              </strong>{" "}
                              {behavior.stressExpression}
                            </p>
                          </div>
                        </div>

                        {/* Constructive / Shadow / Mature */}
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                              Constructive Expression
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-slate-300">
                              {behavior.constructiveExpression}
                            </p>
                          </div>

                          <div className="rounded-xl border border-rose-300/20 bg-rose-950/20 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                              Shadow / Cost
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-slate-300">
                              {behavior.shadowExpression}
                            </p>
                          </div>

                          <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                              Mature Integration
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-slate-300">
                              {behavior.matureExpression}
                            </p>
                          </div>
                        </div>

                        {behavior.counterEvidence.length > 0 && (
                          <div className="rounded-xl border border-amber-300/20 bg-amber-950/15 p-3 text-xs leading-5 text-amber-100/90">
                            <strong className="uppercase tracking-wider text-amber-300">
                              Counter-evidence & Modifiers:
                            </strong>{" "}
                            {behavior.counterEvidence.join(" · ")}
                          </div>
                        )}

                        {onSelectPrompt && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onSelectPrompt(
                                  `How does my "${behavior.name}" pattern show up in my daily life and relationships, and what is the mature step forward?`
                                )
                              }
                              className="border-cyan-300/30 bg-cyan-300/10 text-xs text-cyan-100 hover:bg-cyan-300/20"
                            >
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                              Ask the guide about {behavior.name}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Evaluated through Natal Promise → Activated House → House Ruler
                → Transit Contact → God View ↔ Agent View Translation.
              </div>
              {report.activeLifeEvents.map(ev => {
                const isExpanded = expandedEventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    className={`rounded-2xl border transition ${
                      isExpanded
                        ? "border-violet-300/40 bg-violet-950/25"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : ev.id)
                      }
                      className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-violet-300/80">
                            #{ev.codeNumber}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                            {ev.categoryLabel}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                              EVENT_CONFIDENCE_COLORS[ev.confidenceCode] ??
                              EVENT_CONFIDENCE_COLORS.E1
                            }`}
                          >
                            {ev.confidenceLabel}
                          </span>
                          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] text-cyan-200">
                            {ev.temporalState}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl text-white">
                          {ev.name}
                        </h4>
                        <p className="text-sm leading-6 text-slate-300">
                          {ev.definition}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-violet-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-4 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                              Possible Lived Manifestations
                            </div>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                              {ev.possibleManifestations.map(m => (
                                <li key={m}>• {m}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                              Alternative / Internal Expressions
                            </div>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                              {ev.alternativeManifestations.map(m => (
                                <li key={m}>• {m}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/20 p-3.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                            God View ↔ Agent View Event Translation
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-200">
                            {ev.godToAgentTranslation}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-3.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                            Developmental Meaning (Event → Experience →
                            Development)
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-200">
                            {ev.developmentalMeaning}
                          </p>
                        </div>

                        <div>
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Supporting Chart Testimony
                          </div>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {ev.supportingEvidence.map((s, idx) => (
                              <li
                                key={idx}
                                className="rounded-lg bg-black/25 px-3 py-1.5"
                              >
                                • {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <div>
                            <span className="text-slate-500">
                              Sequence chain:
                            </span>{" "}
                            {ev.sequencePredecessors.join(", ")} →{" "}
                            <strong className="text-violet-200">
                              {ev.name}
                            </strong>{" "}
                            → {ev.sequenceSuccessors.join(", ")}
                          </div>
                          {onSelectPrompt && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onSelectPrompt(
                                  `What does the "${ev.name}" life-event signature (${ev.temporalState}) mean for me right now, and how should I navigate it wisely?`
                                )
                              }
                              className="border-violet-300/30 bg-violet-300/10 text-xs text-violet-100 hover:bg-violet-300/20"
                            >
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                              Ask the guide about {ev.name}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {report.eventSequences.length > 0 && (
              <div className="space-y-3 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  <GitBranch className="h-4 w-4" /> Multi-Stage Event Sequence
                  Chains
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {report.eventSequences.map(seq => (
                    <div
                      key={seq.id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-serif text-lg text-white">
                          {seq.name}
                        </h5>
                        <Badge
                          variant="outline"
                          className="border-cyan-300/30 bg-cyan-300/10 text-[10px] text-cyan-200"
                        >
                          {Math.round(seq.strength * 100)}% Active
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-cyan-200">
                        {seq.activeStages.map((st, idx) => (
                          <span key={st} className="flex items-center gap-1.5">
                            <span className="rounded-md bg-white/10 px-2 py-0.5">
                              {st}
                            </span>
                            {idx < seq.activeStages.length - 1 && (
                              <span className="text-slate-500">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-300">
                        {seq.narrative}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-emerald-200/90">
                        <strong>Development:</strong> {seq.developmentalMeaning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "polarities" && (
          <div className="space-y-4">
            <p className="text-xs leading-5 text-slate-400">
              Human beings are rarely one-dimensional. When both sides of an
              axis are active, the chart produces a living contradiction—a
              push-pull tension that shapes relationships, work, and inner
              decisions.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {report.polarityAxes.map(axis => (
                <div
                  key={axis.id}
                  className={`rounded-2xl border p-4 ${
                    axis.isContradictionActive
                      ? "border-amber-300/35 bg-amber-950/20"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-lg text-white">
                      {axis.leftPole} ↔ {axis.rightPole}
                    </span>
                    {axis.isContradictionActive && (
                      <Badge className="bg-amber-400/20 text-[10px] text-amber-200">
                        Dual Tension Active
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="w-28 truncate text-cyan-200">
                      {axis.leftPole} ({axis.leftScore})
                    </span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="bg-cyan-400 transition-all"
                        style={{
                          width: `${
                            axis.leftScore + axis.rightScore > 0
                              ? (axis.leftScore /
                                  (axis.leftScore + axis.rightScore)) *
                                100
                              : 50
                          }%`,
                        }}
                      />
                      <div
                        className="bg-violet-400 transition-all"
                        style={{
                          width: `${
                            axis.leftScore + axis.rightScore > 0
                              ? (axis.rightScore /
                                  (axis.leftScore + axis.rightScore)) *
                                100
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-28 truncate text-right text-violet-200">
                      {axis.rightPole} ({axis.rightScore})
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-300">
                    {axis.synthesis}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="rounded-lg bg-black/25 p-2">
                      <div className="font-semibold text-cyan-300">
                        {axis.leftPole} signals
                      </div>
                      <div className="mt-1">
                        {axis.leftEvidence.length
                          ? axis.leftEvidence.slice(0, 3).join(", ")
                          : "Minimal emphasis"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/25 p-2">
                      <div className="font-semibold text-violet-300">
                        {axis.rightPole} signals
                      </div>
                      <div className="mt-1">
                        {axis.rightEvidence.length
                          ? axis.rightEvidence.slice(0, 3).join(", ")
                          : "Minimal emphasis"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "matrix" && (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Zap className="h-4 w-4" /> Planetary Pair Interaction Matrix
              </div>
              {report.planetInteractions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {report.planetInteractions.map(inter => (
                    <div
                      key={`${inter.pair}-${inter.aspect}`}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif text-lg text-white">
                          {inter.pair} — {inter.coreTheme}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-emerald-300/30 bg-emerald-300/10 text-[11px] text-emerald-200"
                        >
                          {inter.aspect} ({inter.orb.toFixed(1)}°)
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {inter.behavioralMechanism}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-emerald-300/15 bg-emerald-950/20 p-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            Constructive
                          </div>
                          <div className="mt-1 text-slate-300">
                            {inter.constructive}
                          </div>
                        </div>
                        <div className="rounded-lg border border-rose-300/15 bg-rose-950/20 p-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                            Shadow
                          </div>
                          <div className="mt-1 text-slate-300">
                            {inter.shadow}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No tight major planetary pair matrix contacts within 6° in
                  this configuration.
                </p>
              )}
            </div>

            {report.activeHouseAxes.length > 0 && (
              <div className="border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  <Activity className="h-4 w-4" /> Activated House Polarity Axes
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {report.activeHouseAxes.map(ax => (
                    <div
                      key={ax.axis}
                      className="rounded-xl border border-white/10 bg-black/25 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          Axis {ax.axis}: {ax.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{ax.theme}</p>
                      <p className="mt-2 text-xs text-cyan-200">
                        {ax.OccupiedDetails.join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.matchedVocabularyTags.length > 0 && (
              <div className="border-t border-white/10 pt-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                  200-Pattern Master Index Matches
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.matchedVocabularyTags.map(tag => (
                    <span
                      key={`${tag.code}-${tag.name}`}
                      className="rounded-xl border border-violet-300/25 bg-violet-950/30 px-3 py-1.5 text-xs text-slate-200"
                    >
                      <strong className="font-mono text-violet-300">
                        #{tag.code}
                      </strong>{" "}
                      {tag.name}{" "}
                      <span className="text-slate-400">({tag.evidence})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-slate-400">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.16em] text-slate-300">
                <ShieldAlert className="h-4 w-4 text-cyan-300" /> Ethical
                Guardrails & Non-Deterministic Discipline
              </div>
              <p className="mt-1.5">
                All patterns are conditional hypotheses for self-recognition,
                never deterministic fate or clinical diagnosis. High energy is
                distinguished from aggression, assertiveness from violence, risk
                tolerance from addiction, and emotional containment from
                coldness.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
