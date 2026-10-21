import { calculateChart, type ChartInput } from "./astronomy";
import { withCurrentQuestion } from "./_core/conversation";
import { invokeLLM, type Message } from "./_core/llm";
import { normalizeLongitude, ZODIAC_SIGNS } from "../shared/hybrid";
import type { FrameRelationship } from "./astrologyCore";
import { HORARY_TOPICS } from "../shared/horary";
import { calculateLookahead, type Lookahead } from "./horaryLookahead";
import { calculateTraditionalHorary, type TraditionalHoraryEvidence } from "./horaryTraditional";
import { HORARY_SYSTEM as HORARY_SPECIALIZED_SYSTEM } from "./horary-instructions";
import { FIRMAMENT_CARE_DELIVERY_STANDARD, FIRMAMENT_MASTER_INTERPRETATION_PROMPT } from "./firmament-master";
import { FIRMAMENT_VISIBLE_INTERPRETATION_FORMAT } from "./firmament-output";
import { retrieveChartCanonDossier } from "./astrologyKnowledge/canon/retriever";
import { seferYetzirahEvidence, KABBALAH_SYNTHESIS_STANDARD } from "./astrologyKnowledge/canon/seferYetzirah";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject: "querent" | "other";
  topicHouse: number;
  /** House of the person asked about, counted from the querent. */
  subjectHouse?: number;
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
  houseSystem: "Equal House";
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
  canonEvidenceText: string;
  evidenceText: string;
  judgmentEvidenceText: string;
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

function inferSubjectHouse(input: HoraryInput) {
  if (input.subject === "querent") return 1;
  if (input.subjectHouse && Number.isInteger(input.subjectHouse) && input.subjectHouse >= 1 && input.subjectHouse <= 12) return input.subjectHouse;
  const q = input.question.toLowerCase();
  if (/\b(my|our)\s+(child|son|daughter|kid)\b|\b(child|son|daughter)\s+of\s+mine\b/.test(q)) return 5;
  if (/\b(my|our)\s+(brother|sister|sibling)\b/.test(q)) return 3;
  if (/\b(my|our)\s+(mother|mum|mom|father|dad|parent)\b/.test(q)) return /\b(father|dad)\b/.test(q) ? 10 : 4;
  if (/\b(my|our)\s+(boss|manager|employer)\b/.test(q)) return 10;
  if (/\b(my|our)\s+(friend|group|team)\b/.test(q)) return 11;
  if (/\b(my|our)\s+(partner|spouse|husband|wife|boyfriend|girlfriend)\b/.test(q)) return 7;
  return 7;
}
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
  const subjectHouse = inferSubjectHouse(input);
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
  const canonDossier = retrieveChartCanonDossier(calculated);
  const kabbalahEvidenceText = seferYetzirahEvidence(calculated)
    .map(item => `- [${item.technique}] ${item.statement}`)
    .join("\n");
  const natalKabbalahText = natalChart ? seferYetzirahEvidence(natalChart)
    .filter(item => item.technique === "sefer-yetzirah-doubles" || item.technique === "sefer-yetzirah-simples")
    .map(item => `- ${item.statement}`).join("\n") : "No querent natal profile was supplied.";
  const canonEvidenceText = canonDossier.placements
    .filter(row => significatorNames.has(row.body))
    .map(row => [
      `- ${row.body}: ${row.planetInSignSynthesis}`,
      `  - Condition: ${row.dignityAndCondition.conditionSummary}`,
      `  - House doctrine: ${row.planetInHouseSynthesis}`,
      row.godToAgentNote ? `  - God → Agent: ${row.godToAgentNote}` : null,
    ].filter((line): line is string => Boolean(line)).join("\n"))
    .join("\n") || "- No local canon placement dossier was available for the selected significators.";
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
    .map(row => {
      const relationship = row.frameRelationship!;
      return [
        `- ${row.name}: one calculated longitude ${row.display}`,
        `  - God View: House ${row.godHouse}; themes: ${relationship.godThemes.join(" · ")}`,
        `  - Agent View: House ${row.agentHouse}; themes: ${relationship.agentThemes.join(" · ")}`,
        `  - Relationship shown in the box: ${relationship.type}`,
        `  - Translation shown in the box: ${relationship.translation}`,
        relationship.tension ? `  - Tension / visibility note shown in the box: ${relationship.tension}` : null,
        `  - Synthesis shown in the box: ${relationship.synthesis}`,
      ].filter((line): line is string => Boolean(line)).join("\n");
    })
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
  const traditional = calculateTraditionalHorary({ ascendant: { name: "Ascendant", longitude: ascendant.longitude, house: 1 }, houses, placements, topicRuler, subjectRuler, querentRuler, questionRuler: input.subject === "querent" ? querentRuler : subjectRuler, lookahead, referenceUtc: askedAt });
  const lotLines = traditional.lots.map(lot => `- ${lot.name}: ${lot.display}; house ${lot.house}; ${lot.formula}; ${lot.meaning}`).join("\n");
  const dignityLines = traditional.dignities.map(row => `- ${row.planet}: ${row.sign}, house ${row.house}; essential ${row.essential.length ? row.essential.join(", ") : "none"} (${row.essentialScore}); accidental ${row.accidental.join(", ")} (${row.accidentalScore}); debilities ${row.debilities.length ? row.debilities.join(", ") : "none"}`).join("\n");
  const receptionLines = traditional.receptions.length ? traditional.receptions.map(row => `- ${row.description}`).join("\n") : "- No configured reception found among the classical planets.";
  const starLines = traditional.fixedStars.length ? traditional.fixedStars.map(row => `- ${row.planet} conjunct ${row.star}, orb ${row.orb}°; nature ${row.nature}; ${row.meaning}`).join("\n") : "- No classical planet or Ascendant is within the configured 1° fixed-star orb.";
  const overlayLines = traditional.overlays.map(row => `- ${row.body}: ${row.display}; Nakshatra ${row.nakshatra} Pada ${row.pada}; Manzil ${row.manzil}; Decan ${row.decan}`).join("\n");
  const timingLines = traditional.timing.length ? traditional.timing.map(row => `- ${row.from} ${row.aspect} ${row.to}: ${row.degreesToPerfection}°; ${row.estimatedUnits}; ${row.method}`).join("\n") : "- No configured key-significator perfection estimate was available.";
  const corePlacementLines = placements
    .filter(row => significatorNames.has(row.name))
    .map(row => `- ${row.name}: ${row.display}; ${row.sign}, House ${row.house}${row.retrograde ? "; retrograde" : ""}`)
    .join("\n");
  const natalEvidence = natalChart
    ? `NATAL / AGENT EVIDENCE SET (person's birth chart; local houses belong to the person):\n${natalChart.movingBodies.map(row => `- ${row.name}: ${row.display}; house ${row.house}`).join("\n")}\n- Ascendant: ${natalChart.ascendant?.display ?? "unavailable"}\n- Birth UTC: ${natalChart.utc}`
    : "NATAL / AGENT EVIDENCE SET: unavailable; no complete person birth profile was supplied. Do not infer or invent a natal chart.";
  const transitEvidence = natalChart
    ? `TRANSIT / QUESTION-MOMENT EVIDENCE SET (sky at the supplied question moment, compared with the natal foundation):\n${transitChart.transits.map(row => `- ${row.name}: ${row.display}; contacts ${row.natalContacts.length ? row.natalContacts.map(contact => `${contact.aspect} natal ${contact.natalName} (${contact.orb}°)`).join(", ") : "none within configured orb"}`).join("\n")}\n- Transit UTC: ${transitChart.transitDate}`
    : `TRANSIT / QUESTION-MOMENT EVIDENCE SET (sky at the supplied question moment; positions only, because no natal profile was supplied, so there are no natal contacts to report):\n${transitChart.transits.map(row => `- ${row.name}: ${row.display}`).join("\n")}\n- Transit UTC: ${transitChart.transitDate}`;
  const godEvidence = `GOD VIEW / GEOCENTRIC EVIDENCE SET (same question moment; no observer, horizon, Ascendant, or local houses):\n${godChart.movingBodies.map(row => `- ${row.name}: ${row.display}; God House ${row.godHouse}`).join("\n")}\n- Transit UTC: ${godChart.transitDate}`;
  const natalQuestionEvidence = natalChart
    ? `QUERENT NATAL LAYER FOR THIS HORARY (use only as the person's background and natal foundation):\n${natalChart.movingBodies.map(row => `- ${row.name}: ${row.display}; natal Agent House ${row.agentHouse ?? row.house}`).join("\n")}\n- Natal Ascendant: ${natalChart.ascendant?.display ?? "unavailable"}`
    : "QUERENT NATAL LAYER: unavailable; no complete natal profile was supplied.";
  const transitQuestionEvidence = natalChart
    ? `QUESTION-MOMENT TRANSITS TO THE QUERENT NATAL CHART:\n${transitChart.transits.map(row => `- ${row.name}: ${row.display}; ${row.natalContacts.length ? row.natalContacts.map(contact => `${contact.aspect} natal ${contact.natalName} (${contact.orb}°)`).join(", ") : "no configured natal contact"}`).join("\n")}`
    : "QUESTION-MOMENT TRANSITS: positions are available, but no natal comparison contacts can be calculated without a complete querent natal profile.";
  const evidenceText = [
    `Question: ${input.question}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Location: ${input.location} (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`,
    `House system: Equal House, with 30-degree cusps from the calculated Ascendant. Planetary longitudes are geocentric; a separate topocentric (parallax-corrected) Moon longitude is available but is not used for houses or aspects.`,
    `Question topic: ${topic.label} (${ordinal(input.topicHouse)} house from the ${input.subject === "querent" ? "querent" : "other person"}).`,
    `Ascendant: ${ascendant.display} (${ascendantSign}); querent's primary ruler: ${querentRuler}.`,
    `Person asked about: ${input.subject === "querent" ? "the querent (House 1)" : "another person (House 7)"}; that person's ruler: ${subjectRuler}.`,
    `Topic house: house ${input.topicHouse} counted from the person asked about is actual chart house ${actualTopicHouse}; cusp sign ${houses[actualTopicHouse - 1].sign}; topic ruler ${topicRuler}.`,
    `Significator roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual chart House ${actualTopicHouse} ruler ${topicRuler}. Traditional judgment compares ${input.subject === "querent" ? `the querent ruler ${querentRuler}` : `the subject ruler ${subjectRuler}`} with matter ruler ${topicRuler}; retain the querent ruler as context. Do not interchange these roles.`,
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
    `RECEPTION / MUTUAL RECEPTION (host receives guest):\n${receptionLines}`,
    `TRADITIONAL MOON STATUS: ${traditional.moonStatus.explanation}${traditional.moonStatus.nextApplications.length ? `\nNext applications: ${traditional.moonStatus.nextApplications.map(a => `${a.planet} ${a.aspect} in ${a.daysToPerfection} days`).join("; ")}` : ""}`,
    `PERFECTION / INTERRUPTION TESTIMONY:\n${traditional.perfection.length ? traditional.perfection.map(p => `- ${p.type.toUpperCase()} (${p.strength}): ${p.description}`).join("\n") : "- No configured direct perfection, translation, collection, or prohibition testimony was found."}`,
    `PROVISIONAL TRADITIONAL JUDGMENT: ${traditional.judgment.verdict}; score ${traditional.judgment.score}. ${traditional.judgment.explanation}`,
    `FIXED-STAR TESTIMONY (conjunctions within 1° only):\n${starLines}`,
    `RADICALITY / CONSIDERATIONS BEFORE JUDGMENT: status ${traditional.radicality.status}; ${traditional.radicality.explanation}\n${traditional.radicality.considerations.length ? traditional.radicality.considerations.map(row => `- ${row}`).join("\n") : "- No configured caution was triggered."}`,
    `TRADITIONAL EVENT-TIMING AID (degrees to perfection and modality estimate; not a guaranteed event date):\n${timingLines}`,
    `LUNAR MANSION / MANZIL / DECAN CONTEXT FOR CLASSICAL PLANETS AND ASCENDANT:\n${overlayLines}`,
    `SEFER YETZIRAH + FOUR WORLDS — QUESTION-MOMENT SYMBOLIC CORRESPONDENCES (textual variants, contextual only; cannot change traditional judgment):\n${kabbalahEvidenceText}`,
    `SEFER YETZIRAH — QUERENT NATAL CORRESPONDENCES (distinct from the horary moment):\n${natalKabbalahText}`,
    natalEvidence,
    transitEvidence,
    godEvidence,
    "Three-layer reading rule: keep the NATAL / AGENT, TRANSIT / QUESTION-MOMENT, and GOD VIEW / GEOCENTRIC evidence sets explicitly separate. Use natal houses only for the person layer; use transit contacts to describe activation; use God View for the whole-sky context. Never turn God View into local houses or a personal Ascendant.",
    "Method boundary: the traditional layer now calculates configured Lots, dignity/debility indicators, reception, close fixed-star testimony, radicality cautions, a non-deterministic perfection timing aid, and lunar mansion/Manzil/Decan overlays. It still does not calculate every traditional doctrine, including prohibition, collection/translation of light, all sect/ruler conditions, or a complete traditional timing judgment; do not invent those factors.",
  ].join("\n\n");
  const judgmentEvidenceText = [
    `Question: ${input.question}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Question topic: ${topic.label}; the selected relative House ${input.topicHouse} is actual chart House ${actualTopicHouse}.`,
    `Roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual House ${actualTopicHouse} ruler ${topicRuler}. Traditional judgment compares ${input.subject === "querent" ? querentRuler : subjectRuler} with ${topicRuler}; keep the roles separate.`,
    `Ascendant: ${ascendant.display}; Moon: ${moon.display}, ${moon.sign}, House ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Core placements:\n${corePlacementLines}`,
    `Relevant major aspects supplied by the calculator (maximum 5° orb):\n${aspectLines}`,
    `LOCAL FIRMAMENT CANON / DETERMINISTICALLY RETRIEVED FOR THE RELEVANT SIGNIFICATORS:\n${canonEvidenceText}`,
    `SEFER YETZIRAH SYMBOLIC CORRESPONDENCES FOR THE QUESTION MOMENT (never override the core horary verdict):\n${kabbalahEvidenceText}`,
    natalQuestionEvidence,
    transitQuestionEvidence,
    `Radicality / considerations before judgment: status ${traditional.radicality.status}; ${traditional.radicality.explanation}${traditional.radicality.considerations.length ? `\n- ${traditional.radicality.considerations.join("\n- ")}` : ""}`,
    `Configured traditional support: ${traditional.receptions.length ? traditional.receptions.map(row => row.description).join("; ") : "No configured reception found."}`,
    "This is the compact judgment evidence. The complete technical appendix follows, including dignity/debility, Lots, receptions, timing, fixed stars, lunar mansion/Manzil/Decan/Nakshatra overlays, and the Moon/perfection testimony. Use all supplied layers in clear English, keeping traditional horary significators and perfection as the primary judgment, with natal and transit charts as context.",
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
    houseSystem: "Equal House",
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
    canonEvidenceText,
    evidenceText,
    judgmentEvidenceText,
  };
}

const HORARY_SYSTEM = `${KABBALAH_SYNTHESIS_STANDARD}\n\n${FIRMAMENT_MASTER_INTERPRETATION_PROMPT}\n\n---\n\n${FIRMAMENT_CARE_DELIVERY_STANDARD}\n\n---\n\n${FIRMAMENT_VISIBLE_INTERPRETATION_FORMAT}\n\n---\n\nHORARY VISIBLE ANSWER CONTRACT — REQUIRED\nFor the first answer to a horary question, render these exact sections before technical details, in this order:\n\n## What I hear beneath your question\nName the human concern supported by the wording. For a relationship question, acknowledge the uncertainty, hope, longing, or need for protection that is actually present without inventing feelings.\n\n## What this means for you\nGive the empathetic synthesis: distinguish what the user is hoping for from what the chart can responsibly say, and explain what the situation may mean for their choices and emotional reality.\n\n## Judgment\nAnswer the horary question directly with an evidence-calibrated category.\n\n## The astrological picture\nExplain the strongest testimony and immediately translate each factor into this person’s situation.\n\n## What complicates it\nName contradictions, delays, limits, and uncertainty.\n\n## What to do with this\nOffer a grounded next step that preserves the user’s agency. Never state that another person will definitely contact, return, change, or feel a particular way.\n\n---\n\n${HORARY_SPECIALIZED_SYSTEM}`;

function responseText(content: string | Array<{ type: string; text?: string }> | undefined) {
  return typeof content === "string"
    ? content
    : (content ?? []).filter(part => part.type === "text").map(part => part.text ?? "").join("\n");
}

async function answer(messages: Message[], maxTokens = 6000) {
  const controller = new AbortController();
  const responsePromise = invokeLLM({ model: "claude-sonnet-4-6", messages, maxTokens, signal: controller.signal });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Error("Horary synthesis deadline exceeded."));
      reject(new Error("Horary language synthesis exceeded its 30-second time budget."));
    }, 30_000);
  });
  let response: Awaited<typeof responsePromise>;
  try {
    response = await Promise.race([responsePromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  const text = responseText(response.choices?.[0]?.message?.content);
  if (!text.trim()) throw new Error("The horary interpreter returned no readable answer. Please try again.");
  return text;
}

function deterministicHoraryReading(chart: HoraryChart) {
  const primaryRuler = chart.subject === "querent" ? chart.querentRuler : chart.subjectRuler;
  const directAspect = chart.relevantAspects.find(
    aspect =>
      (aspect.first === primaryRuler && aspect.second === chart.topicRuler) ||
      (aspect.first === chart.topicRuler && aspect.second === primaryRuler)
  );
  const judgment = chart.traditional.judgment.verdict;
  const aspectSentence = directAspect
    ? `${directAspect.first} ${directAspect.aspect} ${directAspect.second} with a ${directAspect.orb}° orb (${directAspect.phase}).`
    : "The supplied significators do not form a configured major aspect within the 5° orb.";
  const traditionalSummary = chart.traditional.judgment.testimonies.join(" ");
  const complication = chart.traditional.radicality.considerations.length
    ? chart.traditional.radicality.considerations.join(" ")
    : directAspect?.phase === "separating"
      ? "The contact is separating, so the chart describes something already moving away or completing rather than a clean future application."
      : "No additional radicality caution was triggered by the configured traditional checks.";
  const natalSummary = chart.natalChart
    ? `The querent’s natal layer is present: Sun ${chart.natalChart.movingBodies.find(row => row.name === "Sun")?.display ?? "unavailable"}, Moon ${chart.natalChart.movingBodies.find(row => row.name === "Moon")?.display ?? "unavailable"}, Ascendant ${chart.natalChart.ascendant?.display ?? "unavailable"}.`
    : "No complete querent natal profile was supplied, so the reading does not infer natal background.";
  const transitSummary = chart.natalChart
    ? chart.transitChart.transits
      .flatMap(row => row.natalContacts.map(contact => `${row.name} ${contact.aspect} natal ${contact.natalName} (${contact.orb}°)`))
      .slice(0, 4)
    : [];
  return [
    "## What I hear beneath your question",
    `You are asking: “${chart.question}” The chart is being used to examine that specific matter at the place and moment you supplied.`,
    "",
    "## What this means for you",
    `The question is assigned to ${chart.topicLabel}, with ${chart.querentRuler} representing the querent, ${chart.subjectRuler} representing the person in question, and ${chart.topicRuler} representing the matter. The traditional judgment compares ${chart.subject === "querent" ? chart.querentRuler : chart.subjectRuler} with the matter ruler; the other layers refine, rather than replace, that judgment.`,
    "",
    "## Judgment",
    `**${judgment}** — this is the calibrated category supported by the configured horary testimony.`,
    "",
    "## The astrological picture",
    aspectSentence,
    `Traditional testimony: ${traditionalSummary}`,
    `The Moon is ${chart.moon.display}, ${chart.moon.sign}, in House ${chart.moon.house}. ${chart.canonEvidenceText.split("\n").slice(0, 6).join(" ")}`,
    natalSummary,
    transitSummary.length
      ? `Question-moment transit contacts to the natal chart: ${transitSummary.join("; ")}.`
      : "No configured question-moment transit contact to the querent’s natal chart is within the active orb.",
    "",
    "## What complicates it",
    complication,
    "",
    "## What to do with this",
    "Use this as a structured reflection on the question rather than a guarantee about another person or future event. If the matter is consequential, pair the reading with direct information, practical judgment, and appropriate professional advice.",
    "",
    "_This core judgment was produced from Firmament’s deterministic chart, traditional, and local canon layers because the optional language-synthesis service did not return within its time budget._",
  ].join("\n");
}

export async function openHoraryQuestion(input: HoraryInput) {
  const chart = await calculateHoraryChart(input);
  const coreReading = deterministicHoraryReading(chart);
  const reading = await answer([
    { role: "system", content: HORARY_SYSTEM },
    { role: "user", content: `Use the compact deterministic judgment packet below as the source of truth. The complete technical appendix remains available in the chart object. Do not recalculate or invent missing factors. Do not expose private chain-of-thought; provide the judgment and concise supporting evidence. The first visible sections must be exactly: “What I hear beneath your question,” “What this means for you,” then “Judgment,” before “The astrological picture.”\n\n${chart.judgmentEvidenceText}\n\nFULL TECHNICAL EVIDENCE (all configured layers):\n${chart.evidenceText}\n\nGive the complete, human-centered horary judgment now.` },
  ], 3200).catch(() => coreReading);
  return { chart, reading };
}

export async function horaryFollowUp(
  chart: HoraryChart,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
) {
  return answer([
    { role: "system", content: `${HORARY_SYSTEM}\n\nThis is a follow-up in an existing horary conversation. Keep the original chart and question fixed. Answer the specific follow-up, connect it to the supplied evidence and prior discussion, and do not recast the chart or silently change the original topic.` },
    { role: "user", content: `Original horary judgment evidence:\n\n${chart.judgmentEvidenceText}\n\nFull configured chart and canon evidence:\n\n${chart.evidenceText}` },
    ...withCurrentQuestion(history, question, 12),
  ], 1800).catch(() =>
    `The core chart remains fixed for this follow-up. The deterministic judgment is ${chart.traditional.judgment.verdict}. The relevant significators are ${chart.subject === "querent" ? chart.querentRuler : chart.subjectRuler} and ${chart.topicRuler}; Moon status: ${chart.traditional.moonStatus.explanation} The optional language-synthesis service did not return within its time budget, so no new claim is being added beyond the calculated evidence.`,
  );
}
