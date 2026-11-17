import { calculateMasterChart as calculateChart } from "./masterChart/entry";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { type ChartInput } from "./astronomy";
import { withCurrentQuestion } from "./_core/conversation";
import { runInterpretation, interpretationText } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { normalizeLongitude, ZODIAC_SIGNS } from "../shared/hybrid";
import type { FrameRelationship } from "./astrologyCore";
import { HORARY_TOPICS } from "../shared/horary";
import { calculateLookahead, type Lookahead } from "./horaryLookahead";
import { calculateTraditionalHorary, type TraditionalHoraryEvidence } from "./horaryTraditional";
import { HORARY_SYSTEM as HORARY_SPECIALIZED_SYSTEM } from "./horary-instructions";
import { FIRMAMENT_CARE_DELIVERY_STANDARD, FIRMAMENT_MASTER_INTERPRETATION_PROMPT } from "./firmament-master";
import { FIRMAMENT_VISIBLE_INTERPRETATION_FORMAT } from "./firmament-output";
import { retrieveChartCanonDossier } from "./astrologyKnowledge/canon/retriever";
import { getPlanetInHouseKnowledge } from "./astrologyKnowledge/canon/planetInHouseInterpretations";
import { synthesizeHoraryWithGroq } from "./services/groqHoraryService";
import { scrubLeaks } from "./astrologyKnowledge/synthesis/narrative";
import {
  analyzeHoraryQuestionHeuristic,
  analyzeHoraryQuestionWithAI,
  type HoraryQuestionAnalysis,
} from "./horaryQuestionAnalyzer";

export type { HoraryQuestionAnalysis, HoraryQuestionType } from "./horaryQuestionAnalyzer";

export type HoraryInput = Pick<ChartInput, "location" | "latitude" | "longitude" | "timezone" | "date" | "time"> & {
  question: string;
  subject?: "querent" | "other";
  topicHouse?: number;
  /** House of the person asked about, counted from the querent. */
  subjectHouse?: number;
  /** Precomputed Step 1 question analysis (auto-determined when omitted). */
  questionAnalysis?: HoraryQuestionAnalysis;
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
  questionAnalysis: HoraryQuestionAnalysis;
  subject: "querent" | "other";
  subjectHouse: number;
  subjectRuler: string;
  topicHouse: number;
  actualTopicHouse: number;
  topicLabel: string;
  additionalTopicHouses: Array<{
    relativeHouse: number;
    actualHouse: number;
    sign: string;
    ruler: string;
    label: string;
  }>;
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
  unifiedSynthesisSnapshotId?: string;
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

export function aspectBetween(a: HoraryPlacement, b: HoraryPlacement): HoraryAspect | null {
  const distance = separation(a.longitude, b.longitude);
  const closest = ASPECT_TARGETS.map(([target, aspect]) => ({ aspect, orb: Math.abs(distance - target) }))
    .sort((left, right) => left.orb - right.orb)[0];
  if (!closest || closest.orb > ASPECT_ORB_DEGREES) return null;

  // Use the instantaneous change in the signed angular error. A full-day
  // projection can jump across perfection (especially for the Moon) and label
  // an approaching contact as separating.
  const signedDistance = ((normalizeLongitude(a.longitude - b.longitude) + 180) % 360) - 180;
  const target = ASPECT_TARGETS.find(([, aspect]) => aspect === closest.aspect)![0];
  const signedTarget = signedDistance < 0 ? -target : target;
  const error = signedDistance - signedTarget;
  const relativeSpeed = a.speed - b.speed;
  const phase = Math.abs(error) < 1e-7 || Math.abs(relativeSpeed) < 1e-7
    ? "unclear"
    : error * relativeSpeed < 0 ? "applying" : "separating";
  return { first: a.name, second: b.name, aspect: closest.aspect, orb: Number(closest.orb.toFixed(2)), phase };
}

function uniquePairs(placements: HoraryPlacement[], names: string[]) {
  const selected = Array.from(new Set(names)).map(name => placements.find(placement => placement.name === name)).filter((row): row is HoraryPlacement => Boolean(row));
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
        worldview: "agent-vs-god",
        readingScope: "combined",
        birthTimeKnown: Boolean(input.natal.time),
      })
    : undefined;
  // Without a natal profile there is nothing for the question-moment sky to contact.
  // Do not compare the question chart against itself: that invents natal contacts.
  const transitChart = natalChart ?? { ...calculated, transits: calculated.transits.map(row => ({ ...row, natalContacts: [], minorNatalContacts: [] })) };
  const godChart = await calculateChart({
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    date: input.date,
    time: input.time,
    transitDate: input.date,
    transitTime: input.time,
    transitTimezone: input.timezone,
    transitLocation: input.location,
    transitLatitude: input.latitude,
    transitLongitude: input.longitude,
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
  const analysis =
    input.questionAnalysis ??
    analyzeHoraryQuestionHeuristic(input.question, {
      subject: input.subject,
      topicHouse: input.topicHouse,
      subjectHouse: input.subjectHouse,
    });
  const topic = HORARY_TOPICS.find(item => item.house === analysis.topicHouse);
  if (!topic) throw new Error("Choose a valid topic house before casting the horary chart.");

  const querentRuler = houses[0].ruler;
  const subject = analysis.subject;
  const subjectHouse = analysis.subject === "querent" ? 1 : analysis.subjectHouse;
  const subjectRuler = houses[subjectHouse - 1].ruler;
  const actualTopicHouse = ((subjectHouse - 1 + analysis.topicHouse - 1) % 12) + 1;
  const topicRuler = houses[actualTopicHouse - 1].ruler;
  const additionalTopicHouses = analysis.additionalHouses
    .filter(relHouse => Number.isInteger(relHouse) && relHouse >= 1 && relHouse <= 12 && relHouse !== analysis.topicHouse)
    .map(relHouse => {
      const actualHouse = ((subjectHouse - 1 + relHouse - 1) % 12) + 1;
      const houseInfo = houses[actualHouse - 1];
      const topicMeta = HORARY_TOPICS.find(item => item.house === relHouse);
      return {
        relativeHouse: relHouse,
        actualHouse,
        sign: houseInfo.sign,
        ruler: houseInfo.ruler,
        label: topicMeta?.label ?? `House ${relHouse}`,
      };
    });
  const moon = placements.find(row => row.name === "Moon");
  if (!moon) throw new Error("The Moon position is not available in the calculated question chart.");
  const aspectNames = Array.from(
    new Set([
      querentRuler,
      subjectRuler,
      topicRuler,
      ...additionalTopicHouses.map(row => row.ruler),
      "Moon",
    ])
  );
  const relevantAspects = uniquePairs(placements, aspectNames)
    .map(([first, second]) => aspectBetween(first, second))
    .filter((aspect): aspect is HoraryAspect => Boolean(aspect));
  const significatorNames = new Set(aspectNames);
  const canonDossier = retrieveChartCanonDossier(calculated);
  const canonDossierEvidenceText = canonDossier.placements
    .filter(row => significatorNames.has(row.body))
    .map(row => [
      `- ${row.body}: ${row.planetInSignSynthesis}`,
      `  - Condition: ${row.dignityAndCondition.conditionSummary}`,
      `  - House doctrine: ${row.planetInHouseSynthesis}`,
      row.godToAgentNote ? `  - God → Agent: ${row.godToAgentNote}` : null,
    ].filter((line): line is string => Boolean(line)).join("\n"))
    .join("\n") || "- No local canon placement dossier was available for the selected significators.";
  // Canon-first dual-frame interpretation: resolve every available placement against
  // the 144-record local library before requesting language synthesis.
  const canonBodyName = (name: string) =>
    name === "North Node" || name === "True Node" ? "Rahu" :
    name === "South Node" ? "Ketu" : name;
  const dualFrameCanonNames = new Set([
    ...Array.from(significatorNames),
    ...relevantAspects.flatMap(a => [a.first, a.second]),
  ]);
  const dualFrameCanonEvidence = placements
    .filter(row => dualFrameCanonNames.has(row.name))
    .map(row => {
    const body = canonBodyName(row.name);
    const views = [
      { label: "God View", house: row.godHouse },
      { label: "Agent View", house: row.agentHouse ?? row.house },
    ];
    const records = views.map(view => {
      const record = view.house == null ? null : getPlanetInHouseKnowledge(body, view.house);
      if (!record) return `  - ${view.label}: no matching planet-in-house canon record; do not invent one.`;
      return [
        `  - ${view.label}: House ${view.house} · ${record.domain} [${record.ruleId}]`,
        `    Core: ${record.core}`,
        `    Career: ${record.career}`,
        `    Relationships: ${record.relationships}`,
        `    Challenge: ${record.challenge}`,
        `    Gift: ${record.gift}`,
        `    Vedic / historical context: ${record.vedic}`,
        `    Provenance: ${record.epistemicStatus}; ${record.sourceCaveat}`,
        `    Interpretation rule: ${record.interpretiveGuardrail}`,
      ].join("\n");
    });
    return `- ${row.name} at ${row.display}\n${records.join("\n")}`;
  }).join("\n");
  const canonEvidenceText = `DUAL-FRAME PLANET-IN-HOUSE CANON (resolved locally before interpretation):\n${dualFrameCanonEvidence}\n\nSIGNIFICATOR CONDITION DOSSIER:\n${canonDossierEvidenceText}`;
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
  const traditional = calculateTraditionalHorary({ ascendant: { name: "Ascendant", longitude: ascendant.longitude, house: 1 }, houses, placements, topicRuler, subjectRuler, querentRuler, questionRuler: subject === "querent" ? querentRuler : subjectRuler, lookahead, referenceUtc: askedAt });
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
  const additionalHousesSummary = additionalTopicHouses.length
    ? additionalTopicHouses.map(h => `House ${h.actualHouse} (${h.label}, ${h.sign}, ruler ${h.ruler})`).join("; ")
    : "None specified";
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
    `Question analysis (${analysis.source}): Subject = ${analysis.matterSubject}; Outcome sought = ${analysis.intendedOutcome}; Type = ${analysis.questionType}; Interpersonal = ${analysis.isInterpersonal ? "yes" : "no"}; Rationale: ${analysis.reasoning}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Location: ${input.location} (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`,
    `Coordinate model: equatorial ephemeris XYZ projected into the fixed firmament frame, without tropical/sidereal conversion. House system: Equal House, with 30-degree cusps from the sunrise-anchored Ascendant and elapsed rotation at exactly 15 degrees per hour. Planetary longitudes are geocentric; a separate topocentric (parallax-corrected) Moon longitude is available but is not used for houses or aspects.`,
    `Question topic: ${topic.label} (${ordinal(analysis.topicHouse)} house from the ${subject === "querent" ? "querent" : "other person"}).`,
    `Ascendant: ${ascendant.display} (${ascendantSign}); querent's primary ruler: ${querentRuler}.`,
    `Person asked about: ${subject === "querent" ? "the querent (House 1)" : `another person (House ${subjectHouse})`}; that person's ruler: ${subjectRuler}.`,
    `Topic house: house ${analysis.topicHouse} counted from the person asked about is actual chart house ${actualTopicHouse}; cusp sign ${houses[actualTopicHouse - 1].sign}; topic ruler ${topicRuler}.`,
    `Additional relevant houses & rulers: ${additionalHousesSummary}`,
    `Significator roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual chart House ${actualTopicHouse} ruler ${topicRuler}. Traditional judgment compares ${subject === "querent" ? `the querent ruler ${querentRuler}` : `the subject ruler ${subjectRuler}`} with matter ruler ${topicRuler}; retain the querent ruler as context. Do not interchange these roles.`,
    `Moon: ${moon.display}, ${moon.sign}, house ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Traditional planetary placements:\n${placementLines}`,
    `House cusps and traditional rulers:\n${houseLines}`,
    `GOD VIEW / AGENT VIEW RELATIONSHIP SYNTHESIS (contextual layer; do not replace horary testimony):\n${frameLines}`,
    `Major aspects among the querent, person, matter significators, additional house rulers, and Moon (maximum 5° orb):\n${aspectLines}`,
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
    "FULL 16/20-LAYER SYNTHESIS REPORT (contextual; horary testimony remains primary)",
    "16 SELF-KNOWLEDGE DIMENSIONS: supplied through the unified Master method evidence when available; missing dimensions remain explicitly unavailable.",
    "16-SYSTEM CONVERGENCE AUDIT: compare returned system evidence without inventing absent results.",
    "PLANET INTERACTION MATRIX: use the calculated aspects and relationship evidence supplied above.",
    "LANGUAGE SAFETY RESTRICTIONS: symbolic possibilities are not diagnoses, guarantees, biographies, or claims about another person’s private mind.",
    natalEvidence,
    transitEvidence,
    godEvidence,
    "Three-layer reading rule: keep the NATAL / AGENT, TRANSIT / QUESTION-MOMENT, and GOD VIEW / GEOCENTRIC evidence sets explicitly separate. Use natal houses only for the person layer; use transit contacts to describe activation; use God View for the whole-sky context. Never turn God View into local houses or a personal Ascendant.",
    "Method boundary: the traditional layer now calculates configured Lots, dignity/debility indicators, reception, close fixed-star testimony, radicality cautions, a non-deterministic perfection timing aid, and lunar mansion/Manzil/Decan overlays. Configured perfection records include direct contact, translation, collection, and prohibition when supported by the supplied evidence. This is not an exhaustive implementation of every traditional doctrine or a complete traditional event-timing judgment; do not invent records that were not returned.",
  ].join("\n\n");
  const judgmentEvidenceText = [
    `Question: ${input.question}`,
    `Question focus: ${analysis.matterSubject} — ${analysis.intendedOutcome} (question type: ${analysis.questionType}; interpersonal: ${analysis.isInterpersonal ? "yes" : "no"}).`,
    `House assignment rationale: ${analysis.reasoning}`,
    `Question asked at: ${askedAt} UTC (${input.date} ${input.time} local; ${input.timezone})`,
    `Question topic: ${topic.label}; the selected relative House ${analysis.topicHouse} is actual chart House ${actualTopicHouse}. Additional relevant houses: ${additionalHousesSummary}.`,
    `Roles: querent = House 1 ruler ${querentRuler}; person asked about = House ${subjectHouse} ruler ${subjectRuler}; matter = actual House ${actualTopicHouse} ruler ${topicRuler}. Traditional judgment compares ${subject === "querent" ? querentRuler : subjectRuler} with ${topicRuler}; keep the roles separate.`,
    `Ascendant: ${ascendant.display}; Moon: ${moon.display}, ${moon.sign}, House ${moon.house}${moon.retrograde ? ", retrograde" : ""}.`,
    `Core placements:\n${corePlacementLines}`,
    `Relevant major aspects supplied by the calculator (maximum 5° orb):\n${aspectLines}`,
    `LOCAL FIRMAMENT CANON / DETERMINISTICALLY RETRIEVED FOR THE RELEVANT SIGNIFICATORS:\n${canonEvidenceText}`,
    natalQuestionEvidence,
    transitQuestionEvidence,
    `Radicality / considerations before judgment: status ${traditional.radicality.status}; ${traditional.radicality.explanation}${traditional.radicality.considerations.length ? `\n- ${traditional.radicality.considerations.join("\n- ")}` : ""}`,
    `Configured traditional support: ${traditional.receptions.length ? traditional.receptions.map(row => row.description).join("; ") : "No configured reception found."}`,
    "This is the compact judgment evidence. The complete technical appendix follows, including dignity/debility, Lots, receptions, timing, fixed stars, lunar mansion/Manzil/Decan/Nakshatra overlays, and the Moon/perfection testimony. Use all supplied layers in clear English, keeping traditional horary significators and perfection as the primary judgment, with natal and transit charts as context.",
  ].join("\n\n");

  return {
    question: input.question,
    questionAnalysis: analysis,
    subject,
    subjectHouse,
    subjectRuler,
    topicHouse: analysis.topicHouse,
    actualTopicHouse,
    topicLabel: topic.label,
    additionalTopicHouses,
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

const HORARY_FULL_SYNTHESIS_STYLE = `FULL SYNTHESIS — MASTER HUMAN & CHRONOLOGICAL READING
Write the reading in clear, grounded, direct 2026 English—as a perceptive life-story reading rather than a therapist's report or a textbook list.
- Never repeat the same placement explanation or stock phrasing across sections.
- Explain combined configurations (aspect circuits, guest–host tensions, house-rulership chains, Nakshatra/Manzil modifiers, Hermetic Lots, Fixed Stars, and God-to-Agent integration) cleanly without quoting raw telemetry (orb decimals in body text, virupas scores, module names, configured flows, or UTC timestamps).
- Ban poetic clichés ("cosmic", "sacred", "sacred mirror", "tapestry", "bastion", "alchemist", "underworld", "symphony"), ban shrink jargon ("protective strategies", "emotional regulation", "attachment wounds", "somatic gut-instincts"), and ban formulaic hedging ("At its best...", "Under stress, watch the trap...", "This could suggest...").
- Let difficult truths—including the person's own part in conflict or repeated mistakes—stand honestly alongside real strengths, always showing why the chart leads there, and never invent personal events or medical diagnoses.`;

const HORARY_SYSTEM = `${HORARY_FULL_SYNTHESIS_STYLE}\n\n---\n\n${FIRMAMENT_MASTER_INTERPRETATION_PROMPT}\n\n---\n\n${FIRMAMENT_CARE_DELIVERY_STANDARD}\n\n---\n\nHORARY VISIBLE ANSWER CONTRACT — REQUIRED\n${FIRMAMENT_VISIBLE_INTERPRETATION_FORMAT}\n\n---\n\nHORARY READING PRESENTATION — FLEXIBLE\nThe three-wheel framework guides examination, not the conclusion or format. Select the order, emphasis, and level of detail that best answer the actual question. No exact headings or mandatory emotional preamble. Give clear evidence for conclusions, including challenging and contradictory testimony.\n\n---\n\n${HORARY_SPECIALIZED_SYSTEM}`;

function synthesizeHoraryChart(chart: HoraryChart) {
  return synthesizeChartForReading(
    chart.natalChart ?? chart.transitChart,
    chart.natalChart ? "combined" : "natal",
    chart.question
  );
}

export async function openHoraryQuestion(input: HoraryInput) {
  const questionAnalysis =
    input.questionAnalysis ??
    (input.subject !== undefined && input.topicHouse !== undefined
      ? analyzeHoraryQuestionHeuristic(input.question, {
          subject: input.subject,
          topicHouse: input.topicHouse,
          subjectHouse: input.subjectHouse,
        })
      : await analyzeHoraryQuestionWithAI(input.question));

  const chart = await calculateHoraryChart({ ...input, questionAnalysis });
  try {
    const { synthesis } = await synthesizeHoraryChart(chart);
    chart.unifiedSynthesisSnapshotId = synthesis.snapshotId;
    const reading = await synthesizeHoraryWithGroq(chart, HORARY_SYSTEM, synthesis);
    return { chart, reading, synthesisStatus: "ai_completed" as const };
  } catch (error) {
    console.warn("[Horary] Interpretation unavailable:", error instanceof Error ? error.name : "unknown");
    return { chart, reading: null, synthesisStatus: "ai_unavailable" as const };
  }
}

export async function horaryFollowUp(
  chart: HoraryChart,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
) {
  const analysis = chart.questionAnalysis;
  const framingNote = analysis
    ? `Question focus: ${analysis.matterSubject} (type: ${analysis.questionType}; interpersonal: ${analysis.isInterpersonal ? "yes" : "no"}). ${!analysis.isInterpersonal ? "Do NOT invent romantic partners, mutual friends, or an imaginary third party." : ""}`
    : "";
  const { synthesis } = await synthesizeHoraryChart(chart);
  const response = await runInterpretation("HORARY_FOLLOW_UP", synthesis, {
    timeoutMs: 30_000,
    maxTokens: 1800,
    messages: [
      { role: "system", content: `${HORARY_SYSTEM}\n\nThis is a follow-up in an existing horary conversation. Keep the original chart and question fixed. ${framingNote} Answer the specific follow-up in clear everyday language—keeping technical astrology terminology in the evidence ledger rather than lecturing on planets or houses—and do not recast the chart or silently change the original topic.` },
      { role: "user", content: `Original horary judgment evidence:\n\n${chart.judgmentEvidenceText}\n\nFull configured chart and canon evidence:\n\n${chart.evidenceText}` },
      ...withCurrentQuestion(history, question, 12),
    ],
  });
  const text = scrubLeaks(interpretationText(response)).trim();
  if (!text) throw new Error("HORARY_FOLLOW_UP_EMPTY: The provider returned no answer.");
  return text;
}
