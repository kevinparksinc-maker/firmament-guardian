import { useEffect, useState, type MouseEvent } from "react";
import {
  BookOpen,
  BookOpenText,
  CloudSun,
  Compass,
  Diamond,
  Headphones,
  Heart,
  Menu,
  MoonStar,
  Navigation,
  Orbit,
  Sparkles,
  Stars,
  Users,
  UserRound,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { TransitLocationBar } from "./TransitLocationBar";
import { AccountControl } from "./AccountControl";
import { ProfileSwitcherModal } from "./ProfileSwitcherModal";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import "./GuardianNavigation.css";

const PRIMARY_LINKS: Array<{
  href: string;
  label: string;
  Icon: any;
  matchPrefix?: string;
  matchExact?: string;
}> = [
  { href: "/", label: "Home", Icon: Compass },
  { href: "/chart", label: "Chart", Icon: Diamond },
  { href: "/energy", label: "Energy", Icon: CloudSun },
  { href: "/reading", label: "Readings", Icon: BookOpen },
  { href: "/explore", label: "Explore", Icon: Layers },
  { href: "/horary", label: "Horary", Icon: MoonStar },
  { href: "/synastry", label: "Synastry", Icon: Heart },
  { href: "/life-story", label: "Life Story", Icon: BookOpenText },
  { href: "/sky", label: "Sky Map", Icon: Orbit },
];



export function GuardianNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const { profile, savedProfiles } = useProfileSession();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    const handleToggle = () => setOpen((prev) => !prev);
    const handleOpen = () => setOpen(true);
    window.addEventListener("fg:toggle-mobile-menu", handleToggle);
    window.addEventListener("fg:open-mobile-menu", handleOpen);
    return () => {
      window.removeEventListener("fg:toggle-mobile-menu", handleToggle);
      window.removeEventListener("fg:open-mobile-menu", handleOpen);
    };
  }, []);

  const openModule = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location === "/guide" && href.includes("?tab=")) {
      event.preventDefault();
      const tab = href.split("?tab=")[1].split("#")[0];
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new CustomEvent("fg:select-tab", { detail: { tab } }));
      document.getElementById("main-cosmos-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  };

  const isActive = (href: string, matchPrefix?: string, matchExact?: string) => {
    if (matchExact && location === matchExact && !window.location.search) return true;
    if (matchPrefix && window.location.href.includes(matchPrefix)) return true;
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location === href.split("?")[0]) return true;
    return false;
  };

  return (
    <header className="guardian-global-nav sticky top-0 z-50">
      <nav className="guardian-global-nav-inner" aria-label="The Absolute main navigation">
        <Link href="/" className="guardian-global-brand" aria-label="The Absolute home">
          <Stars size={22} className="text-amber-300" aria-hidden="true" />
          <span>
            <strong>THE ABSOLUTE</strong>
            <small>UNCOVERING YOUR DIVINE CODE</small>
          </span>
        </Link>

        {/* GPS Transit Location Pill directly in the top bar */}
        <div className="hidden sm:flex items-center">
          <TransitLocationBar variant="pill" />
        </div>

        {/* Desktop Navigation Links */}
        <div className="guardian-global-desktop-links">
          {PRIMARY_LINKS.map(({ href, label, Icon, matchPrefix, matchExact }) => {
            const active = isActive(href, matchPrefix, matchExact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={active ? "active" : ""}
                onClick={(event) => openModule(event, href)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <button
              type="button"
              onClick={() => setIsSwitcherOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-[#D9B66F]/40 bg-[#D9B66F]/10 px-2.5 py-1 text-xs font-semibold text-[#D9B66F] hover:bg-[#D9B66F]/20 transition-all active:scale-95 shadow-[0_0_12px_rgba(217,182,111,0.15)]"
              title="Switch or load saved seeker profile"
            >
              <UserRound className="h-3.5 w-3.5 text-[#D9B66F]" />
              <span className="max-w-[75px] sm:max-w-[110px] truncate">{profile.name}</span>
              <span className="rounded-full bg-[#D9B66F]/25 px-1.5 py-0.2 text-[10px] font-bold text-amber-200">
                {savedProfiles.length}
              </span>
            </button>
          )}

          <div className="hidden md:block">
            <AccountControl />
          </div>

          {/* Menu button for mobile and additional modules */}
          <button
            type="button"
            className="guardian-global-menu-toggle"
            aria-controls="guardian-global-mobile-links"
            aria-expanded={open}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile / Full Navigation Drawer */}
      {open && (
        <div
          id="guardian-global-mobile-links"
          className="guardian-global-mobile-links animate-in fade-in slide-in-from-top-3 duration-200"
          aria-label="The Absolute directory navigation"
        >
          {/* Active Seeker Banner inside mobile menu */}
          {profile && (
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D9B66F] block">Active Seeker</span>
                <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile.date} · {profile.location}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsSwitcherOpen(true);
                }}
                className="shrink-0 rounded-xl border border-[#D9B66F]/50 bg-[#D9B66F]/15 px-3 py-1.5 text-xs font-semibold text-[#D9B66F] hover:bg-[#D9B66F]/25 active:scale-95 transition-all"
              >
                Switch Profile ({savedProfiles.length})
              </button>
            </div>
          )}

          {/* Active GPS Sky Banner inside mobile menu */}
          <div className="px-3 pt-2 pb-3 border-b border-white/10 sm:hidden">
            <TransitLocationBar variant="compact" />
          </div>

          <div className="grid gap-6 p-4 max-w-4xl mx-auto md:grid-cols-3">
            {/* Group 1: 5 Primary Destinations */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block mb-2 px-2">
                Primary Observatory
              </span>
              <Link href="/" className={`fg-nav-card ${location === "/" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Compass className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Home Dashboard</div>
                  <div className="text-[11px] text-slate-400">Big 3 signals & quick tools</div>
                </div>
              </Link>
              <Link href="/chart" className={`fg-nav-card ${location === "/chart" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Diamond className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Diamond Chart</div>
                  <div className="text-[11px] text-slate-400">God & Agent houses, 10 drawers</div>
                </div>
              </Link>
              <Link href="/energy" className={`fg-nav-card ${location === "/energy" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <CloudSun className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Energy & Transits</div>
                  <div className="text-[11px] text-slate-400">Live GPS horizon & aspect flow</div>
                </div>
              </Link>
              <Link href="/reading" className={`fg-nav-card ${location === "/reading" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpen className="h-4 w-4 text-violet-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Readings Center</div>
                  <div className="text-[11px] text-slate-400">Esoteric synthesis & life guidance</div>
                </div>
              </Link>
              <Link href="/explore" className={`fg-nav-card ${location === "/explore" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Layers className="h-4 w-4 text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Explore Directory</div>
                  <div className="text-[11px] text-slate-400">All ancient systems & tools</div>
                </div>
              </Link>
            </div>

            {/* Group 2: Featured Interactive Tools */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 block mb-2 px-2">
                Divination & Resonance
              </span>
              <Link href="/horary" className={`fg-nav-card ${location === "/horary" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <MoonStar className="h-4 w-4 text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Horary Chamber</div>
                  <div className="text-[11px] text-slate-400">Real-time question divination</div>
                </div>
              </Link>
              <Link href="/synastry" className={`fg-nav-card ${location === "/synastry" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Heart className="h-4 w-4 text-rose-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Synastry Studio</div>
                  <div className="text-[11px] text-slate-400">Two-chart relationship overlays</div>
                </div>
              </Link>
              <Link href="/life-story" className={`fg-nav-card ${location === "/life-story" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpenText className="h-4 w-4 text-fuchsia-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Life Story Suite</div>
                  <div className="text-[11px] text-slate-400">Biographical chapters & profections</div>
                </div>
              </Link>
              <Link href="/sky" className={`fg-nav-card ${location === "/sky" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Orbit className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">3D Divine Sky Map</div>
                  <div className="text-[11px] text-slate-400">Interactive celestial sphere</div>
                </div>
              </Link>
              <Link href="/zodiac-readings" className={`fg-nav-card ${location === "/zodiac-readings" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Twelve Divine Gates</div>
                  <div className="text-[11px] text-slate-400">Sign-by-sign daily illumination</div>
                </div>
              </Link>
            </div>

            {/* Group 3: Relational & Archives */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 block mb-2 px-2">
                Archives & Community
              </span>
              <Link href="/history" className={`fg-nav-card ${location === "/history" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpenText className="h-4 w-4 text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Archival History</div>
                  <div className="text-[11px] text-slate-400">Past Horary questions & logs</div>
                </div>
              </Link>
              <Link
                href="/guide?tab=social#main-cosmos-tabs"
                className="fg-nav-card"
                onClick={(e) => {
                  openModule(e, "/guide?tab=social#main-cosmos-tabs");
                  setOpen(false);
                }}
              >
                <Users className="h-4 w-4 text-violet-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Loved Ones Matrix</div>
                  <div className="text-[11px] text-slate-400">Pinned family & friend charts</div>
                </div>
              </Link>
              <Link
                href="/guide?tab=blueprint#main-cosmos-tabs"
                className="fg-nav-card"
                onClick={(e) => {
                  openModule(e, "/guide?tab=blueprint#main-cosmos-tabs");
                  setOpen(false);
                }}
              >
                <ShieldCheck className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Divine Blueprint</div>
                  <div className="text-[11px] text-slate-400">Complete astronomical tables</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 max-w-4xl mx-auto">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Two Skies · One Moment · Absolute Canon</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-cyan-300 hover:text-white px-3 py-1 rounded-lg bg-white/5"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}

      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </header>
  );
}

