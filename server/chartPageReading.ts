import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import { readingProse } from "../shared/readingProse";
import { createHash } from "node:crypto";
import {
  placementRows,
  placementMiniIdentity,
} from "../shared/placementMiniReadings";
import { z } from "zod";
import type { ChartResult, ChartRow } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { buildAstrologyInterpreterSystem, MINI_SYNTHESIS_STYLE } from "./master-interpreter";
import {
  synthesizeChartForReading,
  synthesizeMasterSnapshot,
} from "./astrologyKnowledge/synthesis/readingBridge";
import { retrievePlacementDossier } from "./astrologyKnowledge/canon/retriever";
import { elementalDecanTeaching } from "./astrologyKnowledge/canon/decans36";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";

const summarySchema = z.object({
  placements: z.array(
    z.object({
      name: z.string(),
      paragraph: z
        .string()
        .transform(readingProse)
        .pipe(z.string().min(120).max(1600)),
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
        // Retrieve the applicable foundational meanings locally. Claude
        // synthesizes these completed Canon findings, not the doctrine library.
        planetCore: dossier.planetDoctrine?.coreMeanings,
        planetPsychology: dossier.planetDoctrine?.psychologicalFunctions,
        signQualities: dossier.signDoctrine?.traditionalQualities,
        signTheme: dossier.signDoctrine?.psychologicalTheme,
        houseTopics: dossier.houseDoctrine?.coreTopics,
        houseField: dossier.houseDoctrine?.psychologicalField,
        planetInSign: dossier.planetInSignSynthesis,
        planetInHouse: dossier.planetInHouseSynthesis,
        houseKnowledge: dossier.planetInHouseKnowledge
          ? {
              core: dossier.planetInHouseKnowledge.core,
              challenge: dossier.planetInHouseKnowledge.challenge,
              gift: dossier.planetInHouseKnowledge.gift,
              career: dossier.planetInHouseKnowledge.career,
              relationships: dossier.planetInHouseKnowledge.relationships,
            }
          : null,
        condition: dossier.dignityAndCondition.conditionSummary,
        godToAgent: dossier.godToAgentNote,
        nakshatra: dossier.nakshatraRecord,
        pada: dossier.activePada,
        manzil: dossier.manzilRecord,
        decan: dossier.decanRecord
          ? {
              number: dossier.decanRecord.decanNumber,
              elementalFamilyRuler: dossier.decanRecord.triplicitySubRuler,
              teaching: elementalDecanTeaching(dossier.decanRecord),
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
      canon: p.canon,
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
    promise: Promise<ChartPageReading>;
  }
>();

export type ChartPageReading = {
  snapshotId: string;
  dominantConclusion: string;
  methodOutcomes: SynthesisResult["methodOutcomes"];
  themes: SynthesisResult["themes"];
  methodLedgerSummary: SynthesisResult["methodLedgerSummary"];
  qualityAudit: SynthesisResult["qualityAudit"];
  placements: Array<
    z.infer<typeof summarySchema>["placements"][number] & { evidence: Fact[] }
  >;
};

export async function buildChartPageReading(
  chart: ChartResult,
  mode: "natal" | "transit" | "combined",
  names: string[] = ["Sun", "Moon"]
): Promise<ChartPageReading> {
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
  if (!names.length || names.length > 2 || new Set(names).size !== names.length)
    throw new Error("PLACEMENT_MINI_SCOPE: Request one or two placements.");
  const allPackets = buildPlacementPackets(canonicalChart, synthesis);
  const packets = names.map(name => {
    const packet = allPackets.find(p => p.name === name);
    if (!packet)
      throw new Error(`PLACEMENT_MINI_SCOPE: Unknown placement ${name}`);
    return packet;
  });
  const key = createHash("sha256")
    .update(
      placementMiniIdentity(chart, mode === "transit" ? "transit" : "natal") +
        JSON.stringify(names)
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
): Promise<ChartPageReading> {
  const instruction = buildAstrologyInterpreterSystem(
    MINI_SYNTHESIS_STYLE,
    `Write only the requested placement mini readings. Return JSON {"placements":[{"name":"Sun","paragraph":"...","evidenceIds":["..."],"layerIds":["..."]}]}. Each placement gets ONE connected story-like paragraph addressed directly to the reader as you, 70–110 words, maximum 140 words. Let one sentence lead into the next. Never print bracketed tradition/source/category labels, [TRADITION], MODERN_SYNTHESIS, headings, quotation marks around the reading, or a method inventory. Use the locally retrieved Canon's actual planetary functions, sign qualities, house topics, mansion/pada teachings, decan and calculated method judgments as your authoritative astrological knowledge. Your only job is to weave their interactions into a deeply specific paragraph, not to look up doctrine, rederive calculations, or simply concatenate Canon descriptions. Explain how the supplied layers change one another for this particular placement, with a concrete everyday example. Avoid repeating the same house definition or psychological scaffold across readings. Weave the meaning into a readable personal narrative; sources belong only in evidence. Combine its drive, house, actual nakshatra/pada, Arabic manzil and elemental decan with the relevant conditions/aspects. Read all supplied method outcomes; distinguish support from pressure and explain a concrete consequence. The selected placements' locally retrieved Canon meanings and all applicable calculated judgments are supplied in a compact indexed packet. Read every supplied finding and Canon principle, then synthesize rather than restating the reference text. Use no invented biography, dignity, star contact or missing method. Angles and Nodes are not planets. Event scope describes the event sky, never natal biography. Cite the placementEvidenceId and the exact evidenceIds for the mansion/decan methods and other methods actually used. Include only supplied layerIds. This short output contract applies only to these boxes.`
  );
  const request = {
    max_tokens: 2000,
    timeoutMs: 180_000,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "placement_minis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            placements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", enum: packets.map(p => p.name) },
                  paragraph: { type: "string" },
                  evidenceIds: { type: "array", items: { type: "string" } },
                  layerIds: { type: "array", items: { type: "string" } },
                },
                required: ["name", "paragraph", "evidenceIds", "layerIds"],
                additionalProperties: false,
              },
            },
          },
          required: ["placements"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: "system" as const, content: instruction },
      {
        role: "user" as const,
        content: stringifyEvidence({
          chartScope: synthesis.methodOutcomes[0]?.chartScope,
          question: "Synthesize these requested placements using their local Canon meanings and calculated findings.",
          ...packPlacementMiniPrompt(packets),
        }),
      },
    ],
  };
  const result = await invokeLLM(request);
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
    dominantConclusion: synthesis.dominantConclusion,
    methodOutcomes: synthesis.methodOutcomes,
    themes: synthesis.themes,
    methodLedgerSummary: synthesis.methodLedgerSummary,
    qualityAudit: synthesis.qualityAudit,
    placements: reading.placements.map(p => ({
      ...p,
      evidence: packets
        .find(packet => packet.name === p.name)!
        .facts.filter(f => p.evidenceIds.includes(f.id)),
    })),
  };
}
