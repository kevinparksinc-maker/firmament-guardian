import type { ReactNode } from "react";
import type { Overlay } from "@shared/hybrid";

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-300">
      {children}
    </span>
  );
}
export function OverlayCell({ row }: { row: { overlay: Overlay } }) {
  return (
    <div className="space-y-1.5">
      <div className="font-medium text-slate-100">
        {row.overlay.nakshatra}{" "}
        <span className="text-slate-500">Pada {row.overlay.pada}</span>
      </div>
      <div className="text-xs text-slate-400">{row.overlay.manzil}</div>
      <Chip>{row.overlay.decan}</Chip>
    </div>
  );
}
