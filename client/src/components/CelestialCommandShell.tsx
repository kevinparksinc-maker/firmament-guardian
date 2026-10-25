import { useLocation, Link } from "wouter";
import { BookOpenText, Compass, Heart, Headphones, Layers3, MoonStar, Orbit, Sparkles, Users, CloudSun, Stars, Globe } from "lucide-react";
import type { ReactNode } from "react";
import { GuardianNavigation } from "./GuardianNavigation";
import { PrimaryProfileNavigation } from "./PrimaryProfileNavigation";
import { isProfileRoute } from "@/config/profileNavigation";
import "./CelestialCommandShell.css";

const entries = [
  { href:"/", name:"Home & Natal", icon:Compass },
  { href:"/ephemeris", name:"Daily Ephemeris", icon:Globe },
  { href:"/guide?tab=blueprint#main-cosmos-tabs", name:"Divine Blueprint", icon:Layers3 },
  { href:"/guide?tab=synastry#main-cosmos-tabs", name:"Synastry & Chemistry", icon:Heart },
  { href:"/guide?tab=weather#main-cosmos-tabs", name:"Cosmic Weather", icon:CloudSun },
  { href:"/guide?tab=podcast#main-cosmos-tabs", name:"Audio Observatory", icon:Headphones },
  { href:"/guide?tab=social#main-cosmos-tabs", name:"Loved Ones", icon:Users },
  { href:"/horary", name:"Traditional Horary", icon:MoonStar },
  { href:"/zodiac-readings", name:"Twelve Divine Gates", icon:Sparkles },
  { href:"/sky", name:"Divine Map", icon:Orbit },
  { href:"/history", name:"Reading Library", icon:BookOpenText },
];

export function CelestialCommandShell({children}:{children:ReactNode}) {
  const [path] = useLocation();
  const tab = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("tab");
  const profileWorkspace = isProfileRoute(path);
  if (profileWorkspace) return <div className="fg-command-shell"><PrimaryProfileNavigation/><main className="min-w-0 pb-20 md:pb-0">{children}</main></div>;
  return <div className="fg-command-shell">
    <GuardianNavigation/>
    <PrimaryProfileNavigation/>
    <div className="fg-command-layout pb-20 md:pb-0">
      <aside className="fg-command-side" aria-label="Divine Observatory modules">
        <div className="fg-command-side-label">THE OBSERVATORY</div>
        <nav aria-label="Full application navigation">
          {entries.map(({href,name,icon:Icon})=>{
            const route=href.split("?")[0].split("#")[0];
            const query=href.includes("?tab=")?href.split("?tab=")[1].split("#")[0]:null;
            const active = path===route && (query ? tab===query : !tab);
            return <Link href={href} key={href} aria-current={active?"page":undefined} onClick={event=>{
              if(path==="/guide" && query){
                event.preventDefault();
                window.history.replaceState({}, "", href);
                window.dispatchEvent(new CustomEvent("fg:select-tab",{detail:{tab:query}}));
                document.getElementById("main-cosmos-tabs")?.scrollIntoView({behavior:"smooth",block:"start"});
              }
            }}>
              <Icon size={17} aria-hidden="true"/><span>{name}</span>
            </Link>;
          })}
        </nav>
        <div className="fg-command-side-note"><Stars size={16}/><strong>TWO SKIES · ONE MOMENT</strong>Moving planets and a permanent stellar frame. Every module retains the same divine foundation.</div>
      </aside>
      <div className="fg-command-main">{children}</div>
    </div>
  </div>;
}