import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type Result = inferRouterOutputs<AppRouter>["interpretation"]["chartPage"];
type Explanation = Result["reading"]["integrated"];

function Reasoning({ block }: { block: Explanation }) {
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-200">
      {(
        [
          ["what", "What this means"],
          ["why", "Why"],
          ["how", "How the layers work together"],
          ["consequence", "Consequences and challenges"],
          ["meaning", "Deeper meaning"],
        ] as const
      ).map(([key, title]) => (
        <div key={key}>
          <h4 className="font-semibold text-amber-200">{title}</h4>
          <Streamdown>{block[key]}</Streamdown>
        </div>
      ))}
      <div>
        <h4 className="font-semibold text-amber-200">In everyday life</h4>
        <ul className="list-disc pl-5">
          {block.examples.map((example, i) => (
            <li key={i}>{example}</li>
          ))}
        </ul>
      </div>
      <details className="break-words text-xs text-slate-400">
        <summary className="cursor-pointer">
          Calculation evidence and connected methods
        </summary>
        <p className="mt-2">Methods: {block.linkedMethodIds.join(", ")}</p>
        <p>Evidence: {block.evidenceIds.join(", ")}</p>
      </details>
    </div>
  );
}

export function SystematicDeconstruction({
  chart,
  mode = "natal",
  onInterpretBody,
}: {
  chart: ChartResult;
  mode?: "natal" | "transit" | "combined";
  onInterpretBody?: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const generate = trpc.interpretation.chartPage.useMutation();
  // POST the complete chart; cache by its full value and scope so another profile,
  // changed placements, or a different frame can never reuse this reading.
  const result = useQuery({
    queryKey: ["chart-page-layer-reading-v1", chart, mode],
    queryFn: () => generate.mutateAsync({ chart, mode }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const data = result.data;
  const methods = data?.synthesis.methodFindings ?? [];
  const visible = methods.filter(method =>
    `${method.name} ${method.tradition} ${method.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  return (
    <section
      aria-label="Integrated chart interpretation"
      className="space-y-5 rounded-3xl border border-amber-300/30 bg-slate-950/90 p-4 sm:p-6"
    >
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-amber-200">
          The Absolute · Chart synthesis
        </p>
        <h2 className="font-serif text-2xl font-bold text-white">
          Your chart, all layers together
        </h2>
        <p className="text-sm text-slate-300">
          An integrated interpretation of your calculated placements, with the
          contribution and evidence of each available tradition.
        </p>
      </header>
      {result.isPending && (
        <p role="status" className="text-cyan-200">
          Connecting your chart’s calculated layers and Canon interpretations. A
          complete reading can take a few minutes…
        </p>
      )}
      {result.error && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-rose-400/40 p-4 text-rose-200"
        >
          <p>The integrated chart reading could not be completed.</p>
          <p className="text-sm break-words">{result.error.message}</p>
          <button
            type="button"
            onClick={() => result.refetch()}
            className="rounded-lg border border-rose-300/40 px-3 py-2"
          >
            Retry chart reading
          </button>
        </div>
      )}
      {data && (
        <>
          <article className="space-y-4">
            <h3 className="font-serif text-xl text-white">
              The integrated pattern
            </h3>
            <Reasoning block={data.reading.integrated} />
          </article>
          <details open className="rounded-xl border border-white/15 p-4">
            <summary className="cursor-pointer font-serif text-xl text-white">
              Sun, Moon and Ascendant together
            </summary>
            <div className="mt-4">
              <Reasoning block={data.reading.bigThree} />
            </div>
          </details>
          {onInterpretBody && (
            <div className="flex flex-wrap gap-2">
              {chart.movingBodies.map(body => (
                <button
                  type="button"
                  key={body.name}
                  onClick={() => onInterpretBody(body.name)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs text-cyan-200"
                >
                  Inspect {body.name} · {body.display}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm text-cyan-200">
            {data.synthesis.methodLedgerSummary.computedWithResult} calculated
            layers · {data.synthesis.canonApplications.length} Canon rules
            linked to chart evidence
          </p>
          <label className="block text-sm text-slate-300">
            Find a calculated method or tradition
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Decans, mansions, Kabbalah, Lots…"
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/40 p-3 text-white"
            />
          </label>
          {visible.length === 0 && (
            <p className="text-slate-400">No matching methods in this chart.</p>
          )}
          {visible.map(method => {
            const block = data.reading.layers.find(
              layer => layer.methodId === method.id
            );
            return (
              <details
                key={method.id}
                className="rounded-xl border border-white/15 p-4"
              >
                <summary className="cursor-pointer text-white">
                  <span className="font-semibold">{method.name}</span>
                  <span className="mt-1 block text-xs text-cyan-200">
                    {method.tradition} · {method.frame} · {method.status}
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  {block ? (
                    <Reasoning block={block} />
                  ) : (
                    <p className="text-amber-200">
                      {method.notes ||
                        `This method is ${method.status}. No calculated interpretation is available.`}
                    </p>
                  )}
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer">
                      Exact findings and sources
                    </summary>
                    <p className="mt-2 break-words">
                      Sources:{" "}
                      {method.sourceIds.join(", ") || "No sources recorded"}
                    </p>
                    {method.findings.map((finding, i) => (
                      <div key={i} className="mt-3">
                        <p className="font-semibold">{finding.label}</p>
                        <pre className="mt-1 whitespace-pre-wrap break-words">
                          {finding.details}
                        </pre>
                      </div>
                    ))}
                  </details>
                </div>
              </details>
            );
          })}
        </>
      )}
    </section>
  );
}
