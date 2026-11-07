import { createHash } from "node:crypto";
import {
  placementRows,
  placementMiniIdentity,
} from "../shared/placementMiniReadings";
import { z } from "zod";
import type { ChartResult, ChartRow } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import {
  synthesizeChartForReading,
  synthesizeMasterSnapshot,
} from "./astrologyKnowledge/synthesis/readingBridge";
import { retrievePlacementDossier } from "./astrologyKnowledge/canon/retriever";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";

const summarySchema = z.object({
  placements: z.array(
    z.object({
      name: z.string(),
      paragraph: z.string().min(120).max(1600),
      evidenceIds: z.array(z.string()).min(2),
      layerIds: z.array(z.string()).min(2),
    })
  ),
});
type Fact = { id: string; layerId: string; value: unknown };

/** Select planet-specific findings once; never ship the 575k-character life-story context. */
export function buildPlacementPackets(
  chart: ChartResult,
  synthesis: SynthesisResult
) {
  const sun = chart.movingBodies.find(p => p.name === "Sun");
  return placementRows(chart).map(row => {
    const dossier = retrievePlacementDossier(
      row,
      chart,
      Boolean(sun && sun.house >= 7)
    );
    const escaped = row.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bodyMatch = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, "i");
    const slug = row.name.toLowerCase().replace(/\s+/g, "-");
    const facts: Fact[] = [
      {
        id: `planet-${slug}`,
        layerId: "western-planets-and-signs",
        value: {
          display: row.display,
          longitude: row.longitude,
          house: row.house,
          godHouse: row.godHouse,
          agentHouse: row.agentHouse,
          retrograde: row.retrograde,
        },
      },
    ];
    const judgments = synthesis.methodOutcomes
      .filter(
        o => o.status === "interpreted" && !o.methodId.startsWith("transit:")
      )
      .flatMap(outcome =>
        outcome.findingJudgments
          .filter(
            f =>
              (!outcome.methodId.includes("dasha-and-ashtakavarga") ||
                f.subject.startsWith("SAV ")) &&
              (bodyMatch.test(f.subject) ||
                f.evidenceIds.some(
                  id => id.includes(`-${slug}-`) || id.endsWith(`-${slug}`)
                ) ||
                f.subject === `House ${row.agentHouse ?? row.house}` ||
                f.subject === `SAV ${row.display.split(" ")[0]}`)
          )
          .map(f => ({
            findingId: f.id,
            methodId: outcome.methodId,
            frame: f.frame ?? outcome.frame,
            judgment: f.judgment,
            mechanism: f.mechanism,
            evidenceIds: f.evidenceIds,
            sources: Array.from(new Set(f.rules.map(r => r.sourceTitle))),
            limitation: f.limitation,
          }))
      );
    if (!judgments.length)
      throw new Error(`PLACEMENT_JUDGMENTS_MISSING: ${row.name}`);
    for (const j of judgments)
      for (const id of j.evidenceIds) {
        if (!facts.some(f => f.id === id && f.layerId === j.methodId))
          facts.push({
            id,
            layerId: j.methodId,
            value: {
              judgment: j.judgment,
              mechanism: j.mechanism,
              frame: j.frame,
              sources: j.sources,
              limitation: j.limitation,
            },
          });
      }
    return {
      name: row.name,
      placementEvidenceId: `planet-${slug}`,
      facts,
      judgments,
      canon: {
        nakshatra: dossier.nakshatraRecord,
        manzil: dossier.manzilRecord,
        decan: dossier.decanRecord
          ? {
              number: dossier.decanRecord.decanNumber,
              elementalFamilyRuler: dossier.decanRecord.triplicitySubRuler,
            }
          : null,
      },
    };
  });
}

/** Retain every relevant judgment once; repeated doctrine is interned losslessly. */
export function packPlacementMiniPrompt(
  packets: ReturnType<typeof buildPlacementPackets>
) {
  const unique = Array.from(
    new Map(
      packets.flatMap(p => p.judgments).map(j => [j.findingId, j])
    ).values()
  );
  const split = (text: string) => text.split(/(?<=[.!?])(?=\s)/);
  const counts = new Map<string, number>();
  for (const j of unique)
    for (const part of split(j.judgment))
      counts.set(part, (counts.get(part) ?? 0) + 1);
  const textTable = Array.from(counts)
    .filter(([part, n]) => part.length >= 60 && n > 1)
    .map(([part]) => part);
  const textIndex = new Map(textTable.map((part, i) => [part, i]));
  const sources = Array.from(new Set(unique.flatMap(j => j.sources)));
  const findingIndex = new Map(unique.map((j, i) => [j.findingId, i]));
  return {
    textTable,
    sources,
    findingColumns: [
      "judgmentParts",
      "methodId",
      "evidenceIds",
      "frame",
      "sourceRefs",
      "limitation",
    ],
    findings: unique.map(j => [
      split(j.judgment).map(part => textIndex.get(part) ?? part),
      j.methodId,
      j.evidenceIds,
      j.frame,
      j.sources.map(s => sources.indexOf(s)),
      j.limitation ?? null,
    ]),
    placements: packets.map(p => ({
      name: p.name,
      position: p.facts[0].value,
      placementEvidenceId: p.placementEvidenceId,
      facts: p.facts.map(f => ({ id: f.id, layerId: f.layerId })),
      findingRefs: p.judgments.map(j => findingIndex.get(j.findingId)),
    })),
  };
}

export function validatePlacementSummaries(
  value: unknown,
  packets: ReturnType<typeof buildPlacementPackets>
) {
  const result = summarySchema.parse(value);
  const expected = new Map(packets.map(p => [p.name, p]));
  if (
    result.placements.length !== expected.size ||
    new Set(result.placements.map(p => p.name)).size !== expected.size
  ) {
    throw new Error(
      "PLACEMENT_SUMMARY_INCOMPLETE: A paragraph is required for each displayed planet."
    );
  }
  for (const placement of result.placements) {
    const packet = expected.get(placement.name);
    if (!packet)
      throw new Error("PLACEMENT_SUMMARY_UNGROUNDED: Unknown planet.");
    const ids = new Set(packet.facts.map(f => f.id));
    const layers = new Set(packet.facts.map(f => f.layerId));
    if (
      placement.evidenceIds.some(id => !ids.has(id)) ||
      placement.layerIds.some(id => !layers.has(id))
    ) {
      throw new Error(
        `PLACEMENT_SUMMARY_UNGROUNDED: ${placement.name} cites unavailable evidence.`
      );
    }
    if (
      placement.paragraph.trim().split(/\s+/).length > 140 ||
      /\n\s*\n/.test(placement.paragraph)
    ) {
      throw new Error(
        `PLACEMENT_SUMMARY_TOO_LONG: ${placement.name} must fit one short paragraph.`
      );
    }
    // Sign/house boilerplate alone cannot pass as a synthesized placement paragraph.
    for (const layer of [
      "vedic-nakshatras-and-padas",
      "arabic-lunar-manazil",
      "elemental-decans",
    ]) {
      if (
        layers.has(layer) &&
        (!placement.layerIds.includes(layer) ||
          !packet.facts.some(
            f => f.layerId === layer && placement.evidenceIds.includes(f.id)
          ))
      ) {
        throw new Error(
          `PLACEMENT_SUMMARY_SHALLOW: ${placement.name} omits its calculated mansion layers.`
        );
      }
    }
    if (!placement.evidenceIds.includes(packet.placementEvidenceId)) {
      throw new Error(
        `PLACEMENT_SUMMARY_UNGROUNDED: ${placement.name} lacks its own placement.`
      );
    }
  }
  return result;
}

const placementCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<Awaited<ReturnType<typeof generatePlacementParagraphs>>>;
  }
>();

export async function buildChartPageReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined"
) {
  const verified = await synthesizeChartForReading(
    chart,
    mode === "transit" ? "combined" : "natal",
    "Compact individual placement card summaries"
  );
  const event = verified.snapshot.transit?.framework;
  if (mode === "transit" && !event)
    throw new Error("TRANSIT_FRAMEWORK_MISSING: Refresh the event chart.");
  const { synthesis, canonicalChart } =
    mode === "transit"
      ? await synthesizeMasterSnapshot(
          event!,
          "natal",
          "Compact event placement card summaries"
        )
      : verified;
  const packets = buildPlacementPackets(canonicalChart, synthesis);
  const key = createHash("sha256")
    .update(
      placementMiniIdentity(chart, mode === "transit" ? "transit" : "natal")
    )
    .digest("hex");
  const cached = placementCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = generatePlacementParagraphs(packets, synthesis);
  placementCache.set(key, { expiresAt: Date.now() + 30 * 60_000, promise });
  while (placementCache.size > 32)
    placementCache.delete(placementCache.keys().next().value!);
  try {
    return await promise;
  } catch (error) {
    if (placementCache.get(key)?.promise === promise)
      placementCache.delete(key);
    throw error;
  }
}

async function generatePlacementParagraphs(
  packets: ReturnType<typeof buildPlacementPackets>,
  synthesis: SynthesisResult
) {
  const result = await invokeLLM({
    max_tokens: 6500,
    timeoutMs: 180_000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildAstrologyInterpreterSystem(
          `Write SHORT Chart page placement cards. Return JSON {"placements":[{"name":"Sun","paragraph":"...","evidenceIds":["..."],"layerIds":["..."]}]}, one entry for EVERY supplied placement, including planets, Nodes and available angles. Each paragraph is 70–110 words, 4–6 connected sentences, maximum 140 words. This is a compact placement interpretation, never a life story, full-chart report, chapter sequence or method inventory. Keep depth by explaining the central drive, a precise modification from its nakshatra/pada AND Arabic manzil AND elemental-family decan, and how the strongest relevant aspect, ruler condition, varga, Ashtakavarga or star finding changes its expression. End with a concrete strength/tension or recognizable consequence. Prioritize Sun equally with Moon; include every supplied placement. Angles describe approach/partnership rather than planetary agency; Nodes describe the nodal axis, never invented essential dignity. The authoritative interpretation input is each packet’s executed method judgments. Synthesize their reinforcement and disagreement into one connected meaning; do not merely concatenate method summaries. Use only supplied facts and retrieved Canon. Do not equate pada and D9 with independent corroboration, invent manzil rulers, conflate essential dignity with Shadbala, or fabricate Chinese-mansion/strength results. Decans use the supplied elemental-family ruler. Event-origin results describe the event sky, never the user’s birth biography. No generic sign/house-only descriptions, repeated boilerplate, predetermined biography or flattering filler. Cite the planet's own evidence ID and the mansion IDs; list all actually used layer IDs. Rely on the same Master Interpreter depth within ONE paragraph per planet.`
        ),
      },
      {
        role: "user",
        content: JSON.stringify({
          scope:
            "Individual placement boxes only; this short format does not apply to full readings",
          chartScope: synthesis.methodOutcomes[0]?.chartScope,
          packets: packPlacementMiniPrompt(packets),
          packetFormat:
            "findingRefs index findings; findingColumns names their cells. In judgmentParts, numbers index textTable and strings are literal text; concatenate in order. sourceRefs index sources. All relevant method judgments are retained. Cite literal evidence IDs in facts, not numeric references.",
          unavailableMethods: synthesis.methodFindings
            .filter(m => m.status !== "computed-with-result")
            .map(m => ({ id: m.id, status: m.status })),
          strengthAvailability: synthesis.methodFindings
            .filter(m => ["vedic-shadbala", "vedic-bhava-bala"].includes(m.id))
            .map(m => ({ id: m.id, status: m.status })),
        }),
      },
    ],
  });
  const choice = result.choices[0];
  if (!choice || ["length", "max_tokens"].includes(choice.finish_reason ?? ""))
    throw new Error("PLACEMENT_SUMMARY_INCOMPLETE: AI response was truncated.");
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
      "PLACEMENT_SUMMARY_INVALID: AI returned an unreadable response."
    );
  }
  const reading = validatePlacementSummaries(raw, packets);
  return {
    snapshotId: synthesis.snapshotId,
    placements: reading.placements.map(p => ({
      ...p,
      evidence: packets
        .find(packet => packet.name === p.name)!
        .facts.filter(f => p.evidenceIds.includes(f.id)),
    })),
  };
}
