import type { KnowledgePlan } from "./types";

export function planKnowledge(
  question: string,
  mode: "natal" | "transit" | "combined" = "combined"
): KnowledgePlan {
  const q = question.toLowerCase();
  const relationship =
    /relationship|marriage|partner|dating|love|ex\b|belong|friend/.test(q);
  const career =
    /career|work|job|profession|purpose|business|success|money|income|wealth/.test(
      q
    );
  const home = /move|moving|home|house|relocat|family|property/.test(q);
  const emotional =
    /feel|emotion|anxious|mood|why now|healing|inner|pattern|repeat/.test(q);
  const timing =
    mode !== "natal" ||
    /when|timing|soon|next|today|current|right time|60 days|future/.test(q);
  const domains = ["western", "vedic", "arabic"];
  const subjects = new Set<string>(["Sun", "Moon", "Ascendant"]);
  const techniques = new Set<string>([
    "aspects",
    "dignity",
    "nakshatra",
    "manzil",
  ]);
  const reasons: string[] = [];
  if (relationship) {
    [
      "7th-house",
      "7th-lord",
      "Venus",
      "Moon",
      "relationship-significators",
      "D9",
    ].forEach(value => subjects.add(value));
    ["house-lord", "varga"].forEach(value => techniques.add(value));
    reasons.push(
      "Relationship language activates the partnership axis, Venus, Moon, and relevant Vedic relationship evidence."
    );
  }
  if (career) {
    [
      "2nd-house",
      "6th-house",
      "10th-house",
      "10th-lord",
      "11th-house",
      "Saturn",
      "Jupiter",
      "D10",
    ].forEach(value => subjects.add(value));
    techniques.add("varga");
    reasons.push(
      "Career or money language activates livelihood houses, rulers, significators, and D10 when available."
    );
  }
  if (home) {
    ["4th-house", "4th-lord", "9th-house", "12th-house", "Moon"].forEach(
      value => subjects.add(value)
    );
    techniques.add("house-lord");
    reasons.push(
      "Home or movement language activates foundations, relocation axes, Moon, and house rulers."
    );
  }
  if (emotional) {
    ["Moon", "natal-Moon", "current-transits", "Ascendant"].forEach(value =>
      subjects.add(value)
    );
    reasons.push(
      "Emotional language prioritizes the Moon, angles, and current activation rather than the whole chart equally."
    );
  }
  if (timing) {
    techniques.add("transits");
    techniques.add("dasha");
    techniques.add("planetary-hours");
    reasons.push(
      "Timing language or a transit reading requests current activation; unavailable timing families remain explicitly marked incomplete."
    );
  }
  if (!reasons.length)
    reasons.push(
      "No narrow domain was detected; the gateway uses a balanced identity, Moon, angle, aspect, lunar, and cross-system scan."
    );
  return {
    question,
    domains,
    subjects: Array.from(subjects),
    techniques: Array.from(techniques),
    includeTiming: timing,
    includeDivisionalCharts: [
      relationship ? "D9" : "",
      career ? "D10" : "",
    ].filter(Boolean),
    reasons,
  };
}
