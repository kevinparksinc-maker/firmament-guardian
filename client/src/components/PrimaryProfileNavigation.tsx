import { Link, useLocation } from "wouter";
import { BookOpen, Compass, Diamond, House, UserRound } from "lucide-react";
import { PROFILE_TABS } from "@/config/profileNavigation";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";

const tabIcons = { Home: House, Chart: Diamond, Reading: BookOpen, Guide: Compass, Profile: UserRound } as const;

/** One persistent five-tab navigator shared across the entire observatory. */
export function PrimaryProfileNavigation() {
  const { profile } = useProfileSession();
  const [path] = useLocation();
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  if (!profile || !account.data) return null;

  return <nav aria-label="Primary profile navigation"
    className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-amber-200/30 bg-[#061225]/95 p-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,.25)] backdrop-blur-lg md:sticky md:top-0 md:bottom-auto md:mx-auto md:mb-5 md:max-w-[1480px] md:rounded-2xl md:border">
    {PROFILE_TABS.map(item => {
      const Icon = tabIcons[item.label];
      const active = path === item.href;
      return <Link key={item.href} href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 sm:min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 sm:px-2 py-1.5 text-center text-[11px] sm:text-xs font-semibold transition-colors ${active ? "text-[#f5cd78] bg-amber-400/10" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
        <Icon size={21} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true"/><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
