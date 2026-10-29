import { Link, useLocation } from "wouter";
import { BookOpen, CloudSun, Compass, Diamond, House, Menu, Sparkles, UserRound, Zap } from "lucide-react";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { trpc } from "@/lib/trpc";

export function PrimaryProfileNavigation() {
  const { profile } = useProfileSession();
  const [path] = useLocation();
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  if (!profile || !account.data) return null;

  const isWeatherTab = path === "/guide" && typeof window !== "undefined" && window.location.href.includes("tab=weather");

  const handleOpenExplore = () => {
    window.dispatchEvent(new Event("fg:open-mobile-menu"));
  };

  const navItems = [
    { href: "/", label: "Home", Icon: House, active: path === "/" },
    { href: "/chart", label: "Chart", Icon: Diamond, active: path === "/chart" },
    {
      href: "/guide?tab=weather#main-cosmos-tabs",
      label: "Energy",
      Icon: Zap,
      active: isWeatherTab,
      onClick: (e: React.MouseEvent) => {
        if (path === "/guide") {
          e.preventDefault();
          window.history.replaceState({}, "", "/guide?tab=weather#main-cosmos-tabs");
          window.dispatchEvent(new CustomEvent("fg:select-tab", { detail: { tab: "weather" } }));
          document.getElementById("main-cosmos-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    },
    { href: "/reading", label: "Reading", Icon: BookOpen, active: path === "/reading" },
    {
      href: "#menu",
      label: "Explore",
      Icon: Menu,
      active: false,
      isAction: true,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleOpenExplore();
      },
    },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation dock"
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-amber-200/25 bg-[#061022]/95 p-1 pb-[max(6px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl md:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.Icon;
        if (item.isAction) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-[10px] font-semibold text-slate-300 transition-colors hover:text-white active:scale-95"
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={item.onClick}
            aria-current={item.active ? "page" : undefined}
            className={`flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-[10px] font-semibold transition-colors active:scale-95 ${
              item.active ? "text-[#f5cd78] bg-amber-400/10 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Icon size={19} strokeWidth={item.active ? 2.3 : 1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
