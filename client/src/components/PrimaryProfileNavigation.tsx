import { Link, useLocation } from "wouter";
import { BookOpen, Compass, Diamond, House } from "lucide-react";
import { PROFILE_TABS } from "@/config/profileNavigation";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";

const tabIcons = { Home: House, Chart: Diamond, Reading: BookOpen, Guide: Compass } as const;

/** One persistent four-tab navigator shared by primary and specialized routes. */
export function PrimaryProfileNavigation() {
  const { profile } = useProfileSession();
  const [path] = useLocation();
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  if (!profile || !account.data) return null;

  return <nav aria-label="Primary profile navigation"
    className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-amber-200/30 bg-[#061225]/95 p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,.25)] backdrop-blur-lg md:sticky md:top-0 md:bottom-auto md:mx-auto md:mb-5 md:max-w-[1480px] md:rounded-2xl md:border">
    {PROFILE_TABS.map(item => {
      const Icon = tabIcons[item.label];
      return <Link key={item.href} href={item.href}
        aria-current={path === item.href ? "page" : undefined}
        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-semibold ${path === item.href ? "text-[#f5cd78]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
        <Icon size={23} strokeWidth={path === item.href ? 2.2 : 1.7} aria-hidden="true"/><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
