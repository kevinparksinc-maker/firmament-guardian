import { useMemo, useState } from "react";
import { ChevronDown, MoonStar, Orbit, Sparkles, Star } from "lucide-react";
import type { ChartResult } from "../../../server/astronomy";

const planetThemes: Record<string, string> = {
 Sun: "identity and purpose", Moon: "emotions and emotional security",
 Mercury: "communication and learning", Venus: "relationships and personal values",
 Mars: "motivation and courage", Jupiter: "growth and beliefs",
 Saturn: "responsibility and discipline", Uranus: "independence and change",
 Neptune: "imagination and ideals", Pluto: "transformation and hidden motivations",
};
type Insight = { id: string; category: string; title: string; teaser: string; facts: string[]; tone: "gold" | "cyan" | "violet" | "pink" };
const tones = {
  gold: "border-amber-300/70 shadow-[0_0_22px_rgba(255,211,134,.13)]",
  cyan: "border-cyan-300/70 shadow-[0_0_22px_rgba(105,232,255,.13)]",
  violet: "border-violet-300/70 shadow-[0_0_22px_rgba(192,145,255,.13)]",
  pink: "border-fuchsia-300/70 shadow-[0_0_22px_rgba(255,120,207,.13)]",
};

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
        teaser: `Fun fact: Your ${planet.name} sits in House ${planet.house}! In traditional astrology, ${planet.name} relates to ${planetThemes[planet.name] ?? "an important dimension of life"}.`,
        facts: evidence, tone: "gold",
      });
      entries.push({
        id: `mansion-${planet.name}`, category: "DID YOU KNOW? · LUNAR MANSIONS",
        title: `${planet.name} in ${planet.overlay.nakshatra}`,
        teaser: `Did you know? Your ${planet.name} falls within the lunar mansion ${planet.overlay.nakshatra}, pada ${planet.overlay.pada}. Different astrological traditions map this same sky in different ways.`,
        facts: evidence, tone: "cyan",
      });
      entries.push({
        id: `decan-${planet.name}`, category: "DID YOU KNOW? · DECANS",
        title: `${planet.name}: your elemental decan`,
        teaser: `Fun fact: Your ${planet.name} belongs to ${planet.overlay.decan}, part of a traditional system of 36 ten-degree zodiac divisions.`,
        facts: evidence, tone: "pink",
      });
    }
    if (chart.readingScope !== "natal") {
      for (const transit of chart.transits) {
        const contacts = transit.natalContacts.filter(c => c.orb <= 5).sort((a,b) => a.orb-b.orb);
        entries.push({
          id: `transit-${transit.name}`, category: "PERSONAL DIVINE WEATHER",
          title: `Transit ${transit.name} · ${transit.display}`,
          teaser: contacts.length
            ? `Fun fact: Moving ${transit.name} makes ${contacts.length} close contact${contacts.length === 1 ? "" : "s"} with your natal chart inside your 5° orb.`
            : `Fun fact: Moving ${transit.name} has no major natal contacts within your 5° orb at this moment.`,
          facts: [`Transit timestamp: ${chart.transitDate}`, `Calculated placement: ${transit.display}`,
            ...contacts.map(c => `${c.aspect} natal ${c.natalName}, orb ${c.orb.toFixed(2)}°`)],
          tone: "violet",
        });
      }
    }
    return entries;
  }, [chart]);
  const dayIndex = new Date().getUTCDate();
  const cards = insights.length ? [...insights.slice(dayIndex % insights.length), ...insights.slice(0, dayIndex % insights.length)] : [];
  return (
    <section aria-label="Personal divine discoveries" className={`${compact ? "mb-4" : "mb-8"} rounded-3xl border-2 border-amber-300/65 bg-slate-950/45 p-4 shadow-[0_0_32px_rgba(255,207,117,.13)] backdrop-blur-xl sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-200">Your living natal dossier</p>
          <h2 className="mt-1 font-serif text-2xl text-white sm:text-3xl">Discover Your Firmament</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">Enjoy quick fun facts about your own chart right here on the homepage. Swipe for more, or tap a card to explore its meaning and calculated evidence.</p>
        </div>
        <span className="rounded-full border border-cyan-300/45 px-3 py-1.5 text-xs text-cyan-100">{insights.length} calculated discoveries</span>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4" aria-label="Swipeable personal discovery cards">
        {cards.map((item, index) => (
          <button type="button" key={item.id} onClick={() => setOpenId(openId === item.id ? null : item.id)}
            aria-expanded={openId === item.id}
            className={`w-[min(80vw,320px)] shrink-0 snap-start rounded-2xl border-2 bg-slate-950/65 p-4 text-left backdrop-blur-lg transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${tones[item.tone]}`}>
            <div className="mb-3 flex items-center justify-between text-amber-100">{item.tone === "cyan" ? <MoonStar size={22}/> : item.tone === "violet" ? <Orbit size={22}/> : item.tone === "pink" ? <Star size={22}/> : <Sparkles size={22}/>}<span className="text-xs text-slate-400">{index+1} / {cards.length}</span></div>
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-cyan-200">{item.category}</p>
            <h3 className="mt-2 font-serif text-lg text-white">{item.title}</h3>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-200">{item.teaser}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs font-semibold text-amber-200">Go deeper · Meaning & evidence <ChevronDown size={16} className={openId === item.id ? "rotate-180" : ""}/></div>
          </button>
        ))}
      </div>
      {openId && (() => {
        const chosen = insights.find(i => i.id === openId);
        return chosen ? <div role="region" aria-live="polite" className="mt-3 rounded-2xl border border-cyan-300/60 bg-slate-950/70 p-4">
          <p className="font-semibold text-amber-200">{chosen.title} · Deeper discovery</p><p className="mt-2 text-sm leading-6 text-slate-200">{chosen.teaser}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">{chosen.facts.map((fact,i) => <li key={i} className="border-l-2 border-cyan-300/60 pl-3">{fact}</li>)}</ul>
          <p className="mt-3 text-xs text-slate-400">These are calculated chart positions and tradition-specific classifications, not a prediction of personal behavior.</p>
        </div> : null;
      })()}
    </section>
  );
}