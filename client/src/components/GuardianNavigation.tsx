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
import "./GuardianNavigation.css";

const PRIMARY_LINKS = [
  { href: "/", label: "Home", Icon: Compass },
  { href: "/chart", label: "Chart", Icon: Diamond },
  { href: "/reading", label: "Reading", Icon: BookOpen },
  { href: "/guide?tab=weather", label: "Energy & Weather", Icon: CloudSun, matchPrefix: "/guide?tab=weather" },
  { href: "/life-story", label: "Life Story", Icon: BookOpenText },
  { href: "/zodiac-readings", label: "12 Gates", Icon: Sparkles },
  { href: "/horary", label: "Horary", Icon: MoonStar },
  { href: "/sky", label: "Sky Map", Icon: Orbit },
  { href: "/guide", label: "Guide & Synastry", Icon: Layers, matchExact: "/guide" },
  { href: "/history", label: "Library", Icon: BookOpenText },
];

export function GuardianNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

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
          {PRIMARY_LINKS.slice(0, 7).map(({ href, label, Icon, matchPrefix, matchExact }) => {
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
          {/* Active GPS Sky Banner inside mobile menu */}
          <div className="px-3 pt-2 pb-3 border-b border-white/10 sm:hidden">
            <TransitLocationBar variant="compact" />
          </div>

          <div className="grid gap-6 p-4 max-w-4xl mx-auto md:grid-cols-3">
            {/* Group 1: Core Personal Journey */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block mb-2 px-2">
                Personal Observatory
              </span>
              <Link href="/" className={`fg-nav-card ${location === "/" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Compass className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Home & Overview</div>
                  <div className="text-[11px] text-slate-400">Three divine signals & forecast</div>
                </div>
              </Link>
              <Link href="/chart" className={`fg-nav-card ${location === "/chart" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Diamond className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Diamond Chart</div>
                  <div className="text-[11px] text-slate-400">God & Agent houses, fixed stars</div>
                </div>
              </Link>
              <Link href="/reading" className={`fg-nav-card ${location === "/reading" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpen className="h-4 w-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Master Reading</div>
                  <div className="text-[11px] text-slate-400">Esoteric synthesis & life guidance</div>
                </div>
              </Link>
              <Link href="/life-story" className={`fg-nav-card ${location === "/life-story" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpenText className="h-4 w-4 text-fuchsia-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Life Story Suite</div>
                  <div className="text-[11px] text-slate-400">Biographical chapters & cycles</div>
                </div>
              </Link>
            </div>

            {/* Group 2: Timing, Weather & Chambers */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 block mb-2 px-2">
                Timing & Divine Chambers
              </span>
              <Link
                href="/guide?tab=weather#main-cosmos-tabs"
                className="fg-nav-card"
                onClick={(e) => {
                  openModule(e, "/guide?tab=weather#main-cosmos-tabs");
                  setOpen(false);
                }}
              >
                <CloudSun className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Cosmic Weather</div>
                  <div className="text-[11px] text-slate-400">Live transits & 30/90-day cycles</div>
                </div>
              </Link>
              <Link href="/zodiac-readings" className={`fg-nav-card ${location === "/zodiac-readings" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Sparkles className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Twelve Divine Gates</div>
                  <div className="text-[11px] text-slate-400">Sign-by-sign daily illumination</div>
                </div>
              </Link>
              <Link href="/horary" className={`fg-nav-card ${location === "/horary" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <MoonStar className="h-4 w-4 text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Horary Chamber</div>
                  <div className="text-[11px] text-slate-400">Real-time question astrology</div>
                </div>
              </Link>
              <Link href="/sky" className={`fg-nav-card ${location === "/sky" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <Orbit className="h-4 w-4 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">3D Divine Sky Map</div>
                  <div className="text-[11px] text-slate-400">Interactive celestial dome</div>
                </div>
              </Link>
            </div>

            {/* Group 3: Relational & Settings */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 block mb-2 px-2">
                Relational & Archive
              </span>
              <Link
                href="/guide?tab=synastry#main-cosmos-tabs"
                className="fg-nav-card"
                onClick={(e) => {
                  openModule(e, "/guide?tab=synastry#main-cosmos-tabs");
                  setOpen(false);
                }}
              >
                <Heart className="h-4 w-4 text-pink-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Synastry & Chemistry</div>
                  <div className="text-[11px] text-slate-400">Dual orrery & partner overlay</div>
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
                href="/guide?tab=podcast#main-cosmos-tabs"
                className="fg-nav-card"
                onClick={(e) => {
                  openModule(e, "/guide?tab=podcast#main-cosmos-tabs");
                  setOpen(false);
                }}
              >
                <Headphones className="h-4 w-4 text-violet-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Audio Observatory</div>
                  <div className="text-[11px] text-slate-400">Spoken briefings & 528Hz soundscape</div>
                </div>
              </Link>
              <Link href="/history" className={`fg-nav-card ${location === "/history" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <BookOpenText className="h-4 w-4 text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Reading Library</div>
                  <div className="text-[11px] text-slate-400">Saved charts & historical readings</div>
                </div>
              </Link>
              <Link href="/profile" className={`fg-nav-card ${location === "/profile" ? "active" : ""}`} onClick={() => setOpen(false)}>
                <UserRound className="h-4 w-4 text-amber-200 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white">Birth Profile Details</div>
                  <div className="text-[11px] text-slate-400">Edit birth time, city & focus</div>
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
    </header>
  );
}
