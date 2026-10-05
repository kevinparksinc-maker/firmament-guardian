import { calculateChart, type ChartInput } from "./astronomy";
import { withCurrentQuestion } from "./_core/conversation";
import { invokeLLM, type Message } from "./_core/llm";
import { normalizeLongitude, ZODIAC_SIGNS } from "../shared/hybrid";
import type { FrameRelationship } from "./astrologyCore";
import { HORARY_TOPICS } from "../shared/horary";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { calculateLookahead, type Lookahead } from "./horaryLookahead";
import { calculateTraditionalHorary, type TraditionalHoraryEvidence } from "./horaryTraditional";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject: "querent" | "other";
  topicHouse: number;
  natal?: Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time">;
};

type HoraryPlacement = {
  name: string;
  longitude: number;
  display: string;
  sign: string;
  house: number;
  retrograde: boolean;
  speed: number;
  godHouse?: number;
  agentHouse?: number;
  frameRelationship?: FrameRelationship;
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
  houseSystem: "Topocentric Equal House";
  ascendant: { longitude: number; display: string; sign: string };
  querentRuler: string;
  topicRuler: string;
  moon: HoraryPlacement;
  houses: Array<{ house: number; longitude: number; sign: string; ruler: string }>;
  placements: HoraryPlacement[];
  relevantAspects: HoraryAspect[];
  otherCloseAspects: HoraryAspect[];
  lookahead: Lookahead;
  natalChart?: Awaited<ReturnType<typeof calculateChart>>;
  transitChart: Awaited<ReturnType<typeof calculateChart>>;
  godChart: Awaited<ReturnType<typeof calculateChart>>;
  traditional: TraditionalHoraryEvidence;
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
  if (!calculated.ascendant) throw new Error("Horary requires an Agent View Ascendant.");
  const ascendant = calculated.ascendant;
  const natalChart = input.natal
    ? await calculateChart({
        ...input.natal,
        transitLocation: input.location,
        transitLatitude: input.latitude,
        transitLongitude: input.longitude,
        transitTimezone: input.timezone,
        transitDate: input.date,
        transitTime: input.time,
        worldview: "agent",
        readingScope: "combined",
        birthTimeKnown: Boolean(input.natal.time),
      })
    : undefined;
  // Without a natal profile there is nothing for the question-moment sky to contact.
  // Do not compare the question chart against itself: that invents natal contacts.
  const transitChart = natalChart ?? { ...calculated, transits: calculated.transits.map(row => ({ ...row, natalContacts: [] })) };
  const godChart = await calculateChart({
    location: "",
    latitude: 0,
    longitude: 0,
    timezone: input.timezone,
    date: input.date,
    time: input.time,
    transitDate: input.date,
    transitTime: input.time,
    transitTimezone: input.timezone,
    worldview: "god",
    readingScope: "transit",
    birthTimeKnown: true,
  });

  const placements: HoraryPlacement[] = calculated.movingBodies.map(row => ({
    name: row.name,
    longitude: row.longitude,
    display: row.display,
    sign: signOf(row.longitude),
    house: row.house,
    retrograde: Boolean(row.retrograde),
    speed: row.speed ?? 0,
    godHouse: row.godHouse,
    agentHouse: row.agentHouse,
    frameRelationship: row.frameRelationship,
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
  const significatorNames = new Set(aspectNames);
  // Other close contacts may add context, but do not become additional significators.
  const otherCloseAspects = uniquePairs(placements, CLASSICAL_PLANETS)
    .filter(([first, second]) => !(significatorNames.has(first.name) && significatorNames.has(second.name)))
    .map(([first, second]) => aspectBetween(first, second))
    .filter((aspect): aspect is HoraryAspect => Boolean(aspect));
  // Future exact contacts and stations are astronomical data, not event forecasts.
  const lookahead = calculateLookahead(calculated.julianDay, input.timezone);
  const ascendantLongitude = ascendant.longitude;
  const ascendantSign = signOf(ascendantLongitude);
  const askedAt = calculated.utc;
  const placementLines = placements
    .filter(row => CLASSICAL_PLANETS.includes(row.name))
    .map(row => `- ${row.name}: ${row.display}; ${row.sign}, house ${row.house}${row.retrograde ? "; retrograde" : ""}`)
    .join("\n");
  const houseLines = houses
    .map(row => `- House ${row.house}: ${row.sign} on cusp; ruler ${row.ruler}`)
    .join("\n");
  const frameLines = placements
    .filter(row => row.frameRelationship && row.godHouse != null && row.agentHouse != null)
    .map(row => `- ${row.name}: one longitude ${row.display}; God House ${row.godHouse} (${row.frameRelationship!.godThemes.join(", ")}); Agent House ${row.agentHouse} (${row.frameRelationship!.agentThemes.join(", ")}); relationship ${row.frameRelationship!.type}; translation: ${row.frameRelationship!.translation}`)
    .join("\n") || "- No dual God/Agent relationship was calculated.";
  const aspectLines = relevantAspects.length
    ? relevantAspects.map(row => `- ${row.first} ${row.aspect} ${row.second}, orb ${row.orb}° (${row.phase})`).join("\n")
    : "- No major aspect among the listed significators and Moon was within the configured 5° orb.";
  const otherAspectLines = otherCloseAspects.length
    ? otherCloseAspects.map(row => `- ${row.first} ${row.aspect} ${row.second}, orb ${row.orb}° (${row.phase})`).join("\n")
    : "- None within the configured 5° orb.";
  const upcomingLines = lookahead.upcomingAspects.length
    ? lookahead.upcomingAspects.map(row => {
        const role = significatorNames.has(row.first) || significatorNames.has(row.second) ? "involves a significator or the Moon" : "background only";
        return `- ${row.first} ${row.aspect} ${row.second}: exact ${row.exactAtLocal} (${role})`;
      }).join("\n")
    : "- None found in the window.";
  const stationLines = lookahead.stations.length
    ? lookahead.stations.map(row => `- ${row.planet} turns ${row.turns} on ${row.atLocal}`).join("\n")
    : "- No planet changes direction in the window.";
  const traditional = calculateTraditionalHorary({ ascendant: { name: "Ascendant", longitude: ascendant.longitude, house: 1 }, houses, placements, topicRuler, subjectRuler, querentRuler });
  const lotLines = traditional.lots.map(lot => `- ${lot.name}: ${lot.display}; house ${lot.house}; ${lot.formula}; ${lot.meaning}`).join("\n");
  const dignityLines = traditional.dignities.map(row => `- ${row.planet}: ${row.sign}, house ${row.house}; essential ${row.essential.length ? row.essential.join(", ") : "none"} (${row.essentialScore}); accidental ${row.accidental.join(", ")} (${row.accidentalScore}); debilities ${row.debilities.length ? row.debilities.join(", ") : "none"}`).join("\n");
  const receptionLines = traditional.receptions.length ? traditional.receptions.map(row => `- ${row.description}`).join("\n") : "- No configured reception found among the classical planets.";
  const starLines = traditional.fixedStars.length ? traditional.fixedStars.map(row => `- ${row.planet} conjunct ${row.star}, orb ${row.orb}°; nature ${row.nature}; ${row.meaning}`).join("\n") : "- No classical planet or Ascendant is within the configured 1° fixed-star orb.";
  const overlayLines = traditional.overlays.map(row => `- ${row.body}: ${row.display}; Nakshatra ${row.nakshatra} Pada ${row.pada}; Manzil ${row.manzil}; Decan ${row.decan}`).join("\n");
  const timingLines = traditional.timing.length ? traditional.timing.map(row => `- ${row.from} ${row.aspect} ${row.to}: ${row.degreesToPerfection}°; ${row.estimatedUnits}; ${row.method}`).join("\n") : "- No configured key-significator perfection estimate was available.";
  const natalEvidence = natalChart
    ? `NATAL / AGENT EVIDENCE SET (person's birth chart; local houses belong to the person):\n${natalChart.movingBodies.map(row => `- ${row.name}: ${row.display}; house ${row.house}`).join("\n")}\n- Ascendant: ${natalChart.ascendant?.display ?? "unavailable"}\n- Birth UTC: ${natalChart.utc}`
    : "NATAL / AGENT EVIDENCE SET: unavailable; no complete person birth profile was supplied. Do not infer or invent a natal chart.";
  const transitEvidence = natalChart
    ? `TRANSIT / QUESTION-MOMENT EVIDENCE SET (sky at the supplied question moment, compared with the natal foundation):\n${transitChart.transits.map(row => `- ${row.name}: ${row.display}; contacts ${row.natalContacts.length ? row.natalContacts.map(contact => `${contact.aspect} natal ${contact.natalName} (${contact.orb}°)`).join(", ") : "none within configured orb"}`).join("\n")}\n- Transit UTC: ${transitChart.transitDate}`
    : `TRANSIT / QUESTION-MOMENT EVIDENCE SET (sky at the supplied question moment; positions only, because no natal profile was supplied, so there are no natal contacts to report):\n${transitChart.transits.map(row => `- ${row.name}: ${row.display}`).join("\n")}\n- Transit UTC: ${transitChart.transitDate}`;
  const godEvidence = `GOD VIEW / GEOCENTRIC EVIDENCE SET (same question moment; no observer, horizon, Ascendant, or local houses):\n${godChart.movingBodies.map(row => `- ${row.name}: ${row.display}; God House ${row.godHouse}`).join("\n")}\n- Transit UTC: ${godChart.transitDate}`;
  const evidenceText = [
    `Question: ${input.question}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Location: ${input.location} (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`,
    `House system: Topocentric Equal House, using topocentric planetary positions and 30-degree cusps from the calculated Ascendant.`,
    `Question topic: ${topic.label} (${ordinal(input.topicHouse)} house from the ${input.subject === "querent" ? "querent" : "other person"}).`,
    `Ascendant: ${ascendant.display} (${ascendantSign}); querent's primary ruler: ${querentRuler}.`,
    `Person asked about: ${input.subject === "querent" ? "the querent (House 1)" : "another person (House 7)"}; that person's ruler: ${subjectRuler}.`,
    `Topic house: house ${input.topicHouse} counted from the person asked about is actual chart house ${actualTopicHouse}; cusp sign ${houses[actualTopicHouse - 1].sign}; topic ruler ${topicRuler}.`,
    `Significator roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual chart House ${actualTopicHouse} ruler ${topicRuler}. Do not interchange these roles.`,
    `Moon: ${moon.display}, ${moon.sign}, house ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Traditional planetary placements:\n${placementLines}`,
    `House cusps and traditional rulers:\n${houseLines}`,
    `GOD VIEW / AGENT VIEW RELATIONSHIP EVIDENCE (contextual layer; do not replace horary testimony):\n${frameLines}`,
    `Major aspects among the querent, person, matter significators, and Moon (maximum 5° orb):\n${aspectLines}`,
    `Other close major aspects among the seven classical planets (max 5° orb; at least one planet is not a significator or the Moon):\n${otherAspectLines}`,
    `Upcoming exact aspects (calculated from the ephemeris; local timezone ${input.timezone}; Moon contacts cover ${lookahead.moonWindowDays} days and other contacts cover ${lookahead.windowDays} days). A listed date/time is when the planetary contact becomes exact, not a prediction of when an event will happen:\n${upcomingLines}`,
    `Planetary stations in the next ${lookahead.windowDays} days (date indicates when the planet changes apparent direction, not an event prediction):\n${stationLines}`,
    `TRADITIONAL LOTS / ARABIC PARTS (calculated formulas; interpret in context):\n${lotLines}`,
    `ESSENTIAL AND ACCIDENTAL DIGNITY / DEBILITY (traditional scoring aid, not a standalone judgment):\n${dignityLines}`,
    `RECEPTION / MUTUAL RECEPTION:\n${receptionLines}`,
    `FIXED-STAR TESTIMONY (conjunctions within 1° only):\n${starLines}`,
    `RADICALITY / CONSIDERATIONS BEFORE JUDGMENT: status ${traditional.radicality.status}; ${traditional.radicality.explanation}\n${traditional.radicality.considerations.length ? traditional.radicality.considerations.map(row => `- ${row}`).join("\n") : "- No configured caution was triggered."}`,
    `TRADITIONAL EVENT-TIMING AID (degrees to perfection and modality estimate; not a guaranteed event date):\n${timingLines}`,
    `LUNAR MANSION / MANZIL / DECAN CONTEXT FOR CLASSICAL PLANETS AND ASCENDANT:\n${overlayLines}`,
    natalEvidence,
    transitEvidence,
    godEvidence,
    "Three-layer reading rule: keep the NATAL / AGENT, TRANSIT / QUESTION-MOMENT, and GOD VIEW / GEOCENTRIC evidence sets explicitly separate. Use natal houses only for the person layer; use transit contacts to describe activation; use God View for the whole-sky context. Never turn God View into local houses or a personal Ascendant.",
    "Method boundary: the traditional layer now calculates configured Lots, dignity/debility indicators, reception, close fixed-star testimony, radicality cautions, a non-deterministic perfection timing aid, and lunar mansion/Manzil/Decan overlays. It still does not calculate every traditional doctrine, including prohibition, collection/translation of light, all sect/ruler conditions, or a complete traditional timing judgment; do not invent those factors.",
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
    houseSystem: "Topocentric Equal House",
    ascendant: { longitude: ascendantLongitude, display: ascendant.display, sign: ascendantSign },
    querentRuler,
    topicRuler,
    moon,
    houses,
    placements,
    relevantAspects,
    otherCloseAspects,
    lookahead,
    natalChart,
    transitChart,
    godChart,
    traditional,
    evidenceText,
  };
}

const HORARY_SYSTEM = `You are Firmament's horary astrology interpreter. Use the same evidence-first AI framework as the app's other readings, adapted to horary astrology. The user asks about a concrete question; the chart is cast for the supplied time and place at which the question was asked. Do not treat this as a natal personality profile or a Tarot spread.

INTERPRETATION STANDARD
- Keep significator roles exact. The querent is always the person asking (House 1 and its ruler). The person asked about is either the querent (House 1) or another person (House 7), as explicitly supplied. The selected topic house is counted from that person; the evidence provides the actual chart house after turning. The topic ruler signifies the matter, not automatically the person or their intentions. Never switch or collapse these roles.
- A planet's house placement is where that planet is located; it is not the house that planet rules. The Moon may simultaneously rule the selected topic and serve as a general co-significator; if so, label both roles, and do not mistake the Moon's own placement house for the topic house.
- If the question wording and the explicitly selected person/topic do not align, say the assignment is ambiguous and ask the user to clarify in follow-up rather than assigning an actor to the wrong house. For a career question about another person, use only the turned topic house and the person-house assignment explicitly supplied in the evidence.
- Use only the aspect lists explicitly supplied in the calculated evidence (significator/Moon aspects, other close aspects, and upcoming exact aspects). Do not calculate or claim any aspect or date from raw positions yourself, and do not call non-significator planets additional significators. Aspects involving neither a significator nor the Moon are background context, not testimony, and must not carry the judgment on their own.
- Do not infer that an offer, promise, decision, or another person's intention exists unless it is stated in the question or supported by the calculated testimony. Distinguish what the question already says from what the chart indicates.
- Begin with the question in plain language. Offer a provisional leaning (yes, no, mixed, or insufficient testimony) only when the supplied chart evidence supports one; explain what is supporting and what complicates it. Do not force certainty.
- Explain the chart evidence before its meaning: House 1 and its ruler identify the querent; the supplied person choice identifies the subject (House 1 for the querent, House 7 for another person); the topic ruler is for the selected house counted from that subject, with its actual chart house supplied; the Moon is a co-significator and sequence-of-events indicator; then discuss only the supplied aspects among these roles.
- For each important factor, develop WHAT → WHY → HOW → CONSEQUENCE → MEANING in connected prose. Explain technical terms so a reader without astrology training can follow the judgment.
- Make the story cumulative: show how the question and querent are established, what condition or obstacle the chart indicates, what the Moon and relevant contacts add, how contradictions modify the picture, and what the full testimony suggests about the question.
- Connect factors by explaining what their relationship produces; do not list disconnected definitions or repeat the same conclusion in several forms. Every major conclusion must point to evidence in the supplied chart.
- Be clear where testimony is weak or mixed. If a traditional consideration is not in the supplied evidence, say that it was not calculated; never invent dignity, reception, prohibition, biography, aspects, or timing. A date may be given only if present in the supplied upcoming-aspect or station lists, and must be described as the exact planetary contact or directional station—not as when a real-world event will happen.
- Give a proportionate, practical next step. Avoid deterministic forecasts, guarantees, fear, medical diagnosis, or advice that replaces qualified professional guidance. Astrology is a symbolic interpretive practice, not scientifically established evidence.
- Do not mention Tarot, cards, suits, or spreads. Do not claim certainty or supernatural authority. The reader retains agency.
- The evidence may contain three explicitly labeled sets: NATAL / AGENT, TRANSIT / QUESTION-MOMENT, and GOD VIEW / GEOCENTRIC. Treat them as different coordinate frames, not interchangeable duplicates.
- NATAL / AGENT describes the person's enduring birth chart, including their local houses and angles. If it says unavailable, state that the person's natal layer was not supplied and do not infer it from the question chart.
- TRANSIT / QUESTION-MOMENT describes the sky when the question was asked and its contacts against the person's natal foundation when available. Use this layer for activation and timing context, not as a replacement for the natal chart.
- GOD VIEW / GEOCENTRIC describes the same question moment without an observer, horizon, Ascendant, or local houses. Use it for whole-sky context and geocentric planetary relationships only; never assign it personal houses or call it the person's natal chart.
- When synthesizing, name the layer before making a claim: “In the natal layer…”, “At the question moment…”, or “In God View…”. If the layers disagree in meaning, explain the distinction rather than averaging them together.

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
