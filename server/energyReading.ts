import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import { packCompactSynthesisForLLM } from "./astrologyKnowledge/synthesis/context";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChartResult } from "./astronomy";
import { calculateEnergyRead, calculateIndependentEnergyRead } from "../shared/energyScoring";
import { calculateEnergyStarsAndLots } from "../shared/energyStarsAndLots";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { buildAstrologyInterpreterSystem, MINI_SYNTHESIS_STYLE } from "./master-interpreter";
import { scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";
import { runInterpretation } from "./astrologyKnowledge/synthesis/interpretationPipeline";

const readingSchema = z.object({
  headline: z.string().trim().min(10).max(240),
  paragraphs: z
    .array(
      z.object({
        text: z.string().trim().min(80).max(2200),
        contactIds: z.array(z.string()),
        methodIds: z.array(z.string()).min(1),
        evidenceIds: z.array(z.string()).min(2),
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
  const evidenceByMethod = new Map(synthesis.methodFindings.map(method => [method.id, new Set(method.evidenceIds)]));
  for (const paragraph of reading.paragraphs) {
    if (
      (contacts.size > 0 && paragraph.contactIds.length === 0) ||
      paragraph.contactIds.some(id => !contacts.has(id)) ||
      paragraph.methodIds.some(id => !methods.has(id)) ||
      !paragraph.evidenceIds.some(id => id.startsWith("transit:")) ||
      !paragraph.evidenceIds.some(id => !id.startsWith("transit:")) ||
      paragraph.evidenceIds.some(id => !paragraph.methodIds.some(method => evidenceByMethod.get(method)?.has(id))) ||
      paragraph.methodIds.some(method => !paragraph.evidenceIds.some(id => evidenceByMethod.get(method)?.has(id)))
    )
      throw new Error(
        "ENERGY_SYNTHESIS_UNGROUNDED: Reading cites unavailable contacts or methods."
      );
  }
  const usedMethods = new Set(reading.paragraphs.flatMap(p => p.methodIds));
  const depthMethods = new Set([
    "vedic-nakshatras-and-padas",
    "arabic-lunar-manazil",
    "elemental-decans",
    "fixed-stars-royal-watchers",
  ]);
  const missingDepth = synthesis.methodFindings.filter(
    method =>
      method.status === "computed-with-result" &&
      depthMethods.has(method.id.replace(/^transit:/, "")) &&
      !usedMethods.has(method.id)
  );
  if (missingDepth.length)
    throw new Error(
      `ENERGY_SYNTHESIS_SHALLOW: Reading omits ${missingDepth.map(m => m.id).join(", ")}.`
    );
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
  const starsAndLots = calculateEnergyStarsAndLots(canonicalChart);
  const result = await runInterpretation("ENERGY_SYNTHESIS", synthesis, {
    max_tokens: 3200,
    timeoutMs: 180_000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildAstrologyInterpreterSystem(
          MINI_SYNTHESIS_STYLE,
          `Write the final compact Energy overview: a sharp, plainspoken "headline" plus 3 flowing paragraphs (about 210–300 words total) in candid second-person prose ("you / your"). Start with the strongest pattern shaping today, show what you do when it kicks in, what you are protecting or trying to get, and how your reactions land on people around you. Give natural openings and ease the same weight as pressure or friction. Keep ALL astrology terminology out of "headline" and every paragraph's "text": never name planets, zodiac signs, houses, degrees, orbs, aspects, lunar mansions, decans, fixed stars, or Lots in reader-facing text—keep every calculated method, contact, and citation strictly in the JSON metadata IDs. Return JSON {"headline":"...","paragraphs":[{"text":"...","contactIds":["exact supplied contact ID"],"methodIds":["exact supplied method ID"],"evidenceIds":["exact calculated natal evidence ID","exact calculated transit: evidence ID"]}],"methodsReviewed":["every supplied method ID, including unavailable statuses"]}. Each cited method must own at least one cited evidence ID. Every paragraph must synthesize all relevant supplied layers and cite the exact calculated evidence IDs. Use independentSky as optional environmental context and keep its body-to-body contacts distinct from personal contactIds. When there are zero scored contacts, use empty contactIds and interpret the available method evidence without claiming a scored contact.`
        ),
      },
      {
        role: "user",
        content: stringifyEvidence({
          synthesis: packCompactSynthesisForLLM(synthesis, {
            preserveFullMethodRegistry: true,
          }),
          packetFormat: "judgmentColumns names row cells. sourceRefs index canonApplications. Evidence IDs remain literal strings and must be cited exactly.",
          moment: canonicalChart.transitDate,
          independentSky: calculateIndependentEnergyRead(canonicalChart, "transit"),
          natal: {
            location: canonicalChart.input.location,
            planets: (canonicalChart.movingBodies ?? []).map((p: any) => ({
              name: p.name,
              display: p.display,
              house: p.house,
              godHouse: p.godHouse,
              agentHouse: p.agentHouse,
              retrograde: p.retrograde || undefined,
            })),
            ascendant: canonicalChart.ascendant
              ? { name: canonicalChart.ascendant.name, display: canonicalChart.ascendant.display }
              : null,
          },
          transit: {
            location: canonicalChart.input.transitLocation,
            planets: (canonicalChart.transits ?? []).map((p: any) => ({
              name: p.name,
              display: p.display,
              house: p.house,
              godHouse: p.godHouse,
              agentHouse: p.agentHouse,
              retrograde: p.retrograde || undefined,
            })),
          },
          fixedStarsAndLots: {
            sect: starsAndLots.sect,
            lotsAvailable: starsAndLots.lotsAvailable,
            liveSkyStars: starsAndLots.liveSkyStars.map(s => ({
              bodyName: s.bodyName,
              starName: s.starName,
              isRoyal: s.isRoyal,
              orbDeg: s.orbDeg,
              archetype: s.archetype,
            })),
            natalTriggeredStars: starsAndLots.natalTriggeredStars.map(s => ({
              bodyName: s.bodyName,
              starName: s.starName,
              isRoyal: s.isRoyal,
              orbDeg: s.orbDeg,
              liveTriggerContact: s.liveTriggerContact,
              archetype: s.archetype,
            })),
            activeLotHits: starsAndLots.activeLotHits.map(h => ({
              lot: h.lot.meta.name,
              sign: h.lot.sign,
              house: h.lot.house,
              houseArena: h.lot.houseArena,
              transit: h.aspect.transitPlanet,
              aspect: h.aspect.aspect,
              orbDeg: h.aspect.orbDeg,
              isMajor: h.aspect.isMajor,
              flow: h.aspect.flow,
            })),
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
  const validated = validateEnergyReading(raw, score, synthesis);
  return {
    snapshotId: synthesis.snapshotId,
    moment: canonicalChart.transitDate,
    score,
    ...validated,
    headline: scrubNonHoraryAstrologyJargon(validated.headline) || validated.headline,
    paragraphs: validated.paragraphs.map(p => ({
      ...p,
      text: scrubNonHoraryAstrologyJargon(p.text) || p.text,
    })),
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
  energyReadings.set(key, { expiresAt: Date.now() + 60 * 60_000, promise });
  while (energyReadings.size > 32)
    energyReadings.delete(energyReadings.keys().next().value!);
  try {
    return await promise;
  } catch (error) {
    if (energyReadings.get(key)?.promise === promise)
      energyReadings.delete(key);
    throw error;
  }
}
