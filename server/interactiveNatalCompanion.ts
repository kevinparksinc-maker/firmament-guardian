import type { Message } from "./_core/llm";
import { runInterpretation, interpretationText } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { PSYCHOLOGICAL_PORTRAIT_PROMPT } from "./master-interpreter";
import { scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";
import type { ChartResult } from "./astronomy";
import {
  mapRequestedPlacementsToCanonicalMeaning,
  extractRequestedActors,
  FULL_CELESTIAL_ENSEMBLE,
  type CanonicalPlacementMapping,
} from "../shared/masterPlanetPersonaConfig";

export interface CompanionChatResponse {
  answer: string;
  suggestedFollowUps: string[];
  focusedPlacements: string[];
}

const COMPANION_CONSTITUTION = `${PSYCHOLOGICAL_PORTRAIT_PROMPT}

INTERACTIVE CONVERSATION RULES:
- You are walking through the reader's chart in direct conversation. Answer their exact question first, drawing on the full calculated dossier silently.
- Keep responses focused (2 to 4 flowing paragraphs). Vary length and openings, use no bullet-point lists of traits, and keep all astrology terminology out of your reply (never name planets, zodiac signs, houses, degrees, aspects, lunar mansions, bounds, faces, or Lots).
- End with a grounded, specific reflective question inviting the reader to notice how this pattern plays out in their everyday life.`;

/**
 * Builds the background astrological context dossier for the AI reasoning engine.
 */
function buildCompanionBackgroundDossier(
  chart: ChartResult,
  question: string,
  mode: "natal" | "transit" | "combined"
): { contextText: string; focusedPlacements: string[] } {
  const requestedActors = extractRequestedActors(question);
  const actorsToInclude = requestedActors.length > 0 ? requestedActors : [...FULL_CELESTIAL_ENSEMBLE];

  const mappings = mapRequestedPlacementsToCanonicalMeaning(chart, actorsToInclude);

  const birthLoc = chart.input?.location || "Unknown Location";
  const birthDate = chart.input?.date || "Unknown Date";
  const birthTime = chart.input?.time || "Unknown Time";

  const placementsSummary = mappings
    .map((m: CanonicalPlacementMapping) => {
      return `[${m.actor.toUpperCase()}]
- Location: ${m.sign} in House ${m.house} (${m.houseArena})
- Character Archetype: ${m.personaArchetype}
- Real-World Core Theme: ${m.realWorldTranslation.coreTheme}
- Real-World Superpower: ${m.realWorldTranslation.strengthAndPower}
- The Trap / Shadow: ${m.realWorldTranslation.humanChallenge}
- Grounded Growth Action: ${m.realWorldTranslation.growthAction}
- Natural Voice: "${m.realWorldTranslation.conversationalProse}"`;
    })
    .join("\n\n");

  const transitsSummary =
    mode !== "natal" && Array.isArray(chart.transits) && chart.transits.length > 0
      ? `CURRENT TRANSIT CONTACTS:\n` +
        chart.transits
          .slice(0, 6)
          .map((t: any) => `- Transit ${t.name} in House ${t.house} (${t.display})`)
          .join("\n")
      : "";

  const contextText = `=== BACKGROUND CHART REASONING DOSSIER (INTERNAL CONTEXT ONLY) ===
User Chart: Born in ${birthLoc} on ${birthDate} at ${birthTime}.
Mode: ${mode}

CANONICAL PLANET PERSONA MAPPINGS:
${placementsSummary}

${transitsSummary}
===================================================================`;

  return {
    contextText,
    focusedPlacements: mappings.map((m: CanonicalPlacementMapping) => m.actor),
  };
}

/**
 * Generates context-aware suggested follow-up questions based on the question and chart.
 */
function generateSuggestedFollowUps(question: string, focusedActors: string[]): string[] {
  const q = question.toLowerCase();

  if (q.includes("career") || q.includes("work") || q.includes("money") || q.includes("purpose")) {
    return [
      "What kind of work environment gives me energy versus burns me out?",
      "How do my finances and earning power connect to my chart?",
      "What is my biggest professional blind spot when dealing with leadership?",
    ];
  }

  if (q.includes("relationship") || q.includes("love") || q.includes("partner") || q.includes("marriage")) {
    return [
      "What repeating pattern in relationships am I ready to break?",
      "What kind of partner genuinely balances my emotional temperament?",
      "How do I show love versus what I secretly need in return?",
    ];
  }

  if (q.includes("moon") || q.includes("emotion") || q.includes("security") || q.includes("feel")) {
    return [
      "What do I actually need emotionally when I feel overwhelmed or misunderstood?",
      "Why do my public competence and my private feelings pull in different directions?",
      "What quiet habit do I fall back on when trust feels uncertain?",
    ];
  }

  if (q.includes("node") || q.includes("rahu") || q.includes("ketu") || q.includes("destiny")) {
    return [
      "What familiar comfort zone is keeping me smaller than I am?",
      "What small risk in daily life actually moves me forward right now?",
      "How does my sense of direction shift over the next few years?",
    ];
  }

  return [
    "Where does that natural gift show up in ways people already rely on me for?",
    "What is the hardest pattern for me to notice while I am inside it?",
    "How does this moment in my life ask me to do things differently?",
  ];
}

/**
 * Deterministic fallback if LLM is temporarily offline or rate-limited.
 */
/**
 * Main entry point for the Interactive Natal Chart Reasoning AI.
 */
export async function interactiveNatalChat(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  chart: ChartResult,
  mode: "natal" | "transit" | "combined" = "natal"
): Promise<CompanionChatResponse> {
  const { contextText, focusedPlacements } = buildCompanionBackgroundDossier(chart, question, mode);
  const messages: Message[] = [
    {
      role: "system",
      content: `${COMPANION_CONSTITUTION}\n\n${contextText}`,
    },
  ];

  // Append recent conversational turns (up to last 8 turns)
  const recentHistory = history.slice(-8);
  for (const h of recentHistory) {
    messages.push({
      role: h.role,
      content: h.content,
    });
  }

  // Append current user question
  messages.push({
    role: "user",
    content: question,
  });

  const { synthesis } = await synthesizeChartForReading(chart, mode, question);
  const response = await runInterpretation("CHART_COMPANION", synthesis, {
    model: "gemini-4-hydrogen",
    messages,
    maxTokens: 1800,
  });
  const answer = scrubNonHoraryAstrologyJargon(interpretationText(response));
  if (!answer) throw new Error("CHART_COMPANION_EMPTY: The provider returned no readable answer.");

  const suggestedFollowUps = generateSuggestedFollowUps(question, focusedPlacements);

  return {
    answer,
    suggestedFollowUps,
    focusedPlacements,
  };
}
