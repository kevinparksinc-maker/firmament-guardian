import type { ReactNode } from "react";

type UnknownRecord = Record<string, unknown>;
function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord : null;
}
function label(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not recorded";
}
function safeTechnicalJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); }
  catch { return "This saved record could not be serialized."; }
}

function ArchiveDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-4 rounded-xl border border-cyan-200/20 bg-slate-950/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-cyan-200">{title}</summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

/** Inspect the exact saved chart; do not regenerate or silently substitute a different sky. */
export function SavedChartDetails({ value }: { value: unknown }) {
  const record = asRecord(value);
  const bodies = Array.isArray(record?.movingBodies) ? record.movingBodies
    .map(asRecord).filter((body): body is UnknownRecord => Boolean(body && typeof body.name === "string")) : [];
  const input = asRecord(record?.input);
  return (
    <ArchiveDisclosure title="Open saved chart snapshot">
      {input && <p className="text-xs text-slate-300">
        {label(input.date)} · {label(input.time)} · {label(input.timezone)}
      </p>}
      {bodies.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] text-left text-xs">
            <thead><tr className="border-b border-white/15 text-slate-300">
              <th className="p-2">Body</th><th className="p-2">Saved position</th><th className="p-2">House</th>
            </tr></thead>
            <tbody>{bodies.map((body, index) => (
              <tr key={String(body.name) + index} className="border-b border-white/10">
                <td className="p-2 font-medium text-white">{String(body.name)}</td>
                <td className="p-2">{label(body.display)}</td>
                <td className="p-2">{typeof body.house === "number" ? body.house : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-amber-200">This older record has no readable planetary table. Its original data is preserved below.</p>}
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-xs text-slate-300">Original technical chart data</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-[11px] text-slate-300">{safeTechnicalJson(value)}</pre>
      </details>
    </ArchiveDisclosure>
  );
}

/** Prefer the original reader-facing prose, with an unmodified technical fallback. */
export function savedReadingProse(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["reading", "interpretation", "narrative", "synthesis", "text", "result"]) {
    const field = record[key];
    if (typeof field === "string" && field.trim()) return field.trim();
    if (Array.isArray(field) && field.length && field.every(part => typeof part === "string"))
      return field.join("\n\n");
  }
  return null;
}

export function SavedReadingDetails({ value }: { value: unknown }) {
  const prose = savedReadingProse(value);
  return (
    <ArchiveDisclosure title="Open saved reading">
      {prose ? (
        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">{prose}</div>
      ) : (
        <p className="text-sm text-amber-100">No formatted reading text was stored in this record. Its original evidence is available below.</p>
      )}
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-xs text-slate-300">Original saved reading data</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-[11px] text-slate-300">{safeTechnicalJson(value)}</pre>
      </details>
    </ArchiveDisclosure>
  );
}
