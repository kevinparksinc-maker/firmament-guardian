import { FIXED_STARS, normalizeLongitude } from "../shared/hybrid";

export type Worldview = "god" | "agent" | "agent-vs-god";
export type ReadingScope = "natal" | "transit" | "combined";

const ROYAL_STAR_NAMES = new Set(["Aldebaran", "Regulus", "Antares", "Fomalhaut"]);
export const ROYAL_STARS = FIXED_STARS
  .filter(([name]) => ROYAL_STAR_NAMES.has(name))
  .map(([name, longitude]) => ({ name, longitude }));

export type RoyalStarContact = {
  name: string;
  longitude: number;
  distance: number;
  contact: boolean;
  weight: number;
};

export type FrameRelationshipType = "convergence" | "translation" | "tension" | "concealment";

export type FrameRelationship = {
  type: FrameRelationshipType;
  godThemes: string[];
  agentThemes: string[];
  translation: string;
  tension: string | null;
  synthesis: string;
};

export type DualPlacement = {
  godHouse: number;
  royalStarContacts: RoyalStarContact[];
  agentHouse?: number;
  frameRelationship?: FrameRelationship;
};

const HOUSE_THEMES: Record<number, { label: string; themes: string[]; private: boolean; visible: boolean }> = {
  1: { label: "identity and initiative", themes: ["selfhood", "beginnings", "agency"], private: false, visible: true },
  2: { label: "resources and values", themes: ["money", "possessions", "self-worth"], private: false, visible: true },
  3: { label: "learning and exchange", themes: ["communication", "information", "movement"], private: false, visible: true },
  4: { label: "roots and foundations", themes: ["home", "family", "belonging"], private: true, visible: false },
  5: { label: "creative expression", themes: ["creativity", "pleasure", "romance"], private: false, visible: true },
  6: { label: "work and maintenance", themes: ["routine", "service", "skill-building"], private: false, visible: true },
  7: { label: "partnership and encounter", themes: ["relationships", "contracts", "mirroring"], private: false, visible: true },
  8: { label: "depth and shared entanglement", themes: ["shared resources", "intimacy", "transformation"], private: true, visible: false },
  9: { label: "meaning and horizons", themes: ["belief", "study", "long journeys"], private: false, visible: true },
  10: { label: "public direction", themes: ["career", "authority", "reputation"], private: false, visible: true },
  11: { label: "community and future aims", themes: ["networks", "alliances", "hopes"], private: false, visible: true },
  12: { label: "withdrawal and preparation", themes: ["private work", "closure", "behind-the-scenes development"], private: true, visible: false },
};

function houseThemes(house: number) {
  return HOUSE_THEMES[house] ?? { label: "an unclassified field", themes: [], private: false, visible: false };
}

function isOppositeHouse(first: number, second: number) {
  return ((first - 1 + 6) % 12) + 1 === second;
}

/**
 * Builds the deliberate translation between the fixed zodiac frame and the
 * observer-specific Equal House frame. It never recalculates a longitude.
 */
export function buildFrameRelationship(godHouse: number, agentHouse: number): FrameRelationship {
  const god = houseThemes(godHouse);
  const agent = houseThemes(agentHouse);
  const same = godHouse === agentHouse;
  const concealment = agentHouse === 12;
  const tension = !same && !concealment && isOppositeHouse(godHouse, agentHouse);
  const type: FrameRelationshipType = same ? "convergence" : concealment ? "concealment" : tension ? "tension" : "translation";

  const translation = same
    ? `The broader field of ${god.label} is expressed directly through the person's ${agent.label}.`
    : concealment
      ? `A broader field of ${god.label} is being experienced through private work, closure, retreat, or preparation rather than immediate visibility.`
      : `A broader field of ${god.label} is being translated into the person's lived experience through ${agent.label}.`;
  const tensionText = tension
    ? `The two frames face one another across an axis: ${god.label} may pull against the way the experience is currently being lived through ${agent.label}.`
    : null;
  const synthesis = tensionText
    ?? (same
      ? `The collective and personal frames reinforce one another around ${godThemesSentence(god.themes)}.`
      : `The collective frame supplies the wider context; the Agent frame shows the channel through which ${godThemesSentence(god.themes)} becomes concrete.`);

  return {
    type,
    godThemes: god.themes,
    agentThemes: agent.themes,
    translation,
    tension: tensionText,
    synthesis,
  };
}

function godThemesSentence(themes: string[]) {
  if (themes.length < 2) return themes[0] ?? "the supplied symbolism";
  return `${themes.slice(0, -1).join(", ")}, and ${themes[themes.length - 1]}`;
}

export function godHouseFor(longitude: number) {
  return Math.floor(normalizeLongitude(longitude) / 30) + 1;
}

export function agentHouseFor(longitude: number, ascendant: number) {
  return Math.floor(normalizeLongitude(longitude - ascendant) / 30) + 1;
}

export function equalHouseCusps(ascendant: number) {
  return Array.from({ length: 12 }, (_, index) => Number(normalizeLongitude(ascendant + index * 30).toFixed(6)));
}

export function angularDistance(a: number, b: number) {
  const distance = Math.abs(normalizeLongitude(a - b));
  return Math.min(distance, 360 - distance);
}

export function royalStarContacts(longitude: number, orb = 5): RoyalStarContact[] {
  return ROYAL_STARS.map(star => {
    const distance = Number(angularDistance(longitude, star.longitude).toFixed(4));
    const weight = distance <= orb ? Math.max(1, 5 - Math.floor(distance)) : 0;
    return { ...star, distance, contact: weight > 0, weight };
  });
}

export function godPlacement(longitude: number): { godHouse: number; royalStarContacts: RoyalStarContact[] } {
  return { godHouse: godHouseFor(longitude), royalStarContacts: royalStarContacts(longitude) };
}

export function agentPlacement(longitude: number, ascendant: number): { agentHouse: number } {
  return { agentHouse: agentHouseFor(longitude, ascendant) };
}

export function dualPlacement(longitude: number, ascendant?: number | null) {
  return ascendant == null
    ? godPlacement(longitude)
    : { ...godPlacement(longitude), ...agentPlacement(longitude, ascendant), frameRelationship: buildFrameRelationship(godHouseFor(longitude), agentHouseFor(longitude, ascendant)) };
}
