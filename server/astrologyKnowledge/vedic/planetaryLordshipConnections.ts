import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";

/** Structural Parashari sign lordship only. Equal House occupancy comes from the Master Chart. */
export const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
export const LORDSHIP_PLANETS = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
] as const;
export type LordshipPlanet = typeof LORDSHIP_PLANETS[number];
export type LordshipFlow = { fromHouse: number; toHouse: number; type: "carry" };
export type LordshipExchange = {
  partnerPlanet: LordshipPlanet;
  /** Sign-level exchange; distinct from Equal House occupancy. */
  myOccupiedSign: string;
  partnerOccupiedSign: string;
};
export type PlanetLordshipConnection = {
  planet: LordshipPlanet;
  occupiedHouse: number;
  ruledHouses: number[];
  connections: LordshipFlow[];
  selfPlacedFor: number[];
  coRuledPair: [number, number] | null;
  exchangeWith: LordshipExchange | null;
};

type Placement = { name: string; longitude: number; house: number };
const signOf = (longitude: number) =>
  ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];

/**
 * The chart engine owns Equal House assignments and projected longitudes.
 * Rulership is determined by the sign on each *actual Equal House cusp*.
 * A house cusp is NOT assumed to be a whole-sign house boundary.
 * Exchanges are mutual sign dispositor relationships, not house-number swaps.
 */
export function buildPlanetaryLordshipConnections(input: {
  ascendantLongitude: number;
  houseCusps: number[];
  placements: Placement[];
}): PlanetLordshipConnection[] {
  if (!Number.isFinite(input.ascendantLongitude) || input.houseCusps.length !== 12 ||
      input.houseCusps.some(c => !Number.isFinite(c)))
    throw new Error("LORDSHIP_REQUIRES_VALID_EQUAL_HOUSES");

  const points = new Map(input.placements.map(p => [p.name, p]));
  // Raw node aliases are explicitly handled without assigning nodes sign lordship.
  const resolved = (name: LordshipPlanet) =>
    points.get(name) ?? (name === "Rahu" ? points.get("North Node") ?? points.get("NorthNode")
      : name === "Ketu" ? points.get("South Node") ?? points.get("SouthNode") : undefined);

  const lordSigns: Record<string, string[]> = {};
  for (const [sign, lord] of Object.entries(SIGN_LORDS))
    (lordSigns[lord] ??= []).push(sign);

  const houseOfRuledSign = (sign: string): number[] =>
    input.houseCusps.flatMap((cusp, i) => signOf(cusp) === sign ? [i + 1] : []);

  return LORDSHIP_PLANETS.map(planet => {
    const p = resolved(planet);
    if (!p || !Number.isFinite(p.longitude) || !Number.isInteger(p.house) ||
        p.house < 1 || p.house > 12)
      throw new Error(`LORDSHIP_INVALID_PLACEMENT_${planet}`);
    const occupiedHouse = p.house; // existing Agent Equal House; never recompute from the sign
    const ruledHouses = [...new Set((lordSigns[planet] ?? []).flatMap(houseOfRuledSign))]
      .sort((a, b) => a - b);
    const selfPlacedFor = ruledHouses.filter(h => h === occupiedHouse);
    const connections = ruledHouses
      .filter(h => h !== occupiedHouse)
      .map(fromHouse => ({ fromHouse, toHouse: occupiedHouse, type: "carry" as const }));
    const coRuledPair: [number, number] | null =
      ruledHouses.length === 2 ? [ruledHouses[0], ruledHouses[1]] : null;

    // Mutual sign exchange: P is in Q's sign and Q is in P's sign.
    // Node lordship is absent in the classical configuration.
    const pSign = signOf(p.longitude);
    const partnerName = SIGN_LORDS[pSign] as LordshipPlanet;
    const partner = resolved(partnerName);
    const partnerSign = partner && Number.isFinite(partner.longitude)
      ? signOf(partner.longitude) : undefined;
    const exchangeWith: LordshipExchange | null =
      partnerName !== planet && (lordSigns[planet] ?? []).includes(partnerSign ?? "") &&
      partnerSign !== undefined
        ? { partnerPlanet: partnerName, myOccupiedSign: pSign, partnerOccupiedSign: partnerSign }
        : null;

    return { planet, occupiedHouse, ruledHouses, connections, selfPlacedFor,
      coRuledPair, exchangeWith };
  });
}
