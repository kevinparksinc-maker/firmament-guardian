import { useQuery } from "@tanstack/react-query";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";

export function SystematicDeconstruction({
  chart,
  mode = "natal",
  onInterpretBody,
}: {
  chart: ChartResult;
  mode?: "natal" | "transit" | "combined";
  onInterpretBody?: (name: string) => void;
}) {
  const generate = trpc.interpretation.chartPage.useMutation();
  const result = useQuery({
    queryKey: ["chart-placement-paragraphs-v2", chart, mode],
    queryFn: () => generate.mutateAsync({ chart, mode }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <section aria-label="Planetary placement meanings" className="space-y-4">
      <header>
        <h2 className="font-serif text-2xl font-bold text-white">
          Your planetary placements
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Each paragraph brings together the planet’s calculated layers.
        </p>
      </header>
      {result.isPending && (
        <p role="status" className="text-sm text-cyan-200">
          Synthesizing your placement summaries…
        </p>
      )}
      {result.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/40 p-4 text-rose-200"
        >
          <p>Placement summaries could not be completed.</p>
          <p className="mt-2 break-words text-sm">{result.error.message}</p>
          <button
            type="button"
            onClick={() => result.refetch()}
            className="mt-3 rounded-lg border border-rose-300/40 px-3 py-2 text-sm"
          >
            Retry summaries
          </button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {chart.movingBodies.map(body => {
          const summary = result.data?.placements.find(
            p => p.name === body.name
          );
          return (
            <article
              key={body.name}
              className="space-y-3 rounded-2xl border border-amber-300/20 bg-slate-950/90 p-5"
            >
              <header>
                <h3 className="font-serif text-xl font-bold text-white">
                  {body.name} · {body.display}
                </h3>
                <p className="mt-1 text-xs text-amber-200">
                  House {body.house}
                  {body.agentHouse != null && body.godHouse != null
                    ? ` · Agent H${body.agentHouse} / God H${body.godHouse}`
                    : ""}
                  {body.retrograde ? " · Retrograde" : ""}
                </p>
              </header>
              {summary && (
                <>
                  <div className="text-sm leading-7 text-slate-200">
                    <Streamdown>{summary.paragraph}</Streamdown>
                  </div>
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer text-cyan-200">
                      Layers behind this paragraph
                    </summary>
                    <div className="mt-3 space-y-3">
                      {summary.evidence.map(fact => (
                        <div key={`${fact.layerId}-${fact.id}`}>
                          <p className="font-semibold text-slate-200">
                            {fact.layerId}
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap break-words">
                            {JSON.stringify(fact.value, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
              {onInterpretBody && (
                <button
                  type="button"
                  onClick={() => onInterpretBody(body.name)}
                  className="text-xs text-cyan-200 underline"
                >
                  Inspect {body.name} calculations
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
