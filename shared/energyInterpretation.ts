import type { ChartRow } from "../server/astronomy";
const themes: Record<string, string> = {
  Ascendant: "self-presentation, bodily orientation and immediate responses",
  Descendant: "partnership, negotiation and the other person’s position",
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
  semisextile:
    "Coordinate adjacent needs through one small, deliberate adjustment.",
  semisquare:
    "Identify the specific irritation and correct the repeated point of friction.",
  quincunx:
    "Rework expectations where the two needs do not naturally fit together.",
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
  const geometry = `${placement(first)} forms a ${aspect.toLowerCase()} with ${placement(second)} (${orb.toFixed(2)}° orb).`;
  if (
    !themes[first.name] ||
    !themes[second.name] ||
    !actions[aspect.toLowerCase()]
  )
    return `${geometry} A sourced interpretation for this combination is not available in this rule set.`;
  return `${first.name} concerns ${themes[first.name]}; ${second.name} concerns ${themes[second.name]}. ${geometry} ${actions[aspect.toLowerCase()]}`;
}

/**
 * Evidence-grounded, deterministic customer copy when an AI provider is unavailable.
 * Unlike generated synthesis, this only interprets the known body pair and aspect;
 * it never pretends to have woven the full chart or inferred a life event.
 */
export function describeAspectFallback(
  firstName: string,
  secondName: string,
  aspect: string
): string {
  const firstTheme = themes[firstName];
  const secondTheme = themes[secondName];
  const key = aspect.toLowerCase();
  const action = actions[key];
  if (!firstTheme || !secondTheme || !action) {
    return `Your current ${firstName}–${secondName} contact is calculated, but a specific interpretation is not available in the local Canon. Check the calculated findings below for its actual placements and orb.`;
  }
  const relationship: Record<string, string> = {
    conjunction: "bring these two concerns together in one concentrated opening",
    trine: "let these two concerns work together more easily",
    sextile: "offer an opening that becomes useful when you act",
    square: "bring competing needs into sharper focus",
    opposition: "ask you to balance two different priorities",
    semisextile: "call for a subtle adjustment between these concerns",
    semisquare: "bring a small but noticeable point of friction",
    quincunx: "ask you to change how these concerns fit together",
  };
  return `You may notice how ${firstTheme} connects with ${secondTheme}. This ${key} can ${relationship[key] ?? "connect these parts of your experience"}; it describes a symbolic tendency, not a guaranteed event. ${action} The detailed calculated positions and conditions remain available below.`;
}
