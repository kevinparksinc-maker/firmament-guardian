import { buildAstrologyEvidencePacket, formatEvidencePacket, UNIVERSAL_READING_CONTRACT } from "./astrologyKnowledge";
import { calculateChart, type ChartInput } from "./astronomy";
import { withCurrentQuestion } from "./_core/conversation";
import { invokeLLM, type Message } from "./_core/llm";
import { normalizeLongitude, ZODIAC_SIGNS } from "../shared/hybrid";
import type { FrameRelationship } from "./astrologyCore";
import { resolveHoraryQuestion, type HoraryHouseSelection } from "./horaryQuestionIntelligence";
import { calculateLookahead, type Lookahead } from "./horaryLookahead";
import { calculateTraditionalHorary, type TraditionalHoraryEvidence } from "./horaryTraditional";
import { HORARY_SYSTEM as HORARY_SPECIALIZED_SYSTEM } from "./horary-instructions";
import { FIRMAMENT_CARE_DELIVERY_STANDARD, FIRMAMENT_MASTER_INTERPRETATION_PROMPT } from "./firmament-master";
import { FIRMAMENT_SOVEREIGN_VOICE_STANDARD, UNIVERSAL_THREE_LAYER_DIVINATION_ARCHITECTURE, BOLD_CLAIM_EVIDENCE_RULE, GUARDIAN_POWER_WITHOUT_JUDGMENT, CHART_POWER_BASE_INFLUENCE_PROTOCOL } from "./master-interpreter";
import { FIRMAMENT_VISIBLE_INTERPRETATION_FORMAT } from "./firmament-output";
import { retrieveChartCanonDossier } from "./astrologyKnowledge/canon/retriever";
import { seferYetzirahEvidence, KABBALAH_SYNTHESIS_STANDARD } from "./astrologyKnowledge/canon/seferYetzirah";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject?: "querent" | "other";
  topicHouse?: number;
  /** House of the person asked about, counted from the querent. */
  subjectHouse?: number;
  /** Optional advanced override. Ordinary question intake leaves this unset. */
  manualOverrides?: boolean;
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
  houseSelection: HoraryHouseSelection;
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
  const querentRuler = houses[0].ruler;
  const legacyOrExpertOverride = input.manualOverrides ?? (input.topicHouse !== undefined || input.subjectHouse !== undefined);
  const legacyUnspecifiedOtherHouse = input.subject === "other" && input.subjectHouse === undefined &&
    !/\bmy\s+(?:child|children|son|daughter|kid|sibling|brother|sister|mother|mum|mom|father|dad|parent|partner|spouse|husband|wife|boyfriend|girlfriend|friend|boss|manager|employer|employee|colleague|coworker|co-worker)\b/i.test(input.question)
    ? 7 : undefined;
  const houseSelection = resolveHoraryQuestion(input.question, houses, {
    enabled: legacyOrExpertOverride,
    ...(input.subjectHouse !== undefined ? { subjectHouse: input.subjectHouse } : legacyUnspecifiedOtherHouse ? { subjectHouse: legacyUnspecifiedOtherHouse } : {}),
    ...(input.topicHouse !== undefined ? { topicHouse: input.topicHouse } : {}),
  });
  if (houseSelection.status === "clarification_needed") throw new Error(houseSelection.clarificationQuestion ?? "Please clarify who the question refers to.");
  const personAssignment = houseSelection.assignments.find(row => row.role === "person");
  const matterAssignment = houseSelection.assignments.find(row => row.id === houseSelection.primaryMatterId);
  if (!matterAssignment) throw new Error("The question-intelligence layer could not resolve a matter house.");
  const subjectHouse = personAssignment?.house ?? 1;
  const subjectRuler = houses[subjectHouse - 1].ruler;
  const actualTopicHouse = matterAssignment.house;
  const topicHouse = matterAssignment.relativeHouse ?? actualTopicHouse;
  const topicLabel = matterAssignment.label;
  const topicRuler = houses[actualTopicHouse - 1].ruler;
  const moon = placements.find(row => row.name === "Moon");
  if (!moon) throw new Error("The Moon position is not available in the calculated question chart.");
  const aspectNames = Array.from(new Set([...houseSelection.significators.map(row => row.planet), querentRuler, subjectRuler, topicRuler, "Moon"]));
  const relevantAspects = uniquePairs(placements, aspectNames)
    .map(([first, second]) => aspectBetween(first, second))
    .filter((aspect): aspect is HoraryAspect => Boolean(aspect));
  const significatorNames = new Set(aspectNames);
  const canonDossier = retrieveChartCanonDossier(calculated);
  const fullMethodPacket = buildAstrologyEvidencePacket({ ...calculated, transits: [] }, input.question, "natal");
  const fullMethodEvidence = formatEvidencePacket(fullMethodPacket);
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
  const matterAssignments = houseSelection.assignments.filter(row => row.role === "matter" || row.role === "supporting");
  const comparisonPeople = [
    { label: "querent", ruler: querentRuler },
    ...houseSelection.assignments.filter(row => row.role === "person").map(row => ({ label: row.label, ruler: row.ruler })),
  ];
  const significatorPairs = matterAssignments.flatMap(matter => [
    ...comparisonPeople.map(person => ({ from: person.ruler, to: matter.ruler, label: `${person.label} ↔ ${matter.label}` })),
    { from: "Moon", to: matter.ruler, label: `Moon co-significator ↔ ${matter.label}` },
  ]);
  const traditional = calculateTraditionalHorary({
    ascendant: { name: "Ascendant", longitude: ascendant.longitude, house: 1 }, houses, placements,
    topicRuler, subjectRuler, querentRuler, questionRuler: personAssignment ? subjectRuler : querentRuler,
    additionalSignificators: houseSelection.significators.map(row => row.planet), significatorPairs,
    lookahead, referenceUtc: askedAt,
  });
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
    `Question topic: ${topicLabel} (${ordinal(topicHouse)} relative house; radical chart house ${actualTopicHouse}).`,
    `Ascendant: ${ascendant.display} (${ascendantSign}); querent's primary ruler: ${querentRuler}.`,
    `Person asked about: ${personAssignment ? `${personAssignment.label} (radical House ${subjectHouse})` : "the querent (House 1)"}; ruler ${subjectRuler}.`,
    `Topic house: radical chart House ${actualTopicHouse}; cusp sign ${houses[actualTopicHouse - 1].sign}; topic ruler ${topicRuler}.`,
    `AUTOMATIC HORARY QUESTION INTELLIGENCE — each house assignment includes the exact question wording, radical/turned-house derivation, ruler, and doctrine: ${houseSelection.assignments.map(row => `${row.label}: radical House ${row.house}, ruled by ${row.ruler}; wording “${row.wording}”; ${row.reasoning}`).join(" | ")}`,
    `Significator roles: ${houseSelection.significators.map(row => `${row.planet} for ${row.roles.join(", ")}`).join("; ")}. The querent remains House 1 ruler ${querentRuler}; the selected primary matter ruler is ${topicRuler}.`,
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
    `FULL UNIVERSAL METHOD EVALUATION (all returned evidence and explicit gaps):\n${fullMethodEvidence}`,
    `SEFER YETZIRAH + FOUR WORLDS — QUESTION-MOMENT SYMBOLIC CORRESPONDENCES (textual variants, contextual only; cannot change traditional judgment):\n${kabbalahEvidenceText}`,
    `SEFER YETZIRAH — QUERENT NATAL CORRESPONDENCES (distinct from the horary moment):\n${natalKabbalahText}`,
    natalEvidence,
    transitEvidence,
    godEvidence,
    "Three-layer reading rule: keep the NATAL / AGENT, TRANSIT / QUESTION-MOMENT, and GOD VIEW / GEOCENTRIC evidence sets explicitly separate. Use natal houses only for the person layer; use transit contacts to describe activation; use God View for the whole-sky context. Never turn God View into local houses or a personal Ascendant.",
    "Method boundary: the traditional layer calculates configured direct perfection and bounded translation, collection, possible-prohibition, reception, Moon-course, dignity/debility, and other testimony heuristics for the resolved significator pairs. These are configured rule checks, not an exhaustive reconstruction of every classical condition; each output carries its scope and should be judged in chart context.",
  ].join("\n\n");
  const judgmentEvidenceText = [
    `Question: ${input.question}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Question topic: ${topicLabel}; relative House ${topicHouse} is radical chart House ${actualTopicHouse}.`,
    `Roles: querent = House 1 ruler ${querentRuler}; ${personAssignment ? `${personAssignment.label} = House ${subjectHouse} ruler ${subjectRuler}` : "no separate person is named"}; matter = actual House ${actualTopicHouse} ruler ${topicRuler}.`,
    `AUTOMATIC HOUSE SELECTION: ${houseSelection.assignments.map(row => `${row.label} → radical House ${row.house} → ${row.ruler}; wording “${row.wording}”; ${row.reasoning}`).join("\n")}`,
    `Resolved significators: ${houseSelection.significators.map(row => `${row.planet} (${row.roles.join(", ")})`).join("; ")}.`,
    `Ascendant: ${ascendant.display}; Moon: ${moon.display}, ${moon.sign}, House ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Core placements:\n${corePlacementLines}`,
    `Relevant major aspects supplied by the calculator (maximum 5° orb):\n${aspectLines}`,
    `TRADITIONAL PERFECTION & VERDICT:\n- Verdict: ${traditional.judgment.verdict} (Score: ${traditional.judgment.score})\n- Perfection: ${traditional.perfection.length ? traditional.perfection.map(p => `${p.type.toUpperCase()} (${p.strength}): ${p.description}`).join("; ") : "No direct perfection, translation, collection, or prohibition."}\n- Moon: ${traditional.moonStatus.explanation}`,
    `SIGNIFICATOR DIGNITIES & DEBILITIES:\n${dignityLines}`,
    `RECEPTIONS (HOST-GUEST):\n${receptionLines}`,
    `ARABIC PARTS / LOTS:\n${lotLines}`,
    `FIXED STARS WITHIN 1° ORB:\n${starLines}`,
    `TRADITIONAL TIMING ESTIMATE:\n${timingLines}`,
    `LUNAR MANSION / MANZIL / DECAN OVERLAYS:\n${overlayLines}`,
    `LOCAL FIRMAMENT CANON / DETERMINISTICALLY RETRIEVED FOR THE RELEVANT SIGNIFICATORS:\n${canonEvidenceText}`,
    `SEFER YETZIRAH SYMBOLIC CORRESPONDENCES FOR THE QUESTION MOMENT (never override the core horary verdict):\n${kabbalahEvidenceText}`,
    natalQuestionEvidence,
    transitQuestionEvidence,
    `Radicality / considerations before judgment: status ${traditional.radicality.status}; ${traditional.radicality.explanation}${traditional.radicality.considerations.length ? `\n- ${traditional.radicality.considerations.join("\n- ")}` : ""}`,
    "This is the compact judgment evidence. The complete technical appendix follows, including dignity/debility, Lots, receptions, timing, fixed stars, lunar mansion/Manzil/Decan/Nakshatra overlays, and the Moon/perfection testimony. Use all supplied layers in clear English, keeping traditional horary significators and perfection as the primary judgment, with natal and transit charts as context.",
  ].join("\n\n");

  return {
    question: input.question,
    subject: personAssignment ? "other" : "querent",
    subjectHouse,
    subjectRuler,
    topicHouse,
    actualTopicHouse,
    topicLabel,
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
    houseSelection,
    canonEvidenceText,
    evidenceText,
    judgmentEvidenceText,
  };
}

const HORARY_SYSTEM = `You are The Absolute's expert horary interpreter. All astronomy, chart positions, house rulerships, receptions, timing and Canon evidence have already been calculated. You interpret and synthesize; you do not invent calculations or unseen circumstances.

OUTPUT CONTRACT — USER EXPERIENCE ABOVE ASTROLOGY VOCABULARY:
Answer the person's exact question immediately, in plain present-day language. Your first paragraph must state the direction of the reading and its actual implications for the topic. Do not lead with planets, houses, placements, disclaimers, or a restatement of the question.
Treat the horary testimony as an interpretive framework, not a demonstrated forecast or proof of real-world facts. Be confident and decisive in explaining the symbolic pattern, but do not claim certainty beyond the evidence.

Write only these four concise sections, each with useful nonrepetitive paragraphs:
## The answer
Direct response in 2–4 sentences, including relevant conditions or delays.
## What this means in real life
Decode the chart into the concrete human issue: likely patterns of behavior, choices, obstacles, relationships, responsibilities, or practical conditions pertinent to the question. State possibilities, not fabricated observations.
## What to do next
Give 2–3 specific, feasible actions tied to the user's actual question, presented as advice, not as planetary facts. For an app/public launch question, consider user testing, clear interpretation, quality control, and feedback only where relevant.
## Why the reading points there
Briefly explain the TWO or THREE strongest chart testimonies, translating each into real-world significance; note the strongest counter-testimony if there is disagreement. Keep astrology names and technical terms here only.

INTERNAL EVIDENCE HANDLING: Evaluate the major relevant factors, especially the question, significators, current and future aspects/perfection, reception, dignity, Moon, house ownership and ruled-house placements, counter-testimony and timing. Assess secondary Canon methods when they materially change the interpretation. Don't dump calculations or Canon prose into the visible reading. Do not fabricate the rest of the chart. If the calculated verdict conflicts with the strongest testimonies, name the uncertainty instead of masking it or reversing the verdict without support. Preserve the existing chart object and technical ledger in the application for optional inspection.
Do not provide internal reasoning traces, raw degree tables, every planetary placement, boilerplate, or repetitive conclusions. Do not diagnose health, claim private motives as facts, or give guaranteed investment or gambling outcomes.`;
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
  // This is a short, clearly labeled non-AI fallback. Full evidence is kept
  // on chart; never paste the Canon dossier or the entire testimony ledger.
  const verdict = chart.traditional.judgment.verdict;
  const primary = chart.subject === "querent" ? chart.querentRuler : chart.subjectRuler;
  const matter = chart.topicRuler;
  const intent = chart.houseSelection.questionIntent;
  const topic = chart.topicLabel;
  const terms = (chart.question + " " + topic).toLowerCase();
  const isApp = /\\b(app|application|software|website|platform|public|publish|launch|release|users?)\\b/.test(terms);
  const isWork = /\\b(job|work|career|business|promotion|employment|company)\\b/.test(terms);
  const isRelation = /\\b(relationship|partner|dating|marriage|reconcile|romance)\\b/.test(terms);

  const direction = verdict === "YES" || verdict === "LEANING YES"
    ? "The reading favors progress, provided the practical conditions support it."
    : verdict === "NO" || verdict === "LEANING NO"
      ? "The reading points to obstacles in the current approach, not proof that the goal is impossible."
      : verdict === "DELAYED"
        ? "The reading suggests development may take longer than expected."
        : "The reading is mixed or unresolved; it does not support an unconditional prediction.";
  const actions = isApp
    ? ["Put the app in front of a small group of real users before a broad launch.",
       "Make each answer clear and actionable; keep calculations in an optional evidence view.",
       "Fix the confusing or unreliable outputs users actually encounter, then gather feedback again."]
    : isWork
      ? ["Identify the most important practical obstacle to the outcome you're pursuing.",
         "Clarify what decision, agreement, or resource must change next.",
         "Set a realistic checkpoint to measure progress instead of relying on the reading alone."]
      : isRelation
        ? ["Focus on observable actions rather than guessing another person's intentions.",
           "Communicate clearly about what you need and what is actually possible.",
           "Allow their response and behavior—not the chart alone—to guide your next decision."]
        : ["Identify the one real-world condition you can influence right now.",
           "Gather direct evidence before making a major decision.",
           "Choose a next action and review what actually changes."];
  const primaryAspect = chart.traditional.perfection.find(item =>
    item.description?.includes(primary) && item.description?.includes(matter)
  );
  const briefWhy = [
    `The matter is assigned to ${topic}; its ruler is ${matter}, while ${primary} represents the person concerned.`,
    primaryAspect ? primaryAspect.description : chart.traditional.judgment.testimonies[0],
    chart.traditional.moonStatus.explanation,
  ].filter(Boolean).map(text => String(text).replace(/\\s+/g," ").slice(0,300));
  return [
    "## The answer", direction,
    "",
    "## What this means in real life",
    isApp
      ? "This is a prompt to examine launch readiness: what people understand, what they trust, and whether your product delivers useful answers consistently. The chart cannot tell us actual adoption, but those are the practical questions to test."
      : `In terms of ${topic.toLowerCase()}, this reading is about the conditions surrounding the decision, not a guarantee about the outcome. What matters next is what you can observe, verify, and change.`,
    "",
    "## What to do next",
    ...actions.map(action => `- ${action}`),
    "",
    "## Why the reading points there",
    briefWhy.join(" ") || "The engine returned a traditional judgment, but its supporting evidence is not available in this summary.",
    "",
    "_AI interpretation was unavailable. This concise fallback uses the calculated verdict and question category; inspect the technical evidence for the full chart._",
  ].join("\\n");
}
export async function openHoraryQuestion(input: HoraryInput) {
  const chart = await calculateHoraryChart(input);
  const coreReading = deterministicHoraryReading(chart);
  const reading = await answer([
    { role: "system", content: HORARY_SYSTEM },
    { role: "user", content: `Question: ${chart.question}\n\nCalculated horary judgment packet:\n${chart.judgmentEvidenceText}\n\nUse the evidence to answer this specific question. Translate the testimony into practical real-life meaning and next steps. The full technical chart is kept separately, NOT to be printed in the user-facing answer.` },
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
