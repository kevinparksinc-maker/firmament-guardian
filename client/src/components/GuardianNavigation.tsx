import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, Stars, UserRound } from "lucide-react";
import { PRIMARY_NAV_ITEMS, primaryDestinationForPath } from "@/config/profileNavigation";
import { searchDirectory } from "@/config/appDirectory";
import { useProfileSession } from "@/contexts/ProfileSessionContext";
import { prepareOverlayNavigation } from "@/hooks/useOverlayBack";
import { AccountControl } from "./AccountControl";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import "./GuardianNavigation.css";

export function GuardianNavigation() {
  const [path, navigate] = useLocation();
  const { profile } = useProfileSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    setOpen(false);
    setQuery("");
    window.scrollTo({ top: 0 });
  }, [path]);
  const results = searchDirectory(query);
  const groups = Array.from(new Set(results.map(item => item.group)));
  const active = primaryDestinationForPath(path);
  return (
    <header className="guardian-global-nav">
      <nav className="guardian-global-nav-inner" aria-label="The Absolute main navigation">
        <Link href="/" className="guardian-global-brand" aria-label="The Absolute home">
          <Stars size={22} aria-hidden="true" />
          <span><strong>THE ABSOLUTE</strong><small>Your personal observatory</small></span>
        </Link>
        <div className="guardian-global-desktop-links">
          {PRIMARY_NAV_ITEMS.map(tab => <Link key={tab.href} href={tab.href} aria-current={active === tab.href ? "page" : undefined} className={active === tab.href ? "active" : ""}>{tab.label}</Link>)}
        </div>
        <div className="fg-header-actions">
          <Link href="/profiles" className="fg-profile-switch" aria-label={profile ? `Switch profile: ${profile.name}` : "Open saved profiles"}>
            <UserRound size={18} aria-hidden="true" />
            <span>{profile?.name || "Profiles"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </Link>
          <div className="hidden xl:block"><AccountControl /></div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="fg-explore-trigger" aria-label="Explore all pages"><Menu size={22} aria-hidden="true" /><span className="hidden sm:inline">Explore</span></button>
            </SheetTrigger>
            <SheetContent side="right" className="fg-directory-sheet">
              <SheetHeader className="px-0 pr-12">
                <SheetTitle className="font-serif text-2xl text-white">Explore your observatory</SheetTitle>
                <SheetDescription className="text-slate-400">Readings, tools, saved profiles, and your account.</SheetDescription>
              </SheetHeader>
              <div className="py-2"><AccountControl /></div>
              <label className="block text-sm text-slate-300">
                Find a page
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search readings, transits, profiles…" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white" />
              </label>
              <nav aria-label="All pages" className="space-y-6 pb-4">
                {groups.map(group => <section key={group} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-200">{group}</h2>
                  {results.filter(item => item.group === group).map(item => (
                    <Link href={item.href} key={item.href} onClick={event => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                      event.preventDefault();
                      if (item.href === path) { setOpen(false); return; }
                      // Replace the drawer's same-URL history entry with the
                      // selected page, so Back returns to the original screen.
                      prepareOverlayNavigation();
                      navigate(item.href, { replace: true });
                      setOpen(false);
                    }} className="block min-h-12 rounded-xl px-3 py-3 hover:bg-white/5">
                      <span className="block text-sm font-semibold text-slate-100">{item.title}</span>
                      <span className="text-sm leading-5 text-slate-400">{item.description}</span>
                    </Link>
                  ))}
                </section>)}
                {!results.length && <p role="status" className="text-sm text-slate-400">No pages match. Try “chart”, “energy” or “profile”.</p>}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
