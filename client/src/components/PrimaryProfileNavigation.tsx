import { Link, useLocation } from "wouter";
import { PROFILE_TABS } from "@/config/profileNavigation";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";

/** One persistent four-tab navigator shared by primary and specialized routes. */
export function PrimaryProfileNavigation() {
  const { profile } = useProfileSession();
  const [path] = useLocation();
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  if (!profile || !account.data) return null;

  return <nav aria-label="Primary profile navigation"
    className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-cyan-300/30 bg-slate-950/95 p-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-lg md:sticky md:top-0 md:bottom-auto md:mx-auto md:mb-5 md:max-w-[1480px] md:rounded-2xl md:border">
    {PROFILE_TABS.map(item => (
      <Link key={item.href} href={item.href}
        aria-current={path === item.href ? "page" : undefined}
        className={`rounded-xl px-2 py-3 text-center text-sm font-semibold ${path === item.href ? "bg-cyan-200/15 text-cyan-100 ring-1 ring-cyan-300/40" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
        {item.label}
      </Link>
    ))}
  </nav>;
}
