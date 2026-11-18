/**
 * Horary-style testimony map for ordinary chart synthesis.
 *
 * This is a compact *view* of already calculated facts, not a second chart
 * calculator or a second interpretation pipeline. Agent and God natal views
 * share the same planetary longitude and must never be counted twice.
 */
import type { ChartResult, ChartRow } from "./astronomy";
import type { UnifiedMasterChartSnapshot } from "./masterChart/types";

export type ThreeChartReadingMode = "natal" | "transit" | "combined";

const finiteHouse = (value: number | undefined): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12
    ? value
    : null;

function placement(row: ChartRow) {
  return {
    body: row.name,
    longitude: row.longitude,
    signAndDegree: row.display,
    godHouse: finiteHouse(row.godHouse),
    agentHouse: finiteHouse(row.agentHouse),
    retrograde: Boolean(row.retrograde),
    frameRelationship: row.frameRelationship
      ? { type: row.frameRelationship.type, translation: row.frameRelationship.translation }
      : null,
  };
}

/** Assemble three related views without inventing or re-calculating positions. */
export function buildThreeChartTestimony(chart: ChartResult, mode: ThreeChartReadingMode, snapshot?: UnifiedMasterChartSnapshot) {
  const eventOnly = chart.input?.chartRole === "event";
  const live = mode !== "natal";
  const birth = [
    ...chart.movingBodies,
    chart.northNode,
    chart.southNode,
  ];
  const natal = eventOnly ? [] : birth.map(placement);
  const current = eventOnly
    ? birth.map(placement)
    : live ? (snapshot?.transit?.planets ?? chart.transits).map(placement) : [];
  // Keep all observed major and minor contacts. The master snapshot is a
  // fallback for callers whose canonical ChartResult has no transit rows.
  const rowContacts = chart.transits.flatMap(row => [
    ...row.natalContacts.map(contact => ({
      from: row.name,
      to: contact.natalName,
      aspect: contact.aspect,
      orb: contact.orb,
      weight: 1,
    })),
    ...row.minorNatalContacts.map(contact => ({
      from: row.name,
      to: contact.natalName,
      aspect: contact.aspect,
      orb: contact.orb,
      weight: contact.weightMultiplier,
    })),
  ]);
  const snapshotContacts = snapshot?.transit?.aspectsToNatal.map(contact => ({
    from: contact.transitBody,
    to: contact.natalBody,
    aspect: contact.aspect,
    orb: contact.orb,
    weight: 1,
  })) ?? [];
  const contacts = live
    ? rowContacts.length ? rowContacts : snapshotContacts
    : [];
  return {
    kind: "horary-style-three-chart-testimony" as const,
    mode,
    eventOnly,
    eventAgent: eventOnly ? {
      ascendant: chart.ascendant?.display ?? null,
      houses: chart.houses,
    } : null,
    natalAgent: {
      available: !eventOnly && chart.agentViewAvailable,
      ascendant: !eventOnly && chart.agentViewAvailable ? chart.ascendant?.display ?? null : null,
      houses: !eventOnly && chart.agentViewAvailable ? chart.houses : [],
      placements: natal.map(({ body, longitude, agentHouse }) => ({ body, longitude, house: agentHouse })),
    },
    natalGod: {
      frame: "fixed" as const,
      placements: natal.map(({ body, longitude, godHouse }) => ({ body, longitude, house: godHouse })),
    },
    currentGod: live || eventOnly
      ? {
          instantUtc: eventOnly ? chart.utc : snapshot?.transit?.transitInstantUtc ?? chart.transitDate,
          placements: current.map(({ body, longitude, godHouse }) => ({ body, longitude, house: godHouse })),
        }
      : null,
    frameTranslations: natal
      .filter(row => row.frameRelationship)
      .map(row => ({ body: row.body, ...row.frameRelationship })),
    transitContacts: contacts,
    safeguards: {
      sharedBirthPositionsCountOnce: true,
      eventSkyMustNotBecomePersonalNatal: true,
      currentSkyNotRequiredForNatal: true,
      useOnlyCalculatedContacts: true,
      noUnverifiedAnglesOrHouses: true,
    },
  };
}

/**
 * The method ledger and canon remain authoritative. This small cross-view map
 * tells the *same* interpreter how to weigh their relationships, as Horary does.
 */
export function threeChartJudgmentInstructions(mode: ThreeChartReadingMode, eventOnly = false): string {
  return [
    "THREE-CHART TESTIMONY — HORARY-STYLE WEIGHING, NOT THREE SEPARATE READINGS.",
    "Examine natal Agent houses, natal fixed God houses, and (for transit/combined readings) current God placements together.",
    "Treat each natal planetary longitude as one fact displayed in two frames; NEVER double-count it.",
    "Follow the supplied calculated transit contacts; never invent a contact, time, ruler, angle, or house.",
    "Respect chart role: independent event skies and sign-centered symbolic charts are not the reader\'s natal chart. Never turn them into a personal biography.",
    "Weigh primary testimony, corroboration, contradictions, and timing as one causal narrative. Trace house rulership and entwinement only where the method ledger supports it.",
    "Use all relevant calculated method outcomes from the authoritative synthesis; this map is an index and must not replace that evidence.",
    mode === "natal"
      ? "This is a permanent natal reading. Do not introduce today's sky or imply present-day transit timing."
      : mode === "transit"
        ? "Focus on present activations; distinguish natal foundations from temporary sky configurations."
        : "Integrate enduring natal foundations with current activations and give one clear, evidence-grounded judgment.",
    "Speak directly to the reader. Do not output three separate chart reports or a list of ingredients.",
  ].join("\n");
}
