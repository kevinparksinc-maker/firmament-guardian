import { useEffect, useState } from "react";
import { BookOpenText, Compass, Menu, MoonStar, Orbit, Sparkles, Stars, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import "./GuardianNavigation.css";

const routes = [
  { href: "/", label: "Home", Icon: Compass },
  { href: "/horary", label: "Horary", Icon: MoonStar },
  { href: "/zodiac-readings", label: "12 Sign Readings", Icon: Sparkles },
  { href: "/sky", label: "Celestial Map", Icon: Orbit },
  { href: "/history", label: "Library", Icon: BookOpenText },
];

export function GuardianNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location]);

  // Home already includes the full-width celestial landing navigation.
  if (location === "/") return null;

  return (
    <header className="guardian-global-nav">
      <nav className="guardian-global-nav-inner" aria-label="Firmament Guardian main navigation">
        <Link href="/" className="guardian-global-brand" aria-label="Firmament Guardian home">
          <Stars size={21} aria-hidden="true" />
          <span><strong>FIRMAMENT</strong><small>GUARDIAN · CELESTIAL WISDOM</small></span>
        </Link>
        <div className="guardian-global-desktop-links">
          {routes.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={location === href ? "page" : undefined} className={location === href ? "active" : ""}>
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
        <nav id="guardian-global-mobile-links" className="guardian-global-mobile-links" aria-label="Firmament Guardian mobile navigation">
          {routes.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={location === href ? "page" : undefined} className={location === href ? "active" : ""} onClick={() => setOpen(false)}>
              <Icon size={19} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
