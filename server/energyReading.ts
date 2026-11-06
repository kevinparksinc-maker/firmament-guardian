import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChartResult } from "./astronomy";
import { calculateEnergyRead } from "../shared/energyScoring";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { invokeLLM } from "./_core/llm";

const readingSchema = z.object({
  headline: z.string().trim().min(10).max(240),
  paragraphs: z
    .array(
      z.object({
        text: z.string().trim().min(80).max(2200),
        contactIds: z.array(z.string()).min(1),
        methodIds: z.array(z.string()).min(1),
      })
    )
    .min(3)
    .max(6),
  methodsReviewed: z.array(z.string()),
});

type Synthesis = Awaited<
  ReturnType<typeof synthesizeChartForReading>
>["synthesis"];
type Score = NonNullable<ReturnType<typeof calculateEnergyRead>>;
export function validateEnergyReading(
  raw: unknown,
  score: Score,
  synthesis: Synthesis
) {
  const reading = readingSchema.parse(raw);
  const contacts = new Set(score.contacts.map(c => c.id));
  const methods = new Set(synthesis.methodFindings.map(m => m.id));
  const reviewed = new Set(reading.methodsReviewed);
  if (
    reviewed.size !== methods.size ||
    Array.from(methods).some(id => !reviewed.has(id))
  )
    throw new Error(
      "ENERGY_SYNTHESIS_INCOMPLETE: Every method must be reviewed before output."
    );
  for (const paragraph of reading.paragraphs) {
    if (
      paragraph.contactIds.some(id => !contacts.has(id)) ||
      paragraph.methodIds.some(id => !methods.has(id))
    )
      throw new Error(
        "ENERGY_SYNTHESIS_UNGROUNDED: Reading cites unavailable contacts or methods."
      );
  }
  const cited = new Set(reading.paragraphs.flatMap(p => p.contactIds));
  for (const group of [score.harmonious, score.challenging]) {
    if (group.length && !group.some(c => cited.has(c.id)))
      throw new Error(
        "ENERGY_SYNTHESIS_INCOMPLETE: Reading must address both scored support and pressure."
      );
  }
  return reading;
}

/** No Energy prose or scores leave this path until calculated synthesis passes. */
export async function generateEnergyReading(chart: ChartResult) {
  const { synthesis, canonicalChart } = await synthesizeChartForReading(
    chart,
    "combined",
    "Synthesize my current personal energy, support, pressure and concrete consequences today."
  );
  const score = calculateEnergyRead(canonicalChart);
  if (!score)
    throw new Error(
      "ENERGY_SYNTHESIS_MISSING: A natal plus transit chart is required."
    );
  if (!score.contactsCount)
    return {
      snapshotId: synthesis.snapshotId,
      moment: canonicalChart.transitDate,
      score,
      headline: "No personal contacts within 5°",
      paragraphs: [],
      methodsReviewed: synthesis.methodFindings.map(m => m.id),
    };
  const result = await invokeLLM({
    max_tokens: 2400,
    timeoutMs: 180_000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildAstrologyInterpreterSystem(
          `Write the final compact Energy overview, 3–6 connected paragraphs, about 300–450 words total. This is the final synthesis before the user's scores and chart evidence are displayed. Read ALL supplied Master method findings and Canon applications. Explain the dominant interaction, how actual placements and available conditions modify the strongest personal transit contacts, their concrete consequences, and how specific support interacts with specific pressure. Distinguish event houses from natal houses, God from Agent, and transient conditions from natal traits. Do not invent easing windows without forecast evidence. Do not substitute planet dictionaries, aspect slogans, a method inventory, repeated advice, a life story, or percentages alone for synthesis. Explain both support and friction without forcing a happy resolution. Return JSON {"headline":"...","paragraphs":[{"text":"...","contactIds":["exact supplied contact ID"],"methodIds":["exact supplied method ID"]}],"methodsReviewed":["every supplied method ID, including unavailable statuses"]}. Every paragraph must connect actual contacts to method findings; list only the methods used in that paragraph. Scores are model weights, never event probabilities.`
        ),
      },
      {
        role: "user",
        content: JSON.stringify({
          // Preserve every method and Canon application once. The bridge's prose
          // repeats raw findings inside themes and can exceed provider context limits.
          synthesis: {
            snapshotId: synthesis.snapshotId,
            qualityAudit: synthesis.qualityAudit,
            methodFindings: synthesis.methodFindings,
            canonApplications: synthesis.canonApplications,
            themes: synthesis.themes.map(theme => ({
              id: theme.id,
              humanTheme: theme.humanTheme,
              consequences: theme.consequences,
              deeperMeaning: theme.deeperMeaning,
              evidenceIds: theme.evidenceIds,
            })),
            contradictionsAndTensions: synthesis.contradictionsAndTensions,
          },
          moment: canonicalChart.transitDate,
          natal: {
            location: canonicalChart.input.location,
            planets: canonicalChart.movingBodies,
            ascendant: canonicalChart.ascendant,
          },
          transit: {
            location: canonicalChart.input.transitLocation,
            planets: canonicalChart.transits,
          },
          score,
        }),
      },
    ],
  });
  const choice = result.choices[0];
  if (!choice || ["length", "max_tokens"].includes(choice.finish_reason ?? ""))
    throw new Error(
      "ENERGY_SYNTHESIS_INCOMPLETE: Provider returned a truncated reading."
    );
  const content = choice.message.content;
  const text =
    typeof content === "string"
      ? content
      : content
          .filter(p => p.type === "text")
          .map(p => (p as { text: string }).text)
          .join("");
  let raw: unknown;
  try {
    raw = JSON.parse(
      text.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "")
    );
  } catch {
    throw new Error(
      "ENERGY_SYNTHESIS_INVALID: Provider returned an unreadable reading."
    );
  }
  return {
    snapshotId: synthesis.snapshotId,
    moment: canonicalChart.transitDate,
    score,
    ...validateEnergyReading(raw, score, synthesis),
  };
}

// Share in-flight requests and reuse the same completed snapshot across Energy tabs.
// Failed requests are evicted so Retry always reaches the pipeline again.
const energyReadings = new Map<
  string,
  { expiresAt: number; promise: ReturnType<typeof generateEnergyReading> }
>();
export async function buildEnergyReading(chart: ChartResult) {
  const key = createHash("sha256").update(JSON.stringify(chart)).digest("hex");
  const cached = energyReadings.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = generateEnergyReading(chart);
  energyReadings.set(key, { expiresAt: Date.now() + 10 * 60_000, promise });
  while (energyReadings.size > 16)
    energyReadings.delete(energyReadings.keys().next().value!);
  try {
    return await promise;
  } catch (error) {
    if (energyReadings.get(key)?.promise === promise)
      energyReadings.delete(key);
    throw error;
  }
}
