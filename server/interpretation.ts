import { narrateMasterSynthesis } from "./astrologyKnowledge/synthesis/narrative";
import type { Message } from "./_core/llm";
import { runInterpretation, interpretationText } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import { withCurrentQuestion } from "./_core/conversation";
import type { ChartResult, ChartRow } from "./astronomy";
import { formatInZone } from "../shared/time";
import { buildAstrologyInterpreterSystem, FULL_SYNTHESIS_STYLE } from "./master-interpreter";
import {
  buildAstrologyEvidencePacket,
  formatCompactEvidencePacket,
  type AstrologyEvidencePacket,
} from "./astrologyKnowledge";
import { overlay as canonicalOverlay } from "../shared/hybrid";
import { buildMasterPipeline, formatCompactMasterGateContext } from "./master-pipeline";


const COSMOLOGY = `Read the supplied chart JSON and traditional-method findings silently. Give direct, candid conclusions grounded in the evidence, giving equal weight to natural gifts and difficult patterns without inventing personal events, medical diagnoses, secrets, or another person's motives.`;

const CLARITY_FRAMEWORK = `Answer the question first by starting with the strongest pattern that fits the topic. Weave agreeing findings into one clear insight and show when competing pulls take over and what that tension costs in everyday life. Keep all astrology terminology out of the reader-facing text, including section titles.`;

function chartFacts(chart: ChartResult, mode: ReadingMode) {
  const natalOnlyInput = {
    location: chart.input.location,
    latitude: chart.input.latitude,
    longitude: chart.input.longitude,
    timezone: chart.input.timezone,
    date: chart.input.date,
    time: chart.input.time,
  };
  return {
    input: mode === "natal" ? natalOnlyInput : chart.input,
    utc: chart.utc,
    julianDay: chart.julianDay,
    ascendant: chart.ascendant,
    descendant: chart.descendant,
    northNode: { ...chart.northNode, retrograde: undefined },
    southNode: { ...chart.southNode, retrograde: undefined },
    houses: chart.houses,
    movingBodies: chart.movingBodies,
    frozenStars: chart.frozenStars,
    validation: chart.validation,
    worldview: chart.worldview,
    readingScope: chart.readingScope,
    agentViewAvailable: chart.agentViewAvailable,
    godPlacements: chart.godPlacements,
    frameRelationships: chart.movingBodies
      .filter(row => row.frameRelationship)
      .map(row => ({
        body: row.name,
        longitude: row.longitude,
        display: row.display,
        godHouse: row.godHouse,
        agentHouse: row.agentHouse,
        relationship: row.frameRelationship,
      })),
    ...(mode === "natal"
      ? {}
      : { transitDate: chart.transitDate, transits: chart.transits }),
    ...(mode === "natal"
      ? {}
      : {
          momentPrecision: chart.momentPrecision,
          transitHouseFrame: chart.transitHouseFrame,
        }),
  };
}

export type ReadingMode = "natal" | "transit" | "combined";
export const READING_MODES: ReadingMode[] = ["natal", "transit", "combined"];
const WORLDVIEW_GUIDANCE = `Worldview (God / Agent / God's View of the Agent) and reading scope (Natal / Transit / Natal + Transit) are independent axes; preserve all existing reading scopes. In God View, use the fixed Aries House 1 through Pisces House 12 frame and the supplied moment, never infer an Ascendant, Midheaven, horizon, or location-based house. In Agent View, use the supplied geocentric planetary longitudes with the observer-specific topocentric lunar correction only when explicitly supplied, and use the Equal House placements from the supplied Ascendant. In God's View of the Agent, explain how the calculated personal placements sit inside the calculated collective frame; use godHouse, agentHouse, frameRelationships, and Royal Star contact data only when supplied. The same canonical geocentric longitude must be treated as one astronomical fact in both frames. Use the supplied relationship type and translation as structured interpretive context; do not calculate agree/shift or a match score, and do not call differing frames contradictory merely because their houses differ. God View augments primary chart testimony; it never overrides rulers, aspects, or horary significators. If the Moon is flagged uncertain, explain the supplied date range rather than presenting one Moon degree as certain. For transit readings, respect transitHouseFrame: transit-location, natal-location, or god-fixed. If momentPrecision is date-only-reference, state that noon UTC is an intentional approximate reference and that the Moon is time-sensitive.`;

const MODE_GUIDANCE: Record<ReadingMode, string> = {
  natal:
    "Read the natal chart only. Focus on enduring temperament, life patterns, nodes, angles, and fixed stars. Do not interpret current transit rows as part of this reading. This is a comprehensive self-knowledge profile: explain what kind of person this may be, how they experience themselves from the inside, what they need, what they fear, how they protect themselves, what others may misunderstand about them, and how their patterns can mature.",
  transit:
    "Read the transit layer only. Use the natal chart only as the reference points being contacted. Focus on the selected transit moment, location, houses, transit planets, nodes, and supplied natal contacts. Give the traditional timing and predictive interpretation when supported by calculated methods; distinguish an interpreted indication from an independently verified future event.",
  combined:
    "Read natal and transit layers together, clearly separating enduring natal pattern from current transit weather. Explain how the present moment activates or develops the natal story without confusing temporary pressure with identity.",
};

async function ask(
  synthesis: SynthesisResult,
  route: string,
  messages: Message[],
  maxTokens = 4000,
  thinkingBudget = 0
) {
  try {
    const response = await runInterpretation(route, synthesis, {
      provider: "gemini",
      messages,
      maxTokens,
      ...(thinkingBudget > 0
        ? { thinking: { type: "enabled", budget_tokens: thinkingBudget } }
        : {}),
    });
    return interpretationText(response);
  } catch (error) {
    console.error("[Interpretation] LLM request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown interpretation failure";
    throw new Error(`${route}_FAILED: ${message}`, { cause: error });
  }
}

function readerFacingIntelligence(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const data = JSON.parse(cleaned) as Record<string, unknown>;
    const section = (title: string, key: string) => {
      const values = Array.isArray(data[key])
        ? (data[key].filter(item => typeof item === "string") as string[])
        : [];
      return values.length
        ? `### ${title}\n${values.map(value => `- ${value}`).join("\n")}`
        : "";
    };
    return [
      "## The shape of your chart",
      "This is a concise map of the strongest patterns the calculation supports. The longer reading below turns these signals into a personal story.",
      section("What stands out", "dominantPlanets"),
      section("Life areas being emphasized", "dominantHouses"),
      section("Signs and qualities in focus", "dominantSigns"),
      section("The repeating thread", "repeatedThemes"),
      section("Strongest evidence", "strongestEvidence"),
      section("The central tensions", "tensions"),
      section("Placements to keep in view", "priorityPlacements"),
      section("What may be active now", "currentTransitThemes"),
      section("Psychological possibilities to test", "psychologicalHypotheses"),
      section("Questions for honest recognition", "disconfirmingQuestions"),
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return raw
      .replace(/[{}\[\]\"]/g, "")
      .replace(/,\s*/g, "\n")
      .trim();
  }
}

function buildChartMap(chart: ChartResult, mode: ReadingMode) {
  const body = chart.movingBodies;
  const placements = body
    .map(
      row => {
        const lunarOverlay = row.overlay ?? canonicalOverlay(row.longitude);
        return `- **${row.name}** — ${row.display}, displayed house ${row.house}, God House ${row.godHouse ?? "not supplied"}${row.agentHouse == null ? "" : `, Agent House ${row.agentHouse}`}; Nakshatra ${lunarOverlay.nakshatra} Pada ${lunarOverlay.pada} (ruler ${lunarOverlay.nakshatraRuler}); Arabic Manzil ${lunarOverlay.manzil}; Chinese Xiu ${lunarOverlay.chineseMansion} (determinative ${lunarOverlay.chineseDeterminativeStar}, ${lunarOverlay.chineseBoundaryModel})${row.retrograde ? ", retrograde" : ""}${row.uncertainty ? `; Moon uncertainty: ${row.uncertainty.label}` : ""}`;
      }
    )
    .join("\n");
  const includeTransit = mode !== "natal";
  const contacts = chart.transits
    .filter(row => row.natalContacts.length)
    .slice(0, 8)
    .map(
      row =>
        `- **${row.name}** in ${row.display}: ${row.natalContacts.map(contact => `${contact.aspect} ${contact.natalName} (orb ${contact.orb.toFixed(1)}°)`).join(", ")}`
    )
    .join("\n");
  const transitTimezone =
    chart.input.transitTimezone || chart.input.timezone || "UTC";
  const transitMoment = formatInZone(chart.transitDate, transitTimezone);
  return [
    "## Your chart map",
    "This is the factual foundation of your reading, calculated directly from the chart. The deeper personal chapters are generated separately so one unavailable AI request does not hide the chart itself.",
    `### Worldview and scope`,
    `- **Worldview:** ${chart.worldview}. **Reading scope:** ${chart.readingScope}.`,
    chart.agentViewAvailable
      ? `- **Agent layer:** available; placements include personal Equal House positions.`
      : `- **Agent layer:** unavailable because the chart has no exact birth time/location; do not infer an Ascendant or Midheaven.`,
    `- **God layer:** every supplied placement includes a fixed Aries-to-Pisces godHouse and calculated Royal Star contact distances.`,
    `### The angles`,
    chart.ascendant
      ? `- **Ascendant:** ${chart.ascendant.display}`
      : "- **Ascendant:** not calculated in God View.",
    chart.descendant
      ? `- **Descendant:** ${chart.descendant.display}`
      : "- **Descendant:** not calculated in God View.",
    `- **North Node:** ${chart.northNode.display}, house ${chart.northNode.house}`,
    `- **South Node:** ${chart.southNode.display}, house ${chart.southNode.house}`,
    `### Natal placements`,
    placements,
    mode === "natal"
      ? "### Reading layer\nThis map is prepared for a natal reading: the enduring foundation of the birth chart."
      : "### Reading layer\nThis map is prepared for the selected layer; the deeper chapters will keep natal patterns and present-moment activation distinct.",
    includeTransit
      ? `### Selected transit moment\n${transitMoment} at ${chart.input.transitLocation ?? chart.input.location} (${new Date(chart.transitDate).toISOString()}).`
      : "",
    includeTransit
      ? contacts
        ? `### Supplied natal contacts\n${contacts}`
        : "### Supplied natal contacts\nNo close contacts were found within the calculation's configured orb."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const READING_CHAPTERS = [
  {
    id: "identity",
    title: "Who You Really Are",
    subtitle: "Your true nature, character, gifts, weaknesses, and concrete hobbies",
    focus:
      "your true nature, character, natural gifts vs. hidden potential vs. developed strengths, weaknesses, concrete hobbies and interests backed by chart factors, what drives you, and the parts you hide from the world",
  },
  {
    id: "money-wealth",
    title: "Money, Poverty & Wealth",
    subtitle: "Earning potential, financial hardship, debt, and conditions for lasting wealth",
    focus:
      "financial hardships, earning capacity, debt, possessions, dependence on others vs. financial independence, and the conditions for building lasting wealth",
  },
  {
    id: "relationships",
    title: "Love, Sex, Marriage & Heartbreak",
    subtitle: "Attraction, intimacy, commitment, repeating patterns, and your part in conflict",
    focus:
      "attraction, desire, intimacy, commitment, infidelity or divorce risks where testimony supports them, rejection, romantic fulfillment, repeating relationship patterns, and what you yourself bring into romantic conflict",
  },
  {
    id: "family-roots",
    title: "Family, Childhood & Your Roots",
    subtitle: "Your mother, father, upbringing, inherited burdens, and school years",
    focus:
      "mother, father, home atmosphere, upbringing, inherited burdens, family separation where indicated, school years, learning style, and earliest experiences",
  },
  {
    id: "work-purpose",
    title: "Career, Success, Power & Reputation",
    subtitle: "Employment, business ownership, leadership, setbacks, and authority",
    focus:
      "employment vs. business ownership, leadership, recognition, professional setbacks, ambition, authority, and the kind of success you are driven to pursue",
  },
  {
    id: "friends-rivals",
    title: "Friends, Enemies, Betrayal & Loyalty",
    subtitle: "True friends, hidden rivals, jealousy, competition, and trust",
    focus:
      "true friends, hidden rivals, manipulation, jealousy, competition, social rejection, protection, why friendships last or break, and who deserves a place in your life",
  },
  {
    id: "hardship-loss",
    title: "Hardship, Loss & Survival",
    subtitle: "Major setbacks, injustice, isolation, self-sabotage, and rebuilding",
    focus:
      "major setbacks, injustice, confinement, isolation, sacrifice, grief, self-caused trouble or missed opportunities, difficult transitions, and how you rebuild after life knocks you down",
  },
  {
    id: "children-legacy",
    title: "Children, Parenting & Legacy",
    subtitle: "Parenthood, family continuity, responsibility, and what you pass down",
    focus:
      "relationship with children, parental responsibilities, family continuity, what you pass down, and what you hope children will carry forward",
  },
  {
    id: "health-habits",
    title: "Health, Habits & Physical Struggles",
    subtitle: "Vitality, exhaustion, daily routine discipline, stress load, and body care",
    focus:
      "vitality, exhaustion, discipline, daily routines, stress on the body, physical strain, and caring for physical health without inventing medical diagnoses",
  },
  {
    id: "faith-purpose",
    title: "Faith, Spirituality & Life Purpose",
    subtitle: "Your relationship with God or beliefs, moral convictions, and direction",
    focus:
      "relationship with God or spiritual convictions, meaning, moral backbone, inner change, and what gives life direction",
  },
  {
    id: "turning-points",
    title: "Turning Points & New Beginnings",
    subtitle: "Growth, endings, relocation, changing circumstances, and new chapters",
    focus:
      "growth, endings, relocation, changing circumstances, new opportunities, and larger life chapters anchored strictly in calculated Dasha, Profection, Firdaria, and Transit cycles",
  },
  {
    id: "blessings-lessons",
    title: "Your Greatest Blessings & Hardest Lessons",
    subtitle: "Where life opens naturally, where obstacles repeat, and where to go next",
    focus:
      "a direct synthesis of where life comes naturally, where the heaviest recurring obstacles sit, your clearest talents, honest shortcomings, and where to invest energy next",
  },
] as const;
export type ReadingChapterId = (typeof READING_CHAPTERS)[number]["id"];

const NODE_NAME = /node/i;

function rowLine(row: ChartRow, label = row.name) {
  const lunarOverlay = Number.isFinite(row.longitude)
    ? row.overlay ?? canonicalOverlay(row.longitude)
    : null;
  const parts = [
    `${label} — ${row.display}`,
    `displayed house ${row.house}`,
    lunarOverlay
      ? `Nakshatra ${lunarOverlay.nakshatra} Pada ${lunarOverlay.pada} (ruler ${lunarOverlay.nakshatraRuler})`
      : "Lunar overlays unavailable because canonical longitude was not supplied",
    ...(lunarOverlay ? [
      `Arabic Manzil ${lunarOverlay.manzil}`,
      `Chinese Xiu ${lunarOverlay.chineseMansion} (determinative ${lunarOverlay.chineseDeterminativeStar}; ${lunarOverlay.chineseBoundaryModel})`,
    ] : []),
  ];
  if (row.godHouse != null) parts.push(`God House ${row.godHouse}`);
  if (row.agentHouse != null) parts.push(`Agent House ${row.agentHouse}`);
  if (row.retrograde && !NODE_NAME.test(row.name)) parts.push("retrograde");
  if (row.uncertainty) parts.push(`Moon uncertainty: ${row.uncertainty.label}`);
  const stars = row.royalStarContacts as unknown;
  if (Array.isArray(stars) && stars.length)
    parts.push(`Royal Star contacts: ${JSON.stringify(stars)}`);
  return `- ${parts.join("; ")}`;
}

function buildEvidenceSheet(chart: ChartResult, mode: ReadingMode) {
  const input = chart.input;
  const lines: string[] = [
    "CHART EVIDENCE SHEET (the only source of chart facts)",
    `Birth: ${input.location}, ${input.date} ${input.time ?? ""} (${input.timezone})`,
    `Frame: worldview ${chart.worldview}; scope ${chart.readingScope}; ${chart.agentViewAvailable ? "personal (Agent) houses available" : "no Ascendant or Midheaven, because birth time/location is not exact"}`,
    "",
    "Angles:",
    chart.ascendant ? rowLine(chart.ascendant) : "- Ascendant: not calculated",
    chart.descendant
      ? rowLine(chart.descendant)
      : "- Descendant: not calculated",
    ...(chart.midheaven ? [rowLine(chart.midheaven)] : []),
    "",
    "Lunar nodes (mean nodes are always retrograde, so that carries no meaning):",
    rowLine(chart.northNode),
    rowLine(chart.southNode),
    "",
    "Planets:",
    ...chart.movingBodies.map(row => rowLine(row)),
    "",
    `Fixed stars (backdrop positions): ${chart.frozenStars.map(star => `${star.name} ${star.display}`).join("; ")}`,
    "",
    "Natal aspects: cite only exact natal aspect findings supplied in the Astrology Evidence Packet; do not infer unlisted aspects.",
  ];
  if (mode !== "natal") {
    const zone = input.transitTimezone || input.timezone || "UTC";
    const contacts = chart.transits
      .filter(row => row.natalContacts.length)
      .map(
        row =>
          `- Transit ${row.name}: ${row.natalContacts.map(c => `${c.aspect} natal ${c.natalName} (orb ${c.orb.toFixed(1)}°)`).join(", ")}`
      );
    lines.push(
      "",
      `Transit moment: ${formatInZone(chart.transitDate, zone)}`,
      "Transit planets:",
      ...chart.transits.map(row => rowLine(row, `Transit ${row.name}`)),
      "",
      "Transit contacts to natal points:",
      ...(contacts.length ? contacts : ["- none within the calculation's orb"])
    );
  }
  return lines.join("\n");
}

function knownPoints(chart: ChartResult) {
  const known = new Map<string, string>();
  const natal = [
    ...chart.movingBodies,
    chart.ascendant,
    chart.descendant,
    chart.midheaven,
    chart.northNode,
    chart.southNode,
    ...chart.frozenStars,
  ].filter((row): row is ChartRow => Boolean(row));
  for (const row of natal)
    known.set(
      row.name.toLowerCase(),
      `${row.name} — ${row.display} (house ${row.house})`
    );
  for (const row of chart.transits)
    known.set(
      `transit ${row.name.toLowerCase()}`,
      `Transit ${row.name} — ${row.display} (house ${row.house})`
    );
  return known;
}

// Maps a model-written evidence entry onto a real chart point, and rewrites it from the chart data so facts cannot drift.
function resolvePoint(entry: unknown, known: Map<string, string>) {
  if (typeof entry !== "string") return null;
  const text = entry.trim().toLowerCase();
  const named = known.get(text);
  if (named) return named;
  // Do not accept an invented aspect merely because it starts with "Moon".
  // Accept only a point name or the exact canonical fact printed on the sheet.
  return Array.from(known.values()).find(value => value.trim().toLowerCase() === text) ?? null;
}

export function evidenceAnchors(packet: AstrologyEvidencePacket, synthesis?: SynthesisResult) {
  const anchors = new Map<string, string>();
  const items = [
    ...packet.genesisAstroEvidence,
    ...packet.patternEvidence,
    ...packet.behavioralEvidence,
    ...packet.lifeEventEvidence,
    ...packet.westernEvidence,
    ...packet.vedicEvidence,
    ...packet.arabicEvidence,
    ...packet.timingEvidence,
    ...packet.fixedStarEvidence,
    ...packet.lunarEvidence,
    ...packet.canonEvidence,
    ...packet.uncertainties,
  ];
  const subjectCounts = new Map<string, number>();
  for (const item of items) {
    const subject = item.subject.trim().toLowerCase();
    subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
  }
  for (const item of items) {
    const subject = item.subject.trim().toLowerCase();
    // A subject can name multiple independent testimonies: never silently pick one.
    if (subjectCounts.get(subject) === 1) anchors.set(subject, item.statement);
    anchors.set(item.id.trim().toLowerCase(), item.statement);
    anchors.set(item.statement.trim().toLowerCase(), item.statement);
  }
  // Include exactly the finding and Canon IDs that runInterpretation sends.
  // Repeated subject names remain ambiguous; exact IDs are always usable.
  const add = (id: string, statement: string) => {
    if (id.trim() && statement.trim()) anchors.set(id.trim().toLowerCase(), statement);
  };
  for (const method of synthesis?.methodOutcomes ?? []) {
    for (const finding of method.findingJudgments) {
      add(finding.id, finding.judgment);
      for (const id of finding.evidenceIds) {
        const calculated = method.calculatedFindings.find(item => item.evidenceId === id);
        add(id, calculated ? `${calculated.label}: ${calculated.calculatedValue}` : finding.judgment);
      }
    }
    for (const finding of method.calculatedFindings) add(finding.evidenceId, `${finding.label}: ${finding.calculatedValue}`);
  }
  for (const rule of synthesis?.canonApplications ?? []) add(rule.canonEvidenceId, rule.statement);
  return anchors;
}

function resolveSemanticEvidence(entry: string, semantic: Map<string, string>) {
  const text = entry.trim().toLowerCase();
  const exact = semantic.get(text);
  if (exact) return exact;
  const tokens = text
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(token => token && token !== "in" && token !== "the");
  if (!tokens.length) return null;
  for (const [key, value] of Array.from(semantic.entries())) {
    const keyTokens = key
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(token => token && token !== "in" && token !== "the");
    if (
      keyTokens.length === tokens.length &&
      keyTokens.every(token => tokens.includes(token))
    )
      return value;
  }
  return null;
}

type ReadingPlan = {
  threads: Array<{
    title: string;
    insight: string;
    evidence: string[];
    chapters: string[];
  }>;
  tensions: Array<{ between: string; insight: string; evidence: string[] }>;
  chapters: Record<string, { angle: string; evidence: string[] }>;
};

export function validatePlan(
  raw: string,
  known: Map<string, string>,
  semantic: Map<string, string>
): ReadingPlan | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data: any;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const chapterIds = new Set<string>(
    READING_CHAPTERS.map(chapter => chapter.id)
  );
  const clean = (list: unknown) => {
    const out = new Set<string>();
    for (const entry of Array.isArray(list) ? list : []) {
      const semanticHit = typeof entry === "string" ? resolveSemanticEvidence(entry, semantic) : null;
      const hit = semanticHit ?? resolvePoint(entry, known);
      if (hit) out.add(hit);
      // Unknown evidence is not a chart fact: never carry it into the validated plan.
    }
    return Array.from(out);
  };
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const chapterAliases: Record<string, string> = {
    "mind-heart": "family-roots",
    destiny: "turning-points",
    mirror: "blessings-lessons",
  };
  const resolveChapterId = (rawId: unknown): string | null => {
    if (typeof rawId !== "string") return null;
    if (chapterIds.has(rawId)) return rawId;
    const mapped = chapterAliases[rawId];
    return mapped && chapterIds.has(mapped) ? mapped : null;
  };
  const threads = (Array.isArray(data.threads) ? data.threads : [])
    .map((thread: any) => ({
      title: text(thread?.title),
      insight: text(thread?.insight),
      evidence: clean(thread?.evidence),
      chapters: (Array.isArray(thread?.chapters) ? thread.chapters : [])
        .map(resolveChapterId)
        .filter((id: string | null): id is string => Boolean(id)),
    }))
    .filter(
      (thread: { title: string; insight: string; evidence: string[]; chapters: string[] }) =>
        thread.title && thread.insight && thread.evidence.length && thread.chapters.length
    );
  const tensions = (Array.isArray(data.tensions) ? data.tensions : [])
    .map((tension: any) => ({
      between: text(tension?.between),
      insight: text(tension?.insight),
      evidence: clean(tension?.evidence),
    }))
    .filter(
      (tension: { between: string; insight: string; evidence: string[] }) =>
        tension.between && tension.insight && tension.evidence.length
    );
  const chapters: ReadingPlan["chapters"] = {};
  const rawChapters = data.chapters ?? {};
  for (const [rawId, item] of Object.entries(rawChapters)) {
    const id = resolveChapterId(rawId);
    if (!id || chapters[id]) continue;
    const evidence = clean((item as any)?.evidence);
    if (item && text((item as any).angle) && evidence.length) {
      chapters[id] = { angle: text((item as any).angle), evidence };
    }
  }
  if (threads.length < 2 || Object.keys(chapters).length < 4) return null;
  return { threads, tensions, chapters };
}

function chapterPlan(analysis: string, chapterId: string) {
  if (!analysis) return "";
  let plan: ReadingPlan;
  try {
    plan = JSON.parse(analysis) as ReadingPlan;
  } catch {
    return "";
  }
  const isSynthesis = chapterId === "blessings-lessons" || chapterId === "mirror";
  const threads = isSynthesis
    ? plan.threads
    : plan.threads.filter(thread => thread.chapters.includes(chapterId));
  const mine = plan.chapters[chapterId];
  const out = [
    "READING PLAN (decided after reading the whole chart; follow it)",
  ];
  if (threads.length)
    out.push(
      isSynthesis
        ? "All threads to weave together:"
        : "Threads this chapter carries:",
      ...threads.map(
        thread =>
          `- ${thread.title}: ${thread.insight} Evidence: ${thread.evidence.join("; ")}.`
      )
    );
  if (plan.tensions.length)
    out.push(
      "Tensions in the chart:",
      ...plan.tensions.map(
        tension =>
          `- ${tension.between}: ${tension.insight} Evidence: ${tension.evidence.join("; ")}.`
      )
    );
  if (mine && !isSynthesis)
    out.push(
      `Evidence that is the main subject of THIS chapter: ${mine.evidence.join("; ")}.`,
      `Angle for this chapter: ${mine.angle}`,
      "Other chapters own the remaining placements. Mention one of them here only briefly, to connect threads."
    );
  if (isSynthesis)
    out.push(
      "This synthesis chapter owns no single placement of its own. It names where life flows naturally, where the hardest lessons repeat, what the reader contributes to trouble, and honest practical direction."
    );
  return out.join("\n");
}

const ANALYSIS_SYSTEM = `You are the silent first reader of a calculated astrology chart. No one will see your output. It is a reading plan that chapter writers will follow, so make it exact and useful.

Read the whole evidence sheet before deciding anything. Genesis is a mandatory core evidence layer, not an optional tradition: the Genesis Astro Engine, Genesis Pattern Engine, and Genesis Yoga Detector must be evaluated on every applicable astrology reading before you prioritize the narrative. Never omit, bypass, or downgrade Genesis because the question appears focused on another tradition. The Question Planner controls emphasis only after Genesis has been evaluated; it may classify a Genesis finding as primary, supporting, contextual, or non-decisive, but it may not declare the Genesis layer irrelevant. Find the 4 to 6 main threads of this chart: evidence that repeats, angular emphasis, the nodal axis, close star contacts, Genesis patterns and activations, yogas, and in transit modes the strongest contacts. Find 2 to 4 real tensions: places where two parts of the chart pull against each other. Then assign evidence to the 12 reading chapters so the chapters do not overlap: each placement is the main subject of at most one chapter. The blessings-lessons synthesis chapter owns no isolated evidence of its own.

Rules: use only what the sheet states. Never invent an aspect, house, sign, star contact, or medical diagnosis; natal-to-natal aspects are permitted only when explicitly calculated in the Astrology Evidence Packet. Evidence entries may reference exact chart points from the sheet, such as "Sun", "Moon", "Ascendant", "North Node", "Regulus", or "Transit Saturn", or any calculated evidence label explicitly stated in the Astrology Evidence Packet, such as a Genesis pattern, activation, archetype, yoga, or cross-system convergence. Preserve the selected evidence label; do not discard it merely because it is not a single point name. Write insights as plain, direct hypotheses about ordinary human life—never psychiatric jargon.

Return ONLY valid JSON, no markdown fence, in this shape:
{"threads":[{"title":"","insight":"","evidence":["Sun"],"chapters":["identity"]}],"tensions":[{"between":"","insight":"","evidence":["Moon"]}],"chapters":{"identity":{"angle":"what this chapter should uniquely say","evidence":["Sun"]},"money-wealth":{"angle":"","evidence":[]},"relationships":{"angle":"","evidence":[]},"family-roots":{"angle":"","evidence":[]},"work-purpose":{"angle":"","evidence":[]}}}`;

async function analyzeChart(
  chart: ChartResult,
  synthesis: SynthesisResult,
  mode: ReadingMode,
  evidencePacket: AstrologyEvidencePacket,
  synthesisContext = ""
) {
  const known = knownPoints(chart);
  const semantic = evidenceAnchors(evidencePacket, synthesis);
  const messages: Message[] = [
    {
      role: "system",
      content: buildAstrologyInterpreterSystem(ANALYSIS_SYSTEM),
    },
    {
      role: "user",
      content: `${MODE_GUIDANCE[mode]}\n\nChapters:\n${READING_CHAPTERS.map(chapter => `${chapter.id}: ${chapter.title}. ${chapter.focus}`).join("\n")}\n\n${buildEvidenceSheet(chart, mode)}\n\n${stringifyEvidence(evidencePacket)}\n\n${synthesisContext}\n\nVALID EVIDENCE LABELS (copy exact IDs; do not invent or shorten them):\n${JSON.stringify([...Array.from(known.keys()), ...Array.from(semantic.keys())].filter(label => label.length <= 180))}\n\nWrite the reading plan JSON now.`,
    },
  ];
  let firstError = "";
  let firstResponse = "";
  try {
    firstResponse = await ask(synthesis, "READING_PLAN", messages, 6500);
    const plan = validatePlan(firstResponse, known, semantic);
    if (plan) return JSON.stringify(plan);
    firstError = "READING_PLAN_INVALID: Fewer than two evidence-backed threads or four supported chapters.";
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Provider routing already exhausted configured fallbacks. A second identical
    // request cannot repair a network/auth/capacity failure or missing output.
    throw new Error(`READING_PLAN_FAILED: ${reason}`, { cause: error });
  }
  console.warn("[READING_PLAN] First attempt failed; requesting a single evidence-grounded repair:", firstError);
  try {
    const repairMessages: Message[] = [
      ...messages,
      { role: "assistant", content: firstResponse || "(no valid plan returned)" },
      { role: "user", content: `Repair the reading plan using only evidence labels from the supplied chart. Return valid JSON only, with at least two evidence-backed threads and four chapters with verified evidence. Remove unsupported evidence rather than inventing it. Preserve all relevant traditions. Previous validation failure: ${firstError.slice(0, 350)}` },
    ];
    const repaired = await ask(synthesis, "READING_PLAN_REPAIR", repairMessages, 6500);
    const plan = validatePlan(repaired, known, semantic);
    if (plan) return JSON.stringify(plan);
    throw new Error("READING_PLAN_INVALID: Repaired plan still lacks sufficient verified evidence.");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[READING_PLAN_FAILED]", { firstError, repairError: reason, mode, knownEvidence: known.size, semanticEvidence: semantic.size });
    throw new Error(`READING_PLAN_FAILED: ${reason.slice(0, 280)}`);
  }
}

function chapterSystem(
  mode: ReadingMode,
  chapter: { title: string; subtitle: string; focus: string }
) {
  return buildAstrologyInterpreterSystem(
    FULL_SYNTHESIS_STYLE,
    [
      `You write one section/chapter of an intimate, candid second-person life portrait. Focus: ${chapter.title} — ${chapter.focus}.`,
      `SILENT FACTS & FULL-CHART DISCIPLINE
- Read the supplied evidence sheet, Genesis activations/patterns/yogas, and reading plan silently. Never recalculate, fill in missing data, or invent a placement, aspect, biography, medical diagnosis, secret, or another person's motives. If a factor is marked not calculated, continue with the available evidence.
- Stay consistent with every fact in earlier chapters. Unify all layers (rulerships, aspects, dignities, mansions, Lots, timing cycles, and frame differences) silently into ordinary human behavior—never print astrological jargon or mechanical frame strings.
- ${MODE_GUIDANCE[mode]}`,
      `METHOD & PROSE FORMATTING
- Follow the reading plan: weave the threads and evidence assigned to this chapter into one lived portrait. Never repeat what earlier chapters already said.
- Start with the strongest pattern that answers this chapter's focus. Show what the reader does when that pattern is active, what they are trying to protect or get, and how their behavior lands with other people, with concrete everyday specificity.
- Give natural gifts (what comes easily, what they enjoy for its own sake, what others rely on them for) the same weight as difficult patterns (what they struggle to ask for, where loyalty feels uncertain, what they carry alone because they expect others to drop it).
- Use short, bold section titles specific to this reader and topic—skip boilerplate headers, stock titles, stock transitions, generic encouragement, and recap endings.
- Write in flowing paragraphs with varied length, rhythm, and openings. Use no bullet-point lists of traits. Keep ALL astrology terminology out of the reader-facing text, including the titles (never name planets, zodiac signs, houses, degrees, aspects, lunar mansions or stations, bounds, faces, or Lots). End with a sentence that belongs strictly to this reader and this chart.`,
    ].join("\n\n")
  );
}

export async function generateInterpretation(
  chart: ChartResult,
  mode: ReadingMode = "combined",
  question = "What should I understand from this chart?",
  synthesisContext = ""
) {
  const master = await buildMasterPipeline(chart, mode, question);
  const masterContext = formatCompactMasterGateContext(master);
  const evidencePacket = buildAstrologyEvidencePacket(chart, question, mode);
  const intelligence = `${masterContext}\n\n${buildChartMap(chart, mode)}\n\n${formatCompactEvidencePacket(evidencePacket)}\n\n${synthesisContext}`;
  const analysis = await analyzeChart(chart, master.synthesis, mode, evidencePacket, synthesisContext);
  const narrated = await narrateMasterSynthesis(master.synthesis, question, formatCompactEvidencePacket(evidencePacket));
  const reading = narrated.narrative.answer;
  return {
    masterSnapshot: master.snapshot,
    masterSynthesis: narrated,
    intelligence,
    evidencePacket,
    behavioralReport: evidencePacket.behavioralReport,
    analysis,
    reading,
    generatedAt: new Date().toISOString(),
    chapters: READING_CHAPTERS.map(chapter => ({
      ...chapter,
      status: "pending" as const,
    })),
  };
}
export async function generateChapter(
  chart: ChartResult,
  mode: ReadingMode,
  intelligence: string,
  chapterId: ReadingChapterId | string,
  completedChapters: string[] = [],
  analysis = "",
  question = "",
  synthesisContext = ""
) {
  const legacyAliases: Record<string, ReadingChapterId> = {
    "mind-heart": "family-roots",
    destiny: "turning-points",
    mirror: "blessings-lessons",
  };
  const resolvedId = (legacyAliases[chapterId] ?? chapterId) as ReadingChapterId;
  const chapter = READING_CHAPTERS.find(item => item.id === resolvedId);
  if (!chapter) throw new Error("That reading chapter is not available.");
  const master = await buildMasterPipeline(chart, mode, question || chapter.title);
  const masterContext = formatCompactMasterGateContext(master);
  const evidencePacket = buildAstrologyEvidencePacket(
    chart,
    `${question ? `User question: ${question}\n\n` : ""}Chapter focus: ${chapter.title}. ${chapter.focus}`,
    mode
  );
  const facts = `${masterContext}\n\n${buildEvidenceSheet(chart, mode)}\n\n${formatCompactEvidencePacket(evidencePacket)}\n\n${synthesisContext}`;
  const condensedChapters = completedChapters.map((c, idx) =>
    idx < completedChapters.length - 2 && c.length > 1600
      ? c.slice(0, 1500) + "…"
      : c
  );
  const isSynthesisChapter = resolvedId === "blessings-lessons";
  const context = condensedChapters.length
    ? `Already written chapters, below. Do not repeat any point, placement meaning, scene, or advice already made in them. Stay consistent with every fact they state, and put new weight on evidence they left untouched.${isSynthesisChapter ? " This is the final synthesis chapter: connect the whole chart into your greatest blessings, hardest recurring lessons, and where to go from here. Do not re-list raw evidence." : ""}\n\n${condensedChapters.join("\n\n---\n\n")}`
    : "This is the opening chapter; establish the real human portrait cleanly.";

  try {
    const text = await ask(
      master.synthesis,
      "READING_CHAPTER",
      [
        { role: "system", content: chapterSystem(mode, chapter) },
        {
          role: "user",
          content: `${facts}\n\n${chapterPlan(analysis, resolvedId)}\n\n${context}\n\nWrite the complete ${chapter.title} chapter now.`,
        },
      ],
      3800,
      1500
    );
    if (text && text.trim().length > 200) {
      return text;
    }
  } catch (err) {
    console.error(`[generateChapter] Synthesized chapter unavailable for ${resolvedId}:`, err);
    throw err;
  }

  throw new Error("READING_CHAPTER_INCOMPLETE: The provider returned fewer than 200 characters; retry this chapter.");
}
export async function followUp(
  chart: ChartResult,
  interpretation: { intelligence: string; reading: string },
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  mode: ReadingMode = "combined"
) {
  const master = await buildMasterPipeline(chart, mode, question);
  const masterContext = formatCompactMasterGateContext(master);
  const evidencePacket = buildAstrologyEvidencePacket(chart, question, mode);
  const trimmedIntelligence =
    interpretation.intelligence.length > 16000
      ? interpretation.intelligence.slice(0, 16000) + "…"
      : interpretation.intelligence;
  const trimmedReading =
    interpretation.reading.length > 12000
      ? interpretation.reading.slice(0, 12000) + "…"
      : interpretation.reading;
  const messages: Message[] = [
    {
      role: "system",
      content: buildAstrologyInterpreterSystem(
        `${COSMOLOGY}\n${WORLDVIEW_GUIDANCE}\n${MODE_GUIDANCE[mode]}\n${CLARITY_FRAMEWORK}\nAnswer follow-up questions in the same intimate, candid, plainspoken second-person voice: read the full calculated chart silently, show what the reader actually does, what they are protecting or trying to get, and how it lands with other people, and keep ALL astrology terminology out of the reader-facing text and titles (never name planets, zodiac signs, houses, degrees, aspects, lunar mansions or stations, bounds, faces, or Lots). Give natural gifts the same weight as difficult patterns, use flowing paragraphs with no bullet-point lists of traits, and never invent biographical events, diagnoses, secrets, or another person's motives. If a needed calculation was not supplied, say: "That factor was not supplied by the calculation engine, so I cannot use it reliably."`
      ),
    },
    {
      role: "user",
      content: `${masterContext}\n\nChart facts:\n${JSON.stringify(chartFacts(chart, mode))}\n\n${formatCompactEvidencePacket(evidencePacket)}\n\nChart Intelligence:\n${trimmedIntelligence}\n\nGenerated reading:\n${trimmedReading}`,
    },
    ...withCurrentQuestion(history, question, 12),
  ];
  return ask(master.synthesis, "READING_FOLLOW_UP", messages, 5000, 1800);
}
