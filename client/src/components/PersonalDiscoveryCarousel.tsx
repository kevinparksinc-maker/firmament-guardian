import { useMemo, useState } from "react";
import { ChevronDown, MoonStar, Orbit, Sparkles, Star } from "lucide-react";
import type { ChartResult } from "../../../server/astronomy";
import { MAJOR_ASPECT_ORB_DEGREES } from "../../../shared/chartRules";

type Insight = { id: string; category: string; title: string; teaser: string; facts: string[]; tone: "gold" | "cyan" | "violet" | "pink" };
const tones = {
  gold: "border-amber-300/70 shadow-[0_0_22px_rgba(255,211,134,.13)]",
  cyan: "border-cyan-300/70 shadow-[0_0_22px_rgba(105,232,255,.13)]",
  violet: "border-violet-300/70 shadow-[0_0_22px_rgba(192,145,255,.13)]",
  pink: "border-fuchsia-300/70 shadow-[0_0_22px_rgba(255,120,207,.13)]",
};

const planetThemes: Record<string, string> = {
 Sun:"identity, purpose and visibility", Moon:"emotional needs and instincts",
 Mercury:"thinking, language and communication", Venus:"affection, values and connection",
 Mars:"drive, courage and taking action", Jupiter:"growth, opportunity and belief",
 Saturn:"responsibility, boundaries and discipline", Uranus:"independence and change",
 Neptune:"imagination, ideals and discernment", Pluto:"intensity, transformation and power"
};
const houseThemes: Record<number, string> = {
 1:"identity",2:"resources and values",3:"learning and communication",
 4:"home and family",5:"creativity and pleasure",6:"habits and daily work",
 7:"partnership",8:"shared resources and change",9:"beliefs and exploration",
 10:"career and public life",11:"friendships and long-range hopes",
 12:"reflection and hidden patterns"
};
const humanMeaning = (name:string,house:number) =>
 `Traditionally, ${name} speaks to ${planetThemes[name] ?? "a planetary life theme"}. House ${house} connects that symbolism to ${houseThemes[house] ?? "an area of life"}.`;

/** No generated readings or example scores: each entry reads existing calculated chart data. */
export function PersonalDiscoveryCarousel({ chart, compact = false }: { chart: ChartResult; compact?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const insights = useMemo<Insight[]>(() => {
    const entries: Insight[] = [];
    for (const planet of chart.movingBodies) {
      const evidence = [
        `Calculated position: ${planet.display} (${planet.longitude.toFixed(4)}° longitude)`,
        `House: ${planet.house}`,
        `Element-family decan: ${planet.overlay.decan}`,
        `Nakshatra: ${planet.overlay.nakshatra}, pada ${planet.overlay.pada}`,
        `Arabic Manzil: ${planet.overlay.manzil}`,
      ];
      entries.push({
        id: `planet-${planet.name}`, category: "YOUR NATAL PLACEMENT",
        title: `${planet.name} · House ${planet.house}`,
        teaser: humanMeaning(planet.name, planet.house),
        facts: evidence, tone: "gold",
      });
      entries.push({
        id: `mansion-${planet.name}`, category: "DID YOU KNOW? · LUNAR MANSIONS",
        title: `${planet.name} in ${planet.overlay.nakshatra}`,
        teaser: `Your ${planet.name} maps to nakshatra ${planet.overlay.nakshatra} (pada ${planet.overlay.pada}) and Arabic manzil ${planet.overlay.manzil} in this chart's configured overlays.`,
        facts: evidence, tone: "cyan",
      });
      entries.push({
        id: `decan-${planet.name}`, category: "DID YOU KNOW? · DECANS",
        title: `${planet.name}: your elemental decan`,
        teaser: `This placement belongs to ${planet.overlay.decan}.`,
        facts: evidence, tone: "pink",
      });
    }
    if (chart.readingScope !== "natal") {
      for (const transit of chart.transits) {
        const contacts = transit.natalContacts.filter(c => c.orb <= MAJOR_ASPECT_ORB_DEGREES).sort((a,b) => a.orb-b.orb);
        entries.push({
          id: `transit-${transit.name}`, category: "PERSONAL CELESTIAL WEATHER",
          title: `Transit ${transit.name} · ${transit.display}`,
          teaser: contacts.length
            ? `${contacts.length} calculated natal aspect${contacts.length === 1 ? "" : "s"} inside your ${MAJOR_ASPECT_ORB_DEGREES}° orb.`
            : "No major natal aspect inside your 5° orb at the selected transit moment.",
          facts: [`Transit timestamp: ${chart.transitDate}`, `Calculated placement: ${transit.display}`,
            ...contacts.map(c => `${c.aspect} natal ${c.natalName}, orb ${c.orb.toFixed(2)}°`)],
          tone: "violet",
        });
      }
    }
    return entries;
  }, [chart]);
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const cards = insights.length ? [...insights.slice(dayIndex % insights.length), ...insights.slice(0, dayIndex % insights.length)] : [];
  return (
    <section aria-label="Personal celestial discoveries" className={compact ? "rounded-2xl border border-white/10 bg-[#111622]/85 p-4" : "mb-8 rounded-3xl border-2 border-amber-300/65 bg-slate-950/45 p-4 shadow-[0_0_32px_rgba(255,207,117,.13)] backdrop-blur-xl sm:p-6"}>
      {compact ? <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Sparkles size={15} className="text-[#D4AF37]"/> Chart Insights</h2><span className="text-[10px] text-slate-400">Swipe to explore →</span></div> : <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-200">Your living natal dossier</p>
          <h2 className="mt-1 font-serif text-2xl text-white sm:text-3xl">Discover Your Firmament</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">Swipe to explore real placements, mansions, elemental decans, and calculated transit contacts. Tap any discovery for the evidence.</p>
        </div>
        <span className="rounded-full border border-cyan-300/45 px-3 py-1.5 text-xs text-cyan-100">{insights.length} calculated discoveries</span>
      </div>}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4" aria-label="Swipeable personal discovery cards">
        {cards.map((item, index) => (
          <button type="button" key={item.id} onClick={() => setOpenId(openId === item.id ? null : item.id)}
            aria-expanded={openId === item.id}
            className={compact ? "w-[min(70vw,280px)] shrink-0 snap-start rounded-xl border border-white/10 bg-gradient-to-br from-[#172034] to-[#090e19] p-4 text-left transition hover:border-[#D4AF37]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200" : `w-[min(80vw,320px)] shrink-0 snap-start rounded-2xl border-2 bg-slate-950/65 p-4 text-left backdrop-blur-lg transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${tones[item.tone]}`}>
            <div className="mb-3 flex items-center justify-between text-amber-100">{item.tone === "cyan" ? <MoonStar size={22}/> : item.tone === "violet" ? <Orbit size={22}/> : item.tone === "pink" ? <Star size={22}/> : <Sparkles size={22}/>}<span className="text-xs text-slate-400">{index+1} / {cards.length}</span></div>
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-cyan-200">{item.category}</p>
            <h3 className="mt-2 font-serif text-lg text-white">{item.title}</h3>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-200">{item.teaser}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs font-semibold text-amber-200">Show exact chart evidence <ChevronDown size={16} className={openId === item.id ? "rotate-180" : ""}/></div>
          </button>
        ))}
      </div>
      {openId && (() => {
        const chosen = insights.find(i => i.id === openId);
        return chosen ? <div role="region" aria-live="polite" className="mt-3 rounded-2xl border border-cyan-300/60 bg-slate-950/70 p-4">
          <p className="font-semibold text-amber-200">{chosen.title} · Chart evidence</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">{chosen.facts.map((fact,i) => <li key={i} className="border-l-2 border-cyan-300/60 pl-3">{fact}</li>)}</ul>
          <p className="mt-3 text-xs text-slate-400">These are calculated chart positions and tradition-specific classifications, not a prediction of personal behavior.</p>
        </div> : null;
      })()}
    </section>
  );
}
