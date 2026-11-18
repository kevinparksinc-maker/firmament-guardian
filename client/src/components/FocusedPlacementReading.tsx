import { readingProse } from "@shared/readingProse";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { ChartResult } from "../../../server/astronomy";
import type {
  FocusedReading,
  FocusTarget,
} from "../../../server/focusedReading";

export function FocusedPlacementReading({
  chart,
  name,
  layer = "natal",
  kind = "placement",
  otherName,
  lens,
  atUtc,
}: {
  chart: ChartResult;
  name: string;
  layer?: FocusTarget["layer"];
  kind?: FocusTarget["kind"];
  otherName?: string;
  lens?: FocusTarget["lens"];
  atUtc?: string;
}) {
  const request = trpc.interpretation.focusedPlacement.useMutation();
  const [reading, setReading] = useState<FocusedReading>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const cache = useRef(new Map<string, FocusedReading>());
  const key = JSON.stringify([
    name,
    otherName,
    lens,
    atUtc,
    layer,
    kind,
    chart.input,
    chart.utc,
    chart.transitDate,
    chart.worldview,
    chart.movingBodies.map(body => [body.name, body.longitude]),
  ]);
  useEffect(() => {
    const current = ++version.current;
    setReading(undefined);
    setError("");
    const cached = cache.current.get(key);
    if (cached) {
      setReading(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    request.mutate(
      { chart, target: { name, otherName, layer, kind, lens, atUtc } },
      {
        onSuccess: data => {
          if (current === version.current) {
            if (!data.synthesisUnavailable) cache.current.set(key, data);
            setReading(data);
            setLoading(false);
          }
        },
        onError: error => {
          if (current === version.current) {
            // Preserve an actionable message without exposing provider stack
            // details, request bodies, quota errors or internal chart payloads.
            const rawMessage = error.message || "";
            const diagnosis = rawMessage.match(/\b(?:MASTER_[A-Z_]+|TRANSIT_[A-Z_]+|FOCUSED_[A-Z_]+|AI_PROVIDERS_FAILED|AI_FREE_PROVIDER_UNCONFIGURED):/)?.[0];
            setError(
              /Master Chart mismatch|TRANSIT_FRAMEWORK_MISSING|FOCUSED_MOMENT_INVALID|no supported contact/.test(rawMessage)
                ? "The selected calculation could not be verified. Refresh the chart or the 24-hour curve and try again."
                : "This interpretation could not be completed. Your original chart has not been changed. Try again."
            );
            if (diagnosis) console.warn("[FocusedPlacementReading] Request failed", diagnosis);
            setLoading(false);
          }
        },
      }
    );
    return () => {
      version.current++;
    };
  }, [key, retry]);
  return (
    <section
      aria-label={`Interpretation of ${name}`}
      className="mt-5 space-y-5 border-t border-white/10 pt-5"
    >
      {loading && (
        <p role="status" className="text-sm leading-6 text-cyan-200">
          Retrieving the calculated evidence and Canon records for {name}…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 text-sm text-rose-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry(value => value + 1)}
            className="underline"
          >
            Retry this reading
          </button>
        </div>
      )}
      {reading && (
        <>
          <header className="space-y-2">
            <h4 className="font-serif text-xl text-amber-100">
              {reading.title}
            </h4>
            <p className="text-xs text-slate-400">
              Calculated moment: {new Date(reading.moment).toLocaleString()}
            </p>
          </header>
          {reading.miniNarrative && (
            <p className="text-sm leading-7 text-slate-100">{readingProse(reading.miniNarrative)}</p>
          )}
          {reading.synthesisUnavailable && (
            <div role="status" className="space-y-2 text-sm text-slate-300">
              <p>{reading.miniNarrative
                ? "The full AI synthesis is temporarily unavailable. The explanation above uses the locally calculated aspect rules; detailed Canon evidence is below."
                : "The AI synthesis is temporarily unavailable. Your calculated findings and Canon remain available below."}</p>
              <button
                type="button"
                onClick={() => setRetry(value => value + 1)}
                className="underline"
              >
                Retry written synthesis
              </button>
            </div>
          )}
          <details open={reading.synthesisUnavailable} className="rounded-xl border border-white/10 p-3 text-xs text-slate-300">
              <summary className="cursor-pointer text-cyan-200">Calculated findings and Canon</summary>
              <div className="mt-4 space-y-5">
                {reading.sections.map(section => (
                  <article key={section.id} className="space-y-3">
                    <h5 className="font-semibold text-cyan-100">{section.title}</h5>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={index} className="text-sm leading-7 text-slate-200">{readingProse(paragraph)}</p>
                    ))}
                  </article>
                ))}
              </div>
            </details>
          <details className="rounded-xl border border-white/10 p-3 text-xs text-slate-300">
            <summary className="cursor-pointer text-cyan-200">
              Exact calculation evidence
            </summary>
            <ul className="mt-3 space-y-2">
              {reading.evidence.map(item => (
                <li key={item.id}>
                  <strong>{item.label}:</strong> {item.value}
                </li>
              ))}
            </ul>
            <p className="mt-3 break-all text-slate-500">
              Snapshot: {reading.snapshotId}
            </p>
          </details>
          {reading.sourceNotes.length > 0 && (
            <details className="text-xs leading-6 text-slate-400">
              <summary className="cursor-pointer">
                Source quality and interpretive context
              </summary>
              {reading.sourceNotes.map(note => (
                <p key={note} className="mt-2">
                  {note}
                </p>
              ))}
            </details>
          )}
          {reading.gaps.length > 0 && (
            <details className="text-xs leading-6 text-slate-400">
              <summary className="cursor-pointer">
                Information not supplied by this reading
              </summary>
              <ul className="mt-2 space-y-1">
                {reading.gaps.map(gap => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
