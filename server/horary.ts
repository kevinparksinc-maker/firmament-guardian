import { calculateChart, type ChartInput } from "./astronomy";
import { withCurrentQuestion } from "./_core/conversation";
import { invokeLLM, type Message } from "./_core/llm";
import { normalizeLongitude, ZODIAC_SIGNS } from "../shared/hybrid";
import { HORARY_TOPICS } from "../shared/horary";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject: "querent" | "other";
  topicHouse: number;
};

type HoraryPlacement = {
  name: string;
  longitude: number;
  display: string;
  sign: string;
  house: number;
  retrograde: boolean;
  speed: number;
};

type HoraryAspect = {
  first: string;
  second: string;
  aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
  phase: "applying" | "separating" | "unclear";
};

export type HoraryChart = {
  question: string;
  subject: "querent" | "other";
  subjectHouse: number;
  subjectRuler: string;
  topicHouse: number;
  actualTopicHouse: number;
  topicLabel: string;
  askedAt: string;
  location: string;
  timezone: string;
  houseSystem: "Polich–Page (T)";
  ascendant: { longitude: number; display: string; sign: string };
  querentRuler: string;
  topicRuler: string;
  moon: HoraryPlacement;
  houses: Array<{ house: number; longitude: number; sign: string; ruler: string }>;
  placements: HoraryPlacement[];
  relevantAspects: HoraryAspect[];
  evidenceText: string;
};

const TRADITIONAL_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const CLASSICAL_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const ASPECT_TARGETS: Array<[number, HoraryAspect["aspect"]]> = [
  [0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"],
];
const ASPECT_ORB_DEGREES = 5;

function signOf(longitude: number) {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

function ordinal(value: number) {
  const remainder = value % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${suffix}`;
}

function separation(a: number, b: number) {
  return Math.abs(((normalizeLongitude(a - b) + 180) % 360) - 180);
}

function aspectBetween(a: HoraryPlacement, b: HoraryPlacement): HoraryAspect | null {
  const distance = separation(a.longitude, b.longitude);
  const closest = ASPECT_TARGETS.map(([target, aspect]) => ({ aspect, orb: Math.abs(distance - target) }))
    .sort((left, right) => left.orb - right.orb)[0];
  if (!closest || closest.orb > ASPECT_ORB_DEGREES) return null;

  // Planetary speeds are in degrees/day. A short linear projection is used only
  // to label the current contact's phase, not to predict future events.
  const nextDayOrb = Math.abs(separation(a.longitude + a.speed, b.longitude + b.speed) - ASPECT_TARGETS.find(([, aspect]) => aspect === closest.aspect)![0]);
  const phase = Math.abs(nextDayOrb - closest.orb) < 0.001
    ? "unclear"
    : nextDayOrb < closest.orb ? "applying" : "separating";
  return { first: a.name, second: b.name, aspect: closest.aspect, orb: Number(closest.orb.toFixed(2)), phase };
}

function uniquePairs(placements: HoraryPlacement[], names: string[]) {
  const selected = names.map(name => placements.find(placement => placement.name === name)).filter((row): row is HoraryPlacement => Boolean(row));
  const pairs: Array<[HoraryPlacement, HoraryPlacement]> = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) pairs.push([selected[i], selected[j]]);
  }
  return pairs;
}

export async function calculateHoraryChart(input: HoraryInput): Promise<HoraryChart> {
  const calculated = await calculateChart({
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    date: input.date,
    time: input.time,
    // A horary chart is one chart cast for the question moment, not a natal chart
    // paired with today's sky. Supplying the same moment keeps the existing
    // calculation interface deterministic while only the first chart is read.
    transitLocation: input.location,
    transitLatitude: input.latitude,
    transitLongitude: input.longitude,
    transitTimezone: input.timezone,
    transitDate: input.date,
    transitTime: input.time,
  });

  const placements: HoraryPlacement[] = calculated.movingBodies.map(row => ({
    name: row.name,
    longitude: row.longitude,
    display: row.display,
    sign: signOf(row.longitude),
    house: row.house,
    retrograde: Boolean(row.retrograde),
    speed: row.speed ?? 0,
  }));
  const houses = calculated.houses.map((longitude, index) => {
    const sign = signOf(longitude);
    return { house: index + 1, longitude, sign, ruler: TRADITIONAL_RULERS[sign] };
  });
  const topic = HORARY_TOPICS.find(item => item.house === input.topicHouse);
  if (!topic) throw new Error("Choose a valid topic house before casting the horary chart.");

  const querentRuler = houses[0].ruler;
  const subjectHouse = input.subject === "querent" ? 1 : 7;
  const subjectRuler = houses[subjectHouse - 1].ruler;
  const actualTopicHouse = ((subjectHouse - 1 + input.topicHouse - 1) % 12) + 1;
  const topicRuler = houses[actualTopicHouse - 1].ruler;
  const moon = placements.find(row => row.name === "Moon");
  if (!moon) throw new Error("The Moon position is not available in the calculated question chart.");
  const aspectNames = Array.from(new Set([querentRuler, subjectRuler, topicRuler, "Moon"]));
  const relevantAspects = uniquePairs(placements, aspectNames)
    .map(([first, second]) => aspectBetween(first, second))
    .filter((aspect): aspect is HoraryAspect => Boolean(aspect));
  const ascendantLongitude = calculated.ascendant.longitude;
  const ascendantSign = signOf(ascendantLongitude);
  const askedAt = calculated.utc;
  const placementLines = placements
    .filter(row => CLASSICAL_PLANETS.includes(row.name))
    .map(row => `- ${row.name}: ${row.display}; ${row.sign}, house ${row.house}${row.retrograde ? "; retrograde" : ""}`)
    .join("\n");
  const houseLines = houses
    .map(row => `- House ${row.house}: ${row.sign} on cusp; ruler ${row.ruler}`)
    .join("\n");
  const aspectLines = relevantAspects.length
    ? relevantAspects.map(row => `- ${row.first} ${row.aspect} ${row.second}, orb ${row.orb}° (${row.phase})`).join("\n")
    : "- No major aspect among the listed significators and Moon was within the configured 5° orb.";
  const evidenceText = [
    `Question: ${input.question}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Location: ${input.location} (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`,
    `House system: Polich–Page (T), matching the existing app calculation engine.`,
    `Question topic: ${topic.label} (${ordinal(input.topicHouse)} house from the ${input.subject === "querent" ? "querent" : "other person"}).`,
    `Ascendant: ${calculated.ascendant.display} (${ascendantSign}); querent's primary ruler: ${querentRuler}.`,
    `Person asked about: ${input.subject === "querent" ? "the querent (House 1)" : "another person (House 7)"}; that person's ruler: ${subjectRuler}.`,
    `Topic house: house ${input.topicHouse} counted from the person asked about is actual chart house ${actualTopicHouse}; cusp sign ${houses[actualTopicHouse - 1].sign}; topic ruler ${topicRuler}.`,
    `Significator roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual chart House ${actualTopicHouse} ruler ${topicRuler}. Do not interchange these roles.`,
    `Moon: ${moon.display}, ${moon.sign}, house ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Traditional planetary placements:\n${placementLines}`,
    `House cusps and traditional rulers:\n${houseLines}`,
    `Major aspects among the querent, person, matter significators, and Moon (maximum 5° orb):\n${aspectLines}`,
    "Method boundary: this first version calculates house rulers, planetary positions, retrograde status, Moon placement, and close major aspects. It does not calculate essential dignity, reception, prohibition, collection/translation of light, fixed-star testimony, or a traditional timing estimate; do not invent those factors.",
  ].join("\n\n");

  return {
    question: input.question,
    subject: input.subject,
    subjectHouse,
    subjectRuler,
    topicHouse: input.topicHouse,
    actualTopicHouse,
    topicLabel: topic.label,
    askedAt,
    location: input.location,
    timezone: input.timezone,
    houseSystem: "Polich–Page (T)",
    ascendant: { longitude: ascendantLongitude, display: calculated.ascendant.display, sign: ascendantSign },
    querentRuler,
    topicRuler,
    moon,
    houses,
    placements,
    relevantAspects,
    evidenceText,
  };
}

const HORARY_SYSTEM = `You are Firmament's horary astrology interpreter. Use the same evidence-first AI framework as the app's other readings, adapted to horary astrology. The user asks about a concrete question; the chart is cast for the supplied time and place at which the question was asked. Do not treat this as a natal personality profile or a Tarot spread.

INTERPRETATION STANDARD
- Keep significator roles exact. The querent is always the person asking (House 1 and its ruler). The person asked about is either the querent (House 1) or another person (House 7), as explicitly supplied. The selected topic house is counted from that person; the evidence provides the actual chart house after turning. The topic ruler signifies the matter, not automatically the person or their intentions. Never switch or collapse these roles.
- A planet's house placement is where that planet is located; it is not the house that planet rules. The Moon may simultaneously rule the selected topic and serve as a general co-significator; if so, label both roles, and do not mistake the Moon's own placement house for the topic house.
- If the question wording and the explicitly selected person/topic do not align, say the assignment is ambiguous and ask the user to clarify in follow-up rather than assigning an actor to the wrong house. For a career question about another person, use only the turned topic house and the person-house assignment explicitly supplied in the evidence.
- Use only the aspect list explicitly supplied in the calculated evidence. Do not calculate or claim any aspect from the raw positions yourself, and do not call non-significator planets additional significators.
- Do not infer that an offer, promise, decision, or another person's intention exists unless it is stated in the question or supported by the calculated testimony. Distinguish what the question already says from what the chart indicates.
- Begin with the question in plain language. Offer a provisional leaning (yes, no, mixed, or insufficient testimony) only when the supplied chart evidence supports one; explain what is supporting and what complicates it. Do not force certainty.
- Explain the chart evidence before its meaning: House 1 and its ruler identify the querent; the supplied person choice identifies the subject (House 1 for the querent, House 7 for another person); the topic ruler is for the selected house counted from that subject, with its actual chart house supplied; the Moon is a co-significator and sequence-of-events indicator; then discuss only the supplied aspects among these roles.
- For each important factor, develop WHAT → WHY → HOW → CONSEQUENCE → MEANING in connected prose. Explain technical terms so a reader without astrology training can follow the judgment.
- Make the story cumulative: show how the question and querent are established, what condition or obstacle the chart indicates, what the Moon and relevant contacts add, how contradictions modify the picture, and what the full testimony suggests about the question.
- Connect factors by explaining what their relationship produces; do not list disconnected definitions or repeat the same conclusion in several forms. Every major conclusion must point to evidence in the supplied chart.
- Be clear where testimony is weak or mixed. If a traditional consideration is not in the supplied evidence, say that it was not calculated; never invent dignity, reception, prohibition, timing, biography, or aspects.
- Give a proportionate, practical next step. Avoid deterministic forecasts, guarantees, fear, medical diagnosis, or advice that replaces qualified professional guidance. Astrology is a symbolic interpretive practice, not scientifically established evidence.
- Do not mention Tarot, cards, suits, or spreads. Do not claim certainty or supernatural authority. The reader retains agency.

Write a complete but focused first judgment in clear Markdown. Let the evidence and complexity determine the length; do not pad, repeat, or force a word count. End by stating what evidence could change or weaken the provisional conclusion.`;

function responseText(content: string | Array<{ type: string; text?: string }> | undefined) {
  return typeof content === "string"
    ? content
    : (content ?? []).filter(part => part.type === "text").map(part => part.text ?? "").join("\n");
}

async function answer(messages: Message[], maxTokens = 5000) {
  const response = await invokeLLM({ model: "claude-sonnet-4-6", messages, maxTokens });
  const text = responseText(response.choices?.[0]?.message?.content);
  if (!text.trim()) throw new Error("The horary interpreter returned no readable answer. Please try again.");
  return text;
}

export async function openHoraryQuestion(input: HoraryInput) {
  const chart = await calculateHoraryChart(input);
  const reading = await answer([
    { role: "system", content: buildAstrologyInterpreterSystem(HORARY_SYSTEM) },
    { role: "user", content: `Use only these calculated facts as the source of truth. Do not recalculate or add missing traditional considerations.\n\n${chart.evidenceText}\n\nGive the complete horary judgment now.` },
  ]);
  return { chart, reading };
}

export async function horaryFollowUp(
  chart: HoraryChart,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
) {
  return answer([
    { role: "system", content: buildAstrologyInterpreterSystem(`${HORARY_SYSTEM}\n\nThis is a follow-up in an existing horary conversation. Keep the original chart and question fixed. Answer the specific follow-up, connect it to the supplied evidence and prior discussion, and do not recast the chart or silently change the original topic.`) },
    { role: "user", content: `Original horary evidence:\n\n${chart.evidenceText}` },
    ...withCurrentQuestion(history, question, 12),
  ], 3200);
}
