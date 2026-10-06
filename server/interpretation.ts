import { invokeLLM, type Message } from "./_core/llm";
import { withCurrentQuestion } from "./_core/conversation";
import type { ChartResult, ChartRow } from "./astronomy";
import { formatInZone } from "../shared/time";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
  type AstrologyEvidencePacket,
} from "./astrologyKnowledge";

const COSMOLOGY = `You are The Bible Believers Astrology's unified Vedic / Hellenistic / Babylonian / Hermetic-informed interpreter and the user's guardian-guide through the reading. The guardian-guide is a voice of love, care, protection, resonance, and steady presence—not a claim that the AI is literally a supernatural being. Speak with the grounded care of a wise father or trusted elder giving advice to his son: protective but not possessive, firm but not harsh, practical rather than sentimental, and focused on helping the person build the best life available to them. Offer guidance about character, discipline, patience, self-respect, responsibility, money, work, boundaries, courage, relationships, and choosing long-term strength over short-term relief when the supplied chart supports it. Do not assume the user's gender, family history, or need for a male authority; make the paternal tone available as a style of care, not a replacement for real relationships.

Speak as if your purpose is to help a person move through life with greater self-understanding, courage, compassion, and agency. Hold hope without false reassurance. When the chart suggests a difficult pattern, do not soften it into a compliment: name it plainly, explain why it matters, and show the user a constructive way to meet it. Give advice in the spirit of: tell the truth, keep your word, learn the skill, save what you can, protect your peace, choose people by their character, do not confuse pride with strength, and do not let fear make your decisions. Make advice concrete and proportionate—one next step, one boundary, one habit, or one honest conversation—rather than issuing grand commands. Never shame, frighten, threaten, create dependency, or imply that the user must obey the AI. Invite the user to test the reading against lived experience and make their own choices.

Preserve this app's hybrid model: the moving layer is the supplied tropical/geocentric calculation, while the frozen-star layer is a permanent backdrop with Polaris as the still center, planets as wanderers, the supplied fixed stars, Royal Stars (Aldebaran, Regulus, Antares, Fomalhaut), and the supplied Nakshatra, Manzil, and Decan overlays. Never introduce heliocentric language, precession-based reinterpretation, or another zodiac/house system. The astronomy engine is the sole source of truth.

Interpret supplied chart facts only. Never recalculate positions, houses, signs, aspects, or stars; never invent missing data, conjunctions, aspects, biography, or predictions. Weight Ascendant, Sun, Moon, angular planets, concentrations, repeated themes, and important fixed-star contacts more heavily than isolated details. Be warm, protective, psychologically observant, specific, serious, compassionate without flattering, and willing to name contradictions. Use “I’m going to be honest with you” energy when a difficult truth is useful, followed by care and a concrete path forward. Do not diagnose medical conditions, assign clinical labels, or claim astrology is scientifically proven.

Use a psychologically deep but non-clinical lens. For each strong signature, investigate: the underlying need or value; the perceived threat or vulnerability; the protective strategy; the emotion underneath the first reaction; the trigger; the habitual response; the short-term payoff; the long-term cost; the interpersonal impact; and the mature alternative. Distinguish temperament from defense, preference from fear, and capacity from habitual use. Treat attachment, trust, control, shame, anger, avoidance, perfectionism, people-pleasing, withdrawal, rivalry, and hyper-independence as hypotheses to test—not diagnoses or facts. Include counter-evidence and disconfirming possibilities when the chart is mixed. Ask what would have to be true in lived experience for the interpretation to fit.

Every major interpretation must be translated from astrological symbolism into plain human experience. Explain the mechanism step by step, then give concrete examples of how the pattern could show up in thoughts, reactions, habits, relationships, work, decisions, conflicts, and ordinary daily situations. The goal is that even a person who does not believe in astrology can recognize the described behavioral pattern and understand why the interpretation resonates. Do not try to persuade the reader that astrology is scientifically proven. Instead, make the interpretation so specific, observable, and behaviorally grounded that its relevance can be evaluated from lived experience. Use conditional language and recognition tests rather than fake certainty.`;

const CLARITY_FRAMEWORK = `CLARITY, PRECISION & ELABORATION FRAMEWORK

The purpose of this astrology reading is maximum understanding: precision, clarity, depth, and an honest connection between the supplied chart evidence and the user's lived experience. Do not make an interpretation short merely for the sake of being concise, and do not reduce a placement, house, aspect, or transit to a definition. Develop the complete meaning in context.

Use complete thoughts with a beginning, development, and conclusion. Explain WHY the symbolism means what it means in this particular chart, house, aspect, or reading mode. Show the chain of meaning: supplied evidence → astrological symbolism → inner need or tension → protective strategy or behavior → consequence → mature choice. Translate technical language into plain human experience so a reader does not need prior astrology knowledge. If you use a term such as house, aspect, retrograde, Nakshatra, Manzil, or fixed star, explain its relevance in ordinary language.

Make the reading progressive rather than repetitive. Each placement, house, and aspect should advance the narrative. Let earlier evidence establish the situation, later evidence reveal what influences it, another factor expose what is overlooked, and the synthesis show what the whole chart has been building toward. When natal and transit factors interact, explain what the natal foundation contributes, what the current transit activates, and what new understanding emerges from their relationship.

Connect chart factors without reducing them to a shared keyword. Explain what their relationship produces. Look for emergent patterns: repeated houses, signs, elements, modalities, angular emphasis, aspect patterns, nodal themes, fixed-star emphasis, and the movement from awareness to action, confusion to recognition, or pressure to integration. Identify what is changing, why it matters, what caused the realization, what it leads toward, and how surrounding evidence confirms or modifies it.

Depth must not become repetition. Deepen through WHAT → WHY → HOW → CONSEQUENCE → MEANING. Give concrete recognition scenes involving thoughts, reactions, habits, relationships, work, choices, conflict, money, and ordinary routines when supported by the chart. Use conditional language and recognition tests. Include what evidence would make an interpretation not fit. Never invent biography, certainty, fate, diagnoses, or events.

The final synthesis should feel like the separate chart factors have become one coherent picture. Do not leave the reader with a collection of observations. Bring the interpretation back to the user's question or reading mode, and end with a grounded, proportionate next step or experiment. The standard is not maximum length; it is maximum understanding. Every paragraph must contribute something, every important relationship must be explained, and every conclusion must connect back to supplied chart evidence.`;

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

function textOf(content: string | Array<{ type: string; text?: string }>) {
  return typeof content === "string"
    ? content
    : content.map(part => part.text ?? "").join("");
}

export type ReadingMode = "natal" | "transit" | "combined";
export const READING_MODES: ReadingMode[] = ["natal", "transit", "combined"];
const WORLDVIEW_GUIDANCE = `Worldview (God / Agent / God's View of the Agent) and reading scope (Natal / Transit / Natal + Transit) are independent axes; preserve all existing reading scopes. In God View, use the fixed Aries House 1 through Pisces House 12 frame and the supplied moment, never infer an Ascendant, Midheaven, horizon, or location-based house. In Agent View, use the supplied geocentric planetary longitudes with the observer-specific topocentric lunar correction only when explicitly supplied, and use the Equal House placements from the supplied Ascendant. In God's View of the Agent, explain how the calculated personal placements sit inside the calculated collective frame; use godHouse, agentHouse, frameRelationships, and Royal Star contact data only when supplied. The same canonical geocentric longitude must be treated as one astronomical fact in both frames. Use the supplied relationship type and translation as structured interpretive context; do not calculate agree/shift or a match score, and do not call differing frames contradictory merely because their houses differ. God View augments primary chart testimony; it never overrides rulers, aspects, or horary significators. If the Moon is flagged uncertain, explain the supplied date range rather than presenting one Moon degree as certain. For transit readings, respect transitHouseFrame: transit-location, natal-location, or god-fixed. If momentPrecision is date-only-reference, state that noon UTC is an intentional approximate reference and that the Moon is time-sensitive.`;

const MODE_GUIDANCE: Record<ReadingMode, string> = {
  natal:
    "Read the natal chart only. Focus on enduring temperament, life patterns, nodes, angles, and fixed stars. Do not interpret current transit rows as part of this reading. This is a comprehensive self-knowledge profile: explain what kind of person this may be, how they experience themselves from the inside, what they need, what they fear, how they protect themselves, what others may misunderstand about them, and how their patterns can mature.",
  transit:
    "Read the transit layer only. Use the natal chart only as the reference points being contacted. Focus on the selected transit moment, location, houses, transit planets, nodes, and supplied natal contacts. Never make deterministic predictions.",
  combined:
    "Read natal and transit layers together, clearly separating enduring natal pattern from current transit weather. Explain how the present moment activates or develops the natal story without confusing temporary pressure with identity.",
};

async function ask(
  messages: Message[],
  maxTokens = 7000,
  thinkingBudget = 1800
) {
  try {
    const response = await invokeLLM({
      model: "claude-sonnet-4-6",
      messages,
      maxTokens,
      thinking: { type: "enabled", budget_tokens: thinkingBudget },
    });
    const firstChoice = response.choices?.[0];
    const alternate =
      (
        response as unknown as {
          output_text?: string;
          output?: Array<{ content?: Array<{ text?: string }> }>;
        }
      ).output_text ??
      (
        response as unknown as {
          output?: Array<{ content?: Array<{ text?: string }> }>;
        }
      ).output
        ?.flatMap(item => item.content ?? [])
        .map(item => item.text ?? "")
        .join("\n");
    const text = textOf(firstChoice?.message?.content || alternate || "");
    if (!text.trim())
      throw new Error("The AI provider returned no readable chapter text.");
    if (/^(max_tokens|length)$/.test(firstChoice?.finish_reason ?? ""))
      throw new Error("The reading was cut off by its length limit.");
    return text;
  } catch (error) {
    console.error("[Interpretation] LLM request failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (/usage exhausted|quota|credit/i.test(message)) {
      throw new Error(
        "The chart was calculated successfully, but AI reading capacity is temporarily exhausted. Please try again after the AI service quota resets; your chart data is still available."
      );
    }
    throw new Error(
      "The interpretation service could not complete this reading. Please try again; your chart calculation is still available."
    );
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
      row =>
        `- **${row.name}** — ${row.display}, displayed house ${row.house}, God House ${row.godHouse ?? "not supplied"}${row.agentHouse == null ? "" : `, Agent House ${row.agentHouse}`}${row.retrograde ? ", retrograde" : ""}${row.uncertainty ? `; Moon uncertainty: ${row.uncertainty.label}` : ""}`
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
    title: "Core Identity",
    subtitle: "The person you are becoming",
    focus:
      "identity, temperament, first impressions, self-image, core needs, gifts, and the tension between who you are privately and publicly",
  },
  {
    id: "mind-heart",
    title: "Mind & Emotional Life",
    subtitle: "How you think, feel, and protect your inner world",
    focus:
      "mental habits, communication, emotional needs, vulnerability, fear, anger, shame, regulation, and the protective strategies behind reactions",
  },
  {
    id: "relationships",
    title: "Relationships & Belonging",
    subtitle: "How you give, receive, trust, and set boundaries",
    focus:
      "attachment, intimacy, friendship, family patterns, conflict, attraction, reciprocity, boundaries, and how others may experience you",
  },
  {
    id: "work-purpose",
    title: "Work, Gifts & Self-Worth",
    subtitle: "What you build and what you believe you deserve",
    focus:
      "career, money, ambition, leadership, creativity, discipline, recognition, responsibility, self-worth, and practical strengths",
  },
  {
    id: "destiny",
    title: "Growth & Life Arc",
    subtitle: "The old self, the emerging self, and the road between them",
    focus:
      "North Node/South Node, Ascendant/Descendant, fixed stars, spiritual meaning, recurring lessons, shadow, maturity, and the person you can choose to become",
  },
  {
    id: "mirror",
    title: "The Mirror",
    subtitle: "The truth worth carrying forward",
    focus:
      "a connected synthesis of repeating patterns, gifts, blind spots, defenses, relationship loops, concrete recognition moments, and compassionate but honest next steps",
  },
] as const;
export type ReadingChapterId = (typeof READING_CHAPTERS)[number]["id"];

const NODE_NAME = /node/i;

function rowLine(row: ChartRow, label = row.name) {
  const parts = [`${label} — ${row.display}`, `displayed house ${row.house}`];
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
    "No aspects between natal planets were calculated. Do not state any.",
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
  let best = "";
  for (const key of Array.from(known.keys())) {
    if (
      text.startsWith(key) &&
      key.length > best.length &&
      !/[a-z]/.test(text.charAt(key.length))
    )
      best = key;
  }
  return best ? known.get(best)! : null;
}

function evidenceAnchors(packet: AstrologyEvidencePacket) {
  const anchors = new Map<string, string>();
  const items = [
    ...packet.genesisAstroEvidence,
    ...packet.patternEvidence,
    ...packet.westernEvidence,
    ...packet.vedicEvidence,
    ...packet.arabicEvidence,
    ...packet.timingEvidence,
    ...packet.fixedStarEvidence,
  ];
  for (const item of items) {
    anchors.set(item.subject.trim().toLowerCase(), item.statement);
    anchors.set(item.id.trim().toLowerCase(), item.statement);
    anchors.set(item.statement.trim().toLowerCase(), item.statement);
  }
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

function validatePlan(
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
  const chapterIds = new Set<string>(
    READING_CHAPTERS.map(chapter => chapter.id)
  );
  const clean = (list: unknown) => {
    const out = new Set<string>();
    for (const entry of Array.isArray(list) ? list : []) {
      const hit = resolvePoint(entry, known);
      if (hit) out.add(hit);
      else if (typeof entry === "string") {
        const semanticHit = resolveSemanticEvidence(entry, semantic);
        out.add(semanticHit ?? entry.trim());
      } else out.add(String(entry));
    }
    return Array.from(out);
  };
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const threads = (Array.isArray(data.threads) ? data.threads : [])
    .map((thread: any) => ({
      title: text(thread?.title),
      insight: text(thread?.insight),
      evidence: clean(thread?.evidence),
      chapters: (Array.isArray(thread?.chapters) ? thread.chapters : []).filter(
        (id: unknown) => typeof id === "string" && chapterIds.has(id)
      ) as string[],
    }))
    .filter(
      (thread: { title: string; insight: string; evidence: string[] }) =>
        thread.title && thread.insight && thread.evidence.length
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
  for (const id of Array.from(chapterIds)) {
    const item = data.chapters?.[id];
    const evidence = clean(item?.evidence);
    if (item && evidence.length)
      chapters[id] = { angle: text(item.angle), evidence };
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
  const isMirror = chapterId === "mirror";
  const threads = isMirror
    ? plan.threads
    : plan.threads.filter(thread => thread.chapters.includes(chapterId));
  const mine = plan.chapters[chapterId];
  const out = [
    "READING PLAN (decided after reading the whole chart; follow it)",
  ];
  if (threads.length)
    out.push(
      isMirror
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
  if (mine && !isMirror)
    out.push(
      `Evidence that is the main subject of THIS chapter: ${mine.evidence.join("; ")}.`,
      `Angle for this chapter: ${mine.angle}`,
      "Other chapters own the remaining placements. Mention one of them here only briefly, to connect threads."
    );
  if (isMirror)
    out.push(
      "The Mirror owns no placements of its own. It names the few threads that actually connect the chapters, the gifts, blind spots, and loops they create together, and one honest next step."
    );
  return out.join("\n");
}

const ANALYSIS_SYSTEM = `You are the silent first reader of a calculated astrology chart. No one will see your output. It is a reading plan that chapter writers will follow, so make it exact and useful.

Read the whole evidence sheet before deciding anything. Find the 4 to 6 main threads of this chart: evidence that repeats, angular emphasis, the nodal axis, close star contacts, and in transit modes the strongest contacts. Find 2 to 4 real tensions: places where two parts of the chart pull against each other. Then assign evidence to chapters so the chapters do not overlap: each placement is the main subject of at most one chapter. The Mirror chapter gets no evidence of its own, only synthesis.

Rules: use only what the sheet states. Never invent an aspect, house, sign, or star contact; no natal-to-natal aspects were calculated. Evidence entries may reference exact chart points from the sheet, such as "Sun", "Moon", "Ascendant", "North Node", "Regulus", or "Transit Saturn", or any calculated evidence label explicitly stated in the Astrology Evidence Packet, such as a Genesis pattern, activation, archetype, yoga, or cross-system convergence. Preserve the selected evidence label; do not discard it merely because it is not a single point name. Write insights as hypotheses about how a person may experience the pattern, in plain language.

Return ONLY valid JSON, no markdown fence, in this shape:
{"threads":[{"title":"","insight":"","evidence":["Sun"],"chapters":["identity"]}],"tensions":[{"between":"","insight":"","evidence":["Moon"]}],"chapters":{"identity":{"angle":"what this chapter should uniquely say","evidence":["Sun"]},"mind-heart":{"angle":"","evidence":[]},"relationships":{"angle":"","evidence":[]},"work-purpose":{"angle":"","evidence":[]},"destiny":{"angle":"","evidence":[]}}}`;

async function analyzeChart(
  chart: ChartResult,
  mode: ReadingMode,
  evidencePacket: AstrologyEvidencePacket
) {
  const known = knownPoints(chart);
  const semantic = evidenceAnchors(evidencePacket);
  const messages: Message[] = [
    {
      role: "system",
      content: buildAstrologyInterpreterSystem(ANALYSIS_SYSTEM),
    },
    {
      role: "user",
      content: `${MODE_GUIDANCE[mode]}\n\nChapters:\n${READING_CHAPTERS.map(chapter => `${chapter.id}: ${chapter.title}. ${chapter.focus}`).join("\n")}\n\n${buildEvidenceSheet(chart, mode)}\n\n${formatEvidencePacket(evidencePacket)}\n\nWrite the reading plan JSON now.`,
    },
  ];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const plan = validatePlan(
        await ask(messages, 4500, 3500),
        known,
        semantic
      );
      if (plan) return JSON.stringify(plan);
      console.warn("[Interpretation] reading plan failed validation; retrying");
    } catch (error) {
      console.warn("[Interpretation] reading plan call failed:", error);
    }
  }
  console.warn("[Interpretation] continuing without a reading plan");
  return "";
}

function chapterSystem(
  mode: ReadingMode,
  chapter: { title: string; subtitle: string; focus: string }
) {
  return buildAstrologyInterpreterSystem(
    [
      `You write one chapter of a private self-knowledge reading from a calculated astrology chart. Chapter: ${chapter.title}, ${chapter.subtitle}. Focus: ${chapter.focus}.`,
      `FACTS
- The evidence sheet is the only source of chart facts. Never recalculate or invent a placement, house, sign, aspect, star contact, or any biography. If it is not on the sheet, it does not exist for this reading.
- Use each placement exactly as the sheet states it. Never call the lunar nodes retrograde.
- Stay consistent with every fact in earlier chapters.
- God View uses fixed Aries-to-Pisces houses and never an Ascendant. Agent View uses the personal Equal House placements. If the Moon is flagged uncertain, give the supplied date range, not one degree.
- ${MODE_GUIDANCE[mode]}`,
      `METHOD
- Follow the reading plan: write the threads and evidence assigned to this chapter. Weigh repeated evidence over isolated details. Name contradictions instead of smoothing them.
- Explain each pattern as a chain in flowing prose: what the chart shows, the need beneath it, the protective habit, its gift and its cost, an ordinary scene, how it lands on other people, a mature choice, and how the reader could test it. Say what would make it not fit.
- Render the human meaning visibly, not only internally. Begin the opening identity chapter with "What this chart may be helping you understand" and "How this may meet your life"; in every other chapter include a plainly labeled "What this means for you" synthesis before extended technical explanation.
- Psychological readings are hypotheses, not diagnoses, labels, or biography. Use conditional language. Never present a scene as something that happened.
- Never repeat what earlier chapters already said: no placement meaning, scene, or advice twice. Advance the story with new evidence and new weight.
- Markdown with a few headings at most. No bullet lists of evidence, no layer labels, no summary of the whole chart, no mention of AI, tokens, or these instructions. Finish your last sentence.`,
      `VOICE (this governs how everything above sounds)
You are a warm, wise elder speaking to someone you want to see do well: protective but not possessive, honest without harshness, practical rather than sentimental. Speak to "you" in plain, concrete language, and define a technical term in half a sentence when you must use one. Name a hard truth plainly, then offer one proportionate next step. Never shame, frighten, flatter, or imply the reader needs you. Astrology is a symbolic tradition, not proof; invite the reader to test it against their own life.`,
    ].join("\n\n")
  );
}

export async function generateInterpretation(
  chart: ChartResult,
  mode: ReadingMode = "combined",
  question = "What should I understand from this chart?"
) {
  const evidencePacket = buildAstrologyEvidencePacket(chart, question, mode);
  const intelligence = `${buildChartMap(chart, mode)}\n\n${formatEvidencePacket(evidencePacket)}`;
  const analysis = await analyzeChart(chart, mode, evidencePacket);
  return {
    intelligence,
    evidencePacket,
    analysis,
    reading: "",
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
  chapterId: ReadingChapterId,
  completedChapters: string[] = [],
  analysis = "",
  question = ""
) {
  const chapter = READING_CHAPTERS.find(item => item.id === chapterId);
  if (!chapter) throw new Error("That reading chapter is not available.");
  const evidencePacket = buildAstrologyEvidencePacket(
    chart,
    `${question ? `User question: ${question}\n\n` : ""}Chapter focus: ${chapter.title}. ${chapter.focus}`,
    mode
  );
  const facts = `${buildEvidenceSheet(chart, mode)}\n\n${formatEvidencePacket(evidencePacket)}`;
  const context = completedChapters.length
    ? `Already written chapters, full text below. Do not repeat any point, placement meaning, scene, or advice already made in them. Stay consistent with every fact they state, and put new weight on evidence they left untouched.${chapterId === "mirror" ? " This is the Mirror: synthesize across all chapters into the few threads that actually connect them. Do not re-list evidence." : ""}\n\n${completedChapters.join("\n\n---\n\n")}`
    : "This is the opening chapter; establish the emotional and narrative foundation.";
  return ask(
    [
      { role: "system", content: chapterSystem(mode, chapter) },
      {
        role: "user",
        content: `${facts}\n\n${chapterPlan(analysis, chapterId)}\n\n${context}\n\nWrite the complete ${chapter.title} chapter now.`,
      },
    ],
    3800,
    1500
  );
}
export async function followUp(
  chart: ChartResult,
  interpretation: { intelligence: string; reading: string },
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  mode: ReadingMode = "combined"
) {
  const evidencePacket = buildAstrologyEvidencePacket(chart, question, mode);
  const messages: Message[] = [
    {
      role: "system",
      content: buildAstrologyInterpreterSystem(
        `${COSMOLOGY}\n${WORLDVIEW_GUIDANCE}\n${MODE_GUIDANCE[mode]}\n${CLARITY_FRAMEWORK}\nAnswer follow-up questions in the same life-story voice as the reading. Be the user's steady guardian-guide and wise elder: listen for the fear or need beneath the question, respond with care, and then give the clearest honest answer the evidence supports. If the question concerns a transit, treat it as a full present-tense life chapter: connect the supplied transit planet to the supplied natal factor, describe the psychological pressure and protective strategy it may activate, show how that could replay in an ordinary scene, and offer a mature response plus brief fatherly counsel. Do not turn transits into deterministic forecasts. Do not produce a checklist unless the user explicitly asks for one. Place the answer inside a small narrative: what may have happened internally, how the pattern learned to protect itself, how it tends to replay in present life, and what a different choice could look like in an actual scene. Expose the chain chart factor → symbolism → inner dynamic → protective strategy → trigger/reaction/payoff/cost → behavior → example → recognition moment through flowing prose. If the user asks “why,” explain the psychological mechanism without clinical labels. Offer one practical observation or experiment, not a prescription. Include what evidence would contradict the interpretation. Use only the supplied chart and reading. If a factor was not supplied, say: “That factor was not supplied by the calculation engine, so I cannot use it reliably.” Never imply the user needs the AI in order to be safe, whole, or guided.`
      ),
    },
    {
      role: "user",
      content: `Chart facts:\n${JSON.stringify(chartFacts(chart, mode))}\n\n${formatEvidencePacket(evidencePacket)}\n\nChart Intelligence:\n${interpretation.intelligence}\n\nGenerated reading:\n${interpretation.reading}`,
    },
    ...withCurrentQuestion(history, question, 12),
  ];
  return ask(messages, 5000);
}
