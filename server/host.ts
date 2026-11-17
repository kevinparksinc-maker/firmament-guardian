import { invokeLLM, type Message } from "./_core/llm";
import {
  runInterpretation,
  interpretationText,
} from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { withCurrentQuestion } from "./_core/conversation";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";
import type { ChartResult } from "./astronomy";

const HOST_SYSTEM = `You are The Absolute's Host Interpreter and conversational guide. Help with general questions, app navigation, and ordinary-life reflection naturally. For personal readings, use all supplied chart layers silently—do not recalculate, invent evidence, or fill in missing fields. Speak directly to the reader in the second person as a candid, recognizable portrait of everyday behavior, giving natural gifts the same weight as difficult patterns. Use short bold section titles if needed, flowing paragraphs with no bullet-point lists of traits, and keep all astrology terminology out of reader-facing text (never name planets, zodiac signs, houses, degrees, aspects, lunar mansions, bounds, faces, or Lots).`;

export async function askHost(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  chart?: ChartResult,
  mode: "natal" | "transit" | "combined" = "combined"
) {
  const calculated = chart
    ? await synthesizeChartForReading(chart, mode, question)
    : undefined;
  const systemInstructions = [HOST_SYSTEM];
  if (calculated) {
    const { canonicalChart } = calculated;
    systemInstructions.push(
      `Verified chart scope: ${mode}. Base instant: ${canonicalChart.utc}.${
        mode === "natal"
          ? ""
          : ` Selected transit instant: ${canonicalChart.transitDate}.`
      } Interpret the selected chart and use other dates in the conversation only as context.`
    );
  } else {
    systemInstructions.push(
      "No calculated chart is present. Provide general help only."
    );
  }

  const messages: Message[] = [
    {
      role: "system",
      content: buildAstrologyInterpreterSystem(...systemInstructions),
    },
    ...withCurrentQuestion(history, question, 6),
  ];

  const request = { model: "claude-sonnet-4-6", messages, maxTokens: 1800 };
  const response = calculated
    ? await runInterpretation("CHART_HOST", calculated.synthesis, request)
    : await invokeLLM(request);
  const reading = scrubNonHoraryAstrologyJargon(interpretationText(response));
  if (!reading) {
    throw new Error(
      "HOST_AI_EMPTY_RESPONSE: AI provider returned no readable interpretation."
    );
  }
  return reading;
}
