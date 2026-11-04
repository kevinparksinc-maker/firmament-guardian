import type { ChartRow } from "../server/astronomy";
const themes: Record<string, string> = {
  Sun: "identity, purpose and visibility",
  Moon: "emotional needs and daily rhythm",
  Mercury: "thinking, decisions and communication",
  Venus: "relationships, values and enjoyment",
  Mars: "initiative, assertion and boundaries",
  Jupiter: "growth, opportunity and judgment",
  Saturn: "responsibility, discipline and limits",
  Uranus: "change and independence",
  Neptune: "imagination, ideals and uncertainty",
  Pluto: "power, control and transformation",
  "North Node": "development and unfamiliar direction",
  "South Node": "familiar patterns and release",
};
const actions: Record<string, string> = {
  conjunction:
    "Bring both needs into one deliberate action; the contact concentrates them together.",
  sextile: "Act on a practical opening that lets the two needs cooperate.",
  square:
    "Identify the competing demands and make an adjustment before pushing harder.",
  trine:
    "Use the available ease to make progress where these life areas support each other.",
  opposition:
    "Address both sides through boundaries, negotiation and perspective.",
};
/** Interpret the actual pair and placements instead of repeating aspect-only slogans. */
export function describeAspectPair(
  first: ChartRow,
  second: ChartRow,
  aspect: string,
  orb: number
) {
  const placement = (body: ChartRow) =>
    `${body.name} at ${body.display}${body.agentHouse || body.house ? ` in House ${body.agentHouse || body.house}` : ""}`;
  return `${first.name} concerns ${themes[first.name] || "its recorded chart themes"}; ${second.name} concerns ${themes[second.name] || "its recorded chart themes"}. ${placement(first)} forms a ${aspect.toLowerCase()} with ${placement(second)} (${orb.toFixed(2)}° orb). ${actions[aspect.toLowerCase()] || "Read the contact through the two recorded placements."}`;
}
