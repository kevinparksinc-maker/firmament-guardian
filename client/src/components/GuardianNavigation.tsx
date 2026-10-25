import { useEffect, useState, type MouseEvent } from "react";
import { BookOpenText, CloudSun, Compass, Headphones, Heart, Menu, MoonStar, Orbit, Sparkles, Stars, Users, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import "./GuardianNavigation.css";

const routes = [
  { href: "/", label: "Home", Icon: Compass },
  { href: "/horary", label: "Horary", Icon: MoonStar },
  { href: "/guide?tab=synastry#main-cosmos-tabs", label: "Synastry", Icon: Heart, mobileOnly: true },
  { href: "/guide?tab=weather#main-cosmos-tabs", label: "Cosmic Weather", Icon: CloudSun, mobileOnly: true },
  { href: "/guide?tab=podcast#main-cosmos-tabs", label: "Audio Readings", Icon: Headphones, mobileOnly: true },
  { href: "/guide?tab=social#main-cosmos-tabs", label: "Loved Ones", Icon: Users, mobileOnly: true },
  { href: "/zodiac-readings", label: "12 Sign Readings", Icon: Sparkles },
  { href: "/sky", label: "Divine Map", Icon: Orbit },
  { href: "/history", label: "Library", Icon: BookOpenText },
];

export function GuardianNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location]);

  const openModule = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location === "/guide" && href.startsWith("/guide?tab=")) {
      event.preventDefault();
      const tab = href.split("?tab=")[1].split("#")[0];
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new CustomEvent("fg:select-tab", { detail: { tab } }));
      document.getElementById("main-cosmos-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  };

  return (
    <header className="guardian-global-nav">
      <nav className="guardian-global-nav-inner" aria-label="The Absolute main navigation">
        <Link href="/" className="guardian-global-brand" aria-label="The Absolute home">
          <Stars size={21} aria-hidden="true" />
          <span><strong>THE ABSOLUTE</strong><small>UNCOVERING YOUR DIVINE CODE</small></span>
        </Link>
        <div className="guardian-global-desktop-links">
          {routes.filter(route => !("mobileOnly" in route)).map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={location === href ? "page" : undefined} className={location === href ? "active" : ""} onClick={event => openModule(event, href)}>
              <Icon size={16} aria-hidden="true" />{label}
            </Link>
          ))}
        </div>
        <button type="button" className="guardian-global-menu-toggle" aria-controls="guardian-global-mobile-links" aria-expanded={open} aria-label={open ? "Close navigation menu" : "Open navigation menu"} onClick={() => setOpen(value => !value)}>
          {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
          <span>Menu</span>
        </button>
      </nav>
      {open && (
        <nav id="guardian-global-mobile-links" className="guardian-global-mobile-links" aria-label="The Absolute mobile navigation">
          {routes.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={location === href ? "page" : undefined} className={location === href ? "active" : ""} onClick={event => { openModule(event, href); setOpen(false); }}>
              <Icon size={19} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
