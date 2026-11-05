import { z } from "zod";
import type { ChartResult } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";

const explanation = z.object({
  what: z.string().min(40),
  why: z.string().min(40),
  how: z.string().min(40),
  consequence: z.string().min(40),
  meaning: z.string().min(40),
  examples: z.array(z.string().min(20)).min(1),
  evidenceIds: z.array(z.string()).min(1),
  linkedMethodIds: z.array(z.string()).min(1),
});
export const chartPageReadingSchema = z.object({
  integrated: explanation,
  bigThree: explanation,
  layers: z.array(explanation.extend({ methodId: z.string() })),
});

/** Reject incomplete responses instead of filling gaps with stock descriptions. */
export function validateChartPageReading(
  value: unknown,
  synthesis: SynthesisResult
) {
  const reading = chartPageReadingSchema.parse(value);
  const computed = synthesis.methodFindings.filter(
    m => m.status === "computed-with-result"
  );
  const methods = new Map(computed.map(m => [m.id, m]));
  const evidence = new Set(computed.flatMap(m => m.evidenceIds));
  const ids = reading.layers.map(layer => layer.methodId);
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== computed.length ||
    ids.some(id => !methods.has(id))
  ) {
    throw new Error(
      "CHART_READING_INCOMPLETE: Every calculated layer must have its own interpretation."
    );
  }
  for (const block of [
    reading.integrated,
    reading.bigThree,
    ...reading.layers,
  ]) {
    if (
      block.evidenceIds.some(id => !evidence.has(id)) ||
      block.linkedMethodIds.some(id => !methods.has(id))
    ) {
      throw new Error(
        "CHART_READING_UNGROUNDED: Reading cites evidence or methods absent from this chart."
      );
    }
    if (methods.size > 1 && new Set(block.linkedMethodIds).size < 2) {
      throw new Error(
        "CHART_READING_DISCONNECTED: Each interpretation must connect at least two calculated methods."
      );
    }
  }
  for (const layer of reading.layers) {
    const method = methods.get(layer.methodId)!;
    if (
      !layer.linkedMethodIds.includes(layer.methodId) ||
      !layer.evidenceIds.some(id => method.evidenceIds.includes(id))
    ) {
      throw new Error(
        `CHART_READING_UNGROUNDED: ${layer.methodId} lacks its own calculated evidence.`
      );
    }
  }
  return reading;
}

export async function buildChartPageReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined"
) {
  const { synthesis, context } = await synthesizeChartForReading(
    chart,
    mode,
    "Explain this entire chart: identity, relationships, purpose, resources, challenges and how all calculated traditions work together."
  );
  const result = await invokeLLM({
    max_tokens: 16000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildAstrologyInterpreterSystem(
          `Write the Chart page's integrated interpretation. Use the supplied Canon and actual calculated evidence. Never paste dictionary descriptions beneath placements. Explain how exact signs, equal houses, rulers, aspects/orbs, elemental-family decans, Vedic/Arabic/Chinese mansions, stars, Lots, strengths, Kabbalah and other computed methods MODIFY each other. Keep God and Agent frames distinct and synthesize their relationship. Identify challenges and concrete consequences; do not invent biography or unavailable calculations. Reference-only and unavailable methods must never be called calculated.\nReturn ONLY JSON with integrated, bigThree, layers. integrated and bigThree are objects with what, why, how, consequence, meaning (each a developed paragraph), examples (concrete behavioral examples), evidenceIds, linkedMethodIds. bigThree must weave Sun, Moon and Ascendant together with their actual supporting layers; explain any unavailable angle explicitly. layers must contain exactly one object per computed-with-result method, with the same fields plus methodId. Each layer explains its specific findings and how at least one OTHER computed method reinforces, modifies or conflicts with them. Use only supplied method/evidence IDs; cite each layer's own evidence and relevant supporting evidence. The integrated section must weave the chart into a coherent interpretation, not list techniques. No canned praise, generic filler, raw JSON inventories or repeating identical paragraphs across layers. BREAK DOWN TO THE CORE: In what, name the central drive, need or conflict and its actual placement. In why, trace the exact sign, house, ruler and supporting method findings that produce that conclusion; explain each technical term in plain language. In how, explain the trigger, internal response, outward behavior, and how reinforcing or conflicting layers change the expression. In consequence, explain concrete benefits, costs, blind spots and self-sabotage where supported. In meaning, explain the deeper connecting principle and specific actions for expressing the pattern constructively. Distinguish a worked behavioral example from a claim about the person’s actual history. Give developed explanations rather than adjective lists or one-line summaries. Include at least two distinct concrete examples per block when the evidence supports them, describing situation, reaction and likely consequence in relevant domains such as relationships, work or money. Explain what each tradition contributes that the others do not; do not equate correspondences with independent corroboration. All five reasoning fields need at least 40 characters and each example at least 20. Include every computed layer even when its findings are difficult to reconcile.`
        ),
      },
      { role: "user", content: context },
    ],
  });
  const choice = result.choices[0];
  if (!choice || choice.finish_reason === "length")
    throw new Error(
      "CHART_READING_INCOMPLETE: Interpretation was truncated; retry the reading."
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
      "CHART_READING_INCOMPLETE: The interpreter returned an unreadable response; retry the reading."
    );
  }
  return { reading: validateChartPageReading(raw, synthesis), synthesis };
}
