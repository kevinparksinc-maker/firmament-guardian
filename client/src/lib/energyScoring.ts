import type { ChartResult, TransitContact } from "../../../server/astronomy";

/** One deterministic scoring policy for the homepage and Energy Read. */
export const ENERGY_MAX_ORB = 5;
export const ENERGY_ASPECT_FLOW: Record<TransitContact["aspect"], -1 | 0 | 1> = {
  conjunction: 1, trine: 1, sextile: 1, square: -1, opposition: -1,
  semisquare: -1,
};
const PLANET_STARS: Record<string, number> = {
  Sun: 5, Moon: 5, Mars: 5, Jupiter: 5, Saturn: 5, Pluto: 5,
  Mercury: 4, Neptune: 4, Venus: 3, Uranus: 3,
  "North Node": 4, "South Node": 4, Ascendant: 4, Descendant: 4,
};
const MAJOR = new Set<TransitContact["aspect"]>(["conjunction", "trine", "sextile", "square", "opposition"]);
export function energyIntensity(orb: number): number {
  if (!Number.isFinite(orb) || orb < 0 || orb > ENERGY_MAX_ORB) return 0;
  return Math.max(1, 5 - Math.floor(orb));
}
export function calculateEnergyRead(chart: ChartResult | null | undefined) {
  if (!chart || chart.readingScope === "natal") return null;
  const contacts = (chart.transits ?? []).flatMap(body =>
    [...(body.natalContacts ?? []), ...(body.minorNatalContacts ?? [])]
      .filter(contact => Number.isFinite(contact.orb) && contact.orb >= 0 && contact.orb <= ENERGY_MAX_ORB)
      .map(contact => {
        const intensity = energyIntensity(contact.orb);
        const majorFactor = MAJOR.has(contact.aspect) ? 1 : 0.5;
        const stars = PLANET_STARS[body.name] ?? 3;
        const natalStars = PLANET_STARS[contact.natalName] ?? 3;
        const strength = intensity * stars * natalStars * majorFactor;
        return {
          ...contact, transit: body.name, natal: contact.natalName,
          id: `${body.name}-${contact.aspect}-${contact.natalName}`,
          intensity, stars, natalStars, majorFactor, strength,
          flow: ENERGY_ASPECT_FLOW[contact.aspect] ?? 0,
        };
      })
  );
  const harmonious = contacts.filter(c => c.flow === 1);
  const challenging = contacts.filter(c => c.flow === -1);
  const dynamic = contacts.filter(c => c.flow === 0);
  const flowWeight = harmonious.reduce((sum, c) => sum + c.strength, 0);
  const frictionWeight = challenging.reduce((sum, c) => sum + c.strength, 0);
  const total = flowWeight + frictionWeight;
  const flowPct = total ? Math.round(100 * flowWeight / total) : 0;
  const frictionPct = total ? 100 - flowPct : 0;
  const signal = !contacts.length ? "No active contacts"
    : flowWeight > frictionWeight * 1.3 ? "Harmonious Flow"
    : frictionWeight > flowWeight * 1.3 ? "Dynamic Friction"
    : "Balanced Synthesis";
  return { contacts, harmonious, challenging, dynamic, flowWeight, frictionWeight,
    flowPct, frictionPct, signal, contactsCount: contacts.length,
    tightest: [...contacts].sort((a,b) => a.orb - b.orb)[0] };
}
