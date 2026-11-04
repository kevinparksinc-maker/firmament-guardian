import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Stars, X } from "lucide-react";
import { PROFILE_TABS } from "@/config/profileNavigation";
import { searchDirectory } from "@/config/appDirectory";
import { AccountControl } from "./AccountControl";
import "./GuardianNavigation.css";

export function GuardianNavigation() {
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    setOpen(false);
    setQuery("");
    window.scrollTo({ top: 0 });
  }, [path]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const results = searchDirectory(query);
  const groups = Array.from(new Set(results.map(item => item.group)));
  return (
    <header className="guardian-global-nav sticky top-0 z-50">
      <nav
        className="guardian-global-nav-inner"
        aria-label="The Absolute main navigation"
      >
        <Link href="/" className="guardian-global-brand">
          <Stars size={22} aria-hidden="true" />
          <span>
            <strong>THE ABSOLUTE</strong>
            <small>Your personal observatory</small>
          </span>
        </Link>
        <div className="guardian-global-desktop-links">
          {PROFILE_TABS.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={
                path === tab.href ||
                (tab.href !== "/" && path.startsWith(`${tab.href}/`))
                  ? "page"
                  : undefined
              }
              className={path === tab.href ? "active" : ""}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <AccountControl />
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-slate-200"
            aria-controls="app-page-index"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
            <span className="hidden sm:inline">Index</span>
          </button>
        </div>
      </nav>
      {open && (
        <nav
          id="app-page-index"
          aria-label="All pages"
          className="max-h-[75dvh] space-y-5 overflow-y-auto border-t border-white/10 bg-[#080f1f] p-5 sm:p-7"
        >
          <div className="mx-auto max-w-5xl">
            <label className="block text-sm text-slate-300">
              Find a page
              <input
                autoFocus
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search readings, transits, profiles…"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-white"
              />
            </label>
          </div>
          <div className="mx-auto grid max-w-5xl gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => (
              <section key={group} className="space-y-3">
                <h2 className="text-xs uppercase tracking-widest text-amber-200">
                  {group}
                </h2>
                {results
                  .filter(item => item.group === group)
                  .map(item => (
                    <Link
                      href={item.href}
                      key={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl p-2 hover:bg-white/5"
                    >
                      <span className="block text-sm font-semibold text-slate-100">
                        {item.title}
                      </span>
                      <span className="text-xs leading-5 text-slate-400">
                        {item.description}
                      </span>
                    </Link>
                  ))}
              </section>
            ))}
          </div>
          {!results.length && (
            <p role="status" className="text-sm text-slate-400">
              No pages match. Try “chart”, “energy” or “profile”.
            </p>
          )}
        </nav>
      )}
    </header>
  );
}
