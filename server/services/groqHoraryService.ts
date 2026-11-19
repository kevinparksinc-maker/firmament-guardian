import { ENV } from "../_core/env";
import type { Message } from "../_core/llm";
import { runInterpretation } from "../astrologyKnowledge/synthesis/interpretationPipeline";
import type { SynthesisResult } from "../astrologyKnowledge/synthesis/types";
import type { HoraryChart } from "../horary";

export type GroqHoraryRequest = {
  question: string;
  verdict: string;
  score: number;
  significators: {
    querent: string;
    matter: string;
    moon: {
      sign: string;
      house: number;
      voidOfCourse: boolean;
      status: string;
    };
  };
  threeWheels: {
    godView: {
      summary: string;
      placementsCount: number;
      dominantCondition: string;
    };
    transitMoment: {
      location: string;
      askedAt: string;
      ascendant: string;
      applyingAspects: Array<{ aspect: string; orb: number; phase: string }>;
      perfection: string[];
    };
    natalFoundation?: {
      present: boolean;
      sun?: string;
      moon?: string;
      ascendant?: string;
      contacts: string[];
    };
  };
  technicalEvidence: string;
};

/**
 * Translates the 3-wheel HoraryChart structure (God View, Transit Moment, Natal Foundation)
 * into a structured high-speed prompt formatted specifically for Groq LLM inference.
 */
export function translateHoraryToGroqRequest(chart: HoraryChart): GroqHoraryRequest {
  const primaryRuler = chart.subject === "querent" ? chart.querentRuler : chart.subjectRuler;
  const directAspect = chart.relevantAspects.find(
    aspect =>
      (aspect.first === primaryRuler && aspect.second === chart.topicRuler) ||
      (aspect.first === chart.topicRuler && aspect.second === primaryRuler)
  );

  const godPlacements = chart.godChart.movingBodies;
  const godSummary = `God View encompasses ${godPlacements.length} celestial bodies in the universal geocentric coordinate frame without horizon distortion.`;

  const applyingAspects = chart.relevantAspects
    .filter(a => a.phase === "applying")
    .map(a => ({ aspect: `${a.first} ${a.aspect} ${a.second}`, orb: a.orb, phase: a.phase }));

  const perfectionDesc = chart.traditional.perfection.map(p => p.description);

  const natalFoundation = chart.natalChart
    ? {
        present: true,
        sun: chart.natalChart.movingBodies.find(b => b.name === "Sun")?.display,
        moon: chart.natalChart.movingBodies.find(b => b.name === "Moon")?.display,
        ascendant: chart.natalChart.ascendant?.display,
        contacts: chart.transitChart.transits
          .flatMap(row => row.natalContacts.map(c => `${row.name} ${c.aspect} natal ${c.natalName} (${c.orb}°)`))
          .slice(0, 6),
      }
    : {
        present: false,
        contacts: [],
      };

  return {
    question: chart.question,
    verdict: chart.traditional.judgment.verdict,
    score: chart.traditional.judgment.score,
    significators: {
      querent: primaryRuler,
      matter: chart.topicRuler,
      moon: {
        sign: chart.moon.sign,
        house: chart.moon.house,
        voidOfCourse: chart.traditional.moonStatus.voidOfCourse,
        status: chart.traditional.moonStatus.explanation,
      },
    },
    threeWheels: {
      godView: {
        summary: godSummary,
        placementsCount: godPlacements.length,
        dominantCondition: directAspect ? `${directAspect.first} ${directAspect.aspect} ${directAspect.second}` : "No direct major aspect",
      },
      transitMoment: {
        location: chart.location,
        askedAt: chart.askedAt,
        ascendant: `${chart.ascendant.sign} (${chart.ascendant.display})`,
        applyingAspects,
        perfection: perfectionDesc,
      },
      natalFoundation,
    },
    technicalEvidence: chart.evidenceText,
  };
}

/**
 * Service function that calls Groq directly using the 3-wheel translated request.
 * Completely replaces NVIDIA for Horary inference with sub-2-second response latency.
 */
export async function synthesizeHoraryWithGroq(
  chart: HoraryChart,
  systemPrompt: string,
  synthesis: SynthesisResult,
  timeoutMs = 35_000
): Promise<string> {
  const translated = translateHoraryToGroqRequest(chart);
  const { scrubLeaks } = await import("../astrologyKnowledge/synthesis/narrative");
  const isSelfQuestion = chart.subject === "querent";
  const qa = chart.questionAnalysis;
  const additionalHousesNote = chart.additionalTopicHouses?.length
    ? chart.additionalTopicHouses
        .map(h => `House ${h.actualHouse} (${h.label}, ${h.sign}, ruled by ${h.ruler})`)
        .join("; ")
    : "None";

  const promptContent = [
    `ACTUAL QUESTION: "${translated.question}"`,
    `STEP 1 QUESTION ANALYSIS:`,
    `• Matter subject: ${qa.matterSubject}`,
    `• Outcome sought: ${qa.intendedOutcome}`,
    `• Question type: ${qa.questionType} (${qa.questionType === "open_explanatory" ? "This is a WHAT/WHY/HOW question — answer what is actually happening/needed, do NOT force a yes/no answer." : qa.questionType === "location" ? "This is a WHERE / missing-item question — give practical direction/environment clues instead of forcing yes/no." : "Answer directly with clear conditions."})`,
    `• Interpersonal question?: ${qa.isInterpersonal ? "YES — involves another party." : "NO — this is a non-interpersonal question. Do NOT invent romantic partners, mutual friends, exes, or an imaginary third party!"}`,
    `• House assignment rationale: ${qa.reasoning}`,
    `SUBJECT FRAMING: ${isSelfQuestion ? "The querent is asking for themselves (House 1) about the topic house. Do NOT assume this is a two-person argument or romance unless the question wording explicitly involves another specific person." : `The querent (House 1) is asking about another person (House ${chart.subjectHouse}, ruled by ${chart.subjectRuler}).`}`,
    `PRIMARY & ADDITIONAL SIGNIFICATORS:`,
    `• Querent: House 1 ruler ${chart.querentRuler} | Matter: House ${chart.actualTopicHouse} ruler ${chart.topicRuler}`,
    `• Additional relevant houses: ${additionalHousesNote}`,
    `CALCULATED VERDICT: ${translated.verdict} (score: ${translated.score})`,
    "",
    "--- 3-WHEEL CONCENTRIC REASONING STRUCTURE ---",
    `RING 1 (GOD VIEW - UNIVERSAL SKY):`,
    `• ${translated.threeWheels.godView.summary}`,
    `• Universal alignment: ${translated.threeWheels.godView.dominantCondition}`,
    "",
    `RING 2 (TRANSIT MOMENT - HOW THE MATTER UNFOLDS):`,
    `• Question Time & Place: ${translated.threeWheels.transitMoment.askedAt} in ${translated.threeWheels.transitMoment.location}`,
    `• Ascendant (Agent Horizon): ${translated.threeWheels.transitMoment.ascendant}`,
    `• Querent Lord: ${translated.significators.querent} | Matter Lord: ${translated.significators.matter}`,
    `• Moon: ${translated.significators.moon.sign} in House ${translated.significators.moon.house} (Void of Course: ${translated.significators.moon.voidOfCourse})`,
    `• Unfolding Perfection: ${translated.threeWheels.transitMoment.perfection.join("; ") || "None"}`,
    "",
    `RING 3 (NATAL FOUNDATION - WHO EXPERIENCES THE PATTERN):`,
    translated.threeWheels.natalFoundation?.present
      ? `• Querent Natal: Sun ${translated.threeWheels.natalFoundation.sun}, Moon ${translated.threeWheels.natalFoundation.moon}, Ascendant ${translated.threeWheels.natalFoundation.ascendant}\n• Active Transit-to-Natal Contacts: ${translated.threeWheels.natalFoundation.contacts.join("; ") || "None in orb"}`
      : `• No natal birth chart supplied. Reading evaluates universal and question-moment layers without inventing natal biography.`,
    "",
    "--- COMPACT JUDGMENT EVIDENCE ---",
    chart.judgmentEvidenceText,
    "",
    // The shared runInterpretation pipeline already injects the complete
    // calculated-method ledger. Sending chart.evidenceText a second time here
    // duplicates extensive testimony and can exceed the provider context budget.
    // The specialized Horary judgment above remains intact.
    "FULL METHOD EVIDENCE: supplied once by the universal synthesis pipeline.",
    "",
    "REQUIRED 4-PART OUTPUT FORMAT — FOLLOW EXACTLY:",
    "Write the reading using ONLY these four markdown headings in order:",
    "## The Answer",
    "Direct, specific answer to what the user actually asked. If the question asks 'what', 'why', or 'how', give a specific explanatory answer—do NOT force a yes/no verdict.",
    "## What Is Happening",
    "Explain the current reality of the situation, the active tension or strength, and what supports or slows it down, written in natural everyday English.",
    "## What Happens Next",
    "Explain what shifts next in practical real-world terms and rough timing window based on the chart's perfection and lunar course.",
    "## What This Means for You",
    "Give grounded, concrete, situation-specific guidance tailored directly to the user's question.",
    "",
    "TONE AND LANGUAGE MANDATE: Write in clear everyday language—do NOT put planetary names, house numbers, degree decimals, dignity labels, Arabic Lots, Mansions, or God/Agent View jargon into the main 4-part reading (all technical details stay in the expandable Evidence box). Never contradict the calculated significators, never treat a solo project, creative launch, app, career move, or financial question as a two-person relationship conflict, never emit shrink-speak/clinical jargon ('emotional regulation', 'protective strategies', 'attachment wounds'), and never pad with empty disclaimers.",
    "Synthesize the 4-part answer now directly to the querent using the 3-wheel evidence above."
  ].join("\n");

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: promptContent },
  ];

  const result = await runInterpretation("HORARY_READING", synthesis, {
    model: ENV.groqModel || "llama-3.3-70b-versatile",
    messages,
    maxTokens: 3200,
    timeoutMs,
  });

  const content = result.choices?.[0]?.message?.content;
  const rawText = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map(part => typeof part === "string" ? part : part.type === "text" ? part.text : "").join("\n")
      : "";

  const text = scrubLeaks(rawText).trim() || rawText;

  if (!text.trim()) {
    throw new Error("GROQ_EMPTY_HORARY_RESPONSE: Groq returned no readable text for this horary chart.");
  }

  return normalizeHoraryReading(text);
}

/**
 * Keep the reader-facing four-part Horary format, but allow common markdown
 * variations (bold headings, optional colons, and heading levels 1-3).
 * An incomplete response is never accepted as a completed interpretation.
 */
export function normalizeHoraryReading(text: string): string {
  const names = ["The Answer", "What Is Happening", "What Happens Next", "What This Means for You"];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const matches: Array<{ index: number; title: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const normalized = lines[i]
      .trim()
      .replace(/^#{1,3}\s*/, "")
      .replace(/^\*\*(.*?)\*\*:?$/, "$1")
      .replace(/:$/, "")
      .trim()
      .toLowerCase();
    const found = names.find(name => name.toLowerCase() === normalized);
    if (found) matches.push({ index: i, title: found });
  }
  if (matches.length !== 4 || names.some((name, i) => matches[i]?.title !== name)) {
    throw new Error("HORARY_READING_INCOMPLETE: The provider omitted or reordered a required section.");
  }
  const bodies = matches.map((match, i) =>
    lines.slice(match.index + 1, matches[i + 1]?.index ?? lines.length).join("\n").trim()
  );
  if (bodies.some(body => body.length < 20)) {
    throw new Error("HORARY_READING_INCOMPLETE: A required section did not contain a substantive answer.");
  }
  return names.map((name, i) => `## ${name}\n\n${bodies[i]}`).join("\n\n");
}
