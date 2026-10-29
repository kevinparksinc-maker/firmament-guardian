/** Canonical Energy Read V2: 10 natal planets × 10 transit planets, eight aspects. */
export const ENERGY_WEIGHTS = { Sun: 5, Moon: 5, Mercury: 4, Venus: 3, Mars: 5, Jupiter: 5, Saturn: 5, Uranus: 5, Neptune: 4, Pluto: 5 } as const;
export const ENERGY_ASPECTS = [
  { name: "conjunction", angle: 0, weight: 5, kind: "harmony" },
  { name: "trine", angle: 120, weight: 5, kind: "harmony" },
  { name: "sextile", angle: 60, weight: 3, kind: "harmony" },
  { name: "quintile", angle: 72, weight: 2, kind: "harmony" },
  { name: "opposition", angle: 180, weight: 5, kind: "friction" },
  { name: "square", angle: 90, weight: 5, kind: "friction" },
  { name: "quincunx", angle: 150, weight: 3, kind: "friction" },
  { name: "semisquare", angle: 45, weight: 2, kind: "friction" },
] as const;
export type EnergyBody = { name: string; longitude: number; agentHouse?: number; godHouse?: number };
export type EnergyContact = {
  natal: string; transit: string; aspect: typeof ENERGY_ASPECTS[number]["name"];
  polarity: "harmony" | "friction"; orb: number; natalPower: number; transitPower: number;
  aspectPower: number; intensity: number; score: number;
  natalAgentHouse?: number; transitAgentHouse?: number;
  natalGodHouse?: number; transitGodHouse?: number;
};
export function energyOrbIntensity(orb: number) {
  if (!Number.isFinite(orb) || orb < 0 || orb > 5) throw new Error("Invalid energy orb");
  return orb === 0 ? 5 : Math.max(1, 6 - Math.ceil(orb));
}
export function energySeparation(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid planetary longitude");
  const d = ((a - b) % 360 + 360) % 360;
  return Math.min(d, 360 - d);
}
function validateBodies(bodies: EnergyBody[], label: string) {
  const names = new Set<string>();
  if (bodies.length !== 10) throw new Error(`${label} must contain exactly 10 planets`);
  for (const body of bodies) {
    if (!Object.prototype.hasOwnProperty.call(ENERGY_WEIGHTS, body.name)) throw new Error(`Unknown ${label} planet: ${body.name}`);
    if (names.has(body.name)) throw new Error(`Duplicate ${label} planet: ${body.name}`);
    names.add(body.name);
    if (!Number.isFinite(body.longitude) || body.longitude < 0 || body.longitude >= 360) throw new Error(`Invalid ${label} longitude: ${body.name}`);
    for (const house of [body.agentHouse, body.godHouse]) {
      if (house !== undefined && (!Number.isInteger(house) || house < 1 || house > 12)) throw new Error(`Invalid ${label} house: ${body.name}`);
    }
  }
}
export function calculateEnergyRead(natal: EnergyBody[], transits: EnergyBody[]) {
  validateBodies(natal, "natal");
  validateBodies(transits, "transit");
  const contacts: EnergyContact[] = [];
  for (const n of natal) for (const t of transits) {
    const separation = energySeparation(n.longitude, t.longitude);
    for (const aspect of ENERGY_ASPECTS) {
      const orb = Math.abs(separation - aspect.angle);
      if (orb > 5) continue;
      const natalPower = ENERGY_WEIGHTS[n.name as keyof typeof ENERGY_WEIGHTS];
      const transitPower = ENERGY_WEIGHTS[t.name as keyof typeof ENERGY_WEIGHTS];
      const intensity = energyOrbIntensity(orb);
      contacts.push({
        natal: n.name, transit: t.name, aspect: aspect.name, polarity: aspect.kind,
        orb, natalPower, transitPower, aspectPower: aspect.weight, intensity,
        score: natalPower + transitPower + aspect.weight + intensity,
        natalAgentHouse: n.agentHouse, transitAgentHouse: t.agentHouse,
        natalGodHouse: n.godHouse, transitGodHouse: t.godHouse,
      });
      break; // At most one qualifying aspect per natal/transit planet pair.
    }
  }
  const friction = contacts.filter(c => c.polarity === "friction").reduce((sum, c) => sum + c.score, 0);
  const harmony = contacts.filter(c => c.polarity === "harmony").reduce((sum, c) => sum + c.score, 0);
  const total = friction + harmony;
  contacts.sort((a, b) => b.score - a.score || a.orb - b.orb || a.natal.localeCompare(b.natal) || a.transit.localeCompare(b.transit));
  return {
    contacts, friction, harmony, total,
    frictionCount: contacts.filter(c => c.polarity === "friction").length,
    harmonyCount: contacts.filter(c => c.polarity === "harmony").length,
    frictionPercent: total ? 100 * friction / total : null,
    harmonyPercent: total ? 100 * harmony / total : null,
    status: !total ? "no-contacts" : friction > harmony ? "friction" : harmony > friction ? "easy-flow" : "mixed",
  };
}
