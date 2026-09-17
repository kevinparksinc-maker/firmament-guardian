import type { ReactNode } from "react";

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "cyan" | "gold" | "emerald" | "purple" | "amber" }) {
  const styles = {
    slate: "border-white/10 bg-white/[0.045] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200",
    gold: "border-amber-300/20 bg-amber-300/[0.08] text-amber-200",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200",
    purple: "border-violet-300/20 bg-violet-300/[0.08] text-violet-200",
    amber: "border-orange-300/20 bg-orange-300/[0.08] text-orange-200",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles[tone]}`}>{children}</span>;
}
