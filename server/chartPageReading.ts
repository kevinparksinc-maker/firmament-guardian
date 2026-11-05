import { z } from "zod";
import type { ChartResult, ChartRow } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
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
  const isDay = Boolean(sun && sun.house >= 7);
  const methods = synthesis.methodFindings;
  const parsed = methods
    .filter(m => m.status === "computed-with-result")
    .map(method => ({
      ...method,
      values: method.findings.map(f => {
        try {
          return JSON.parse(f.details);
        } catch {
          return f.details;
        }
      }),
    }));
  const short = (text: string | undefined) => text?.slice(0, 500);
  return chart.movingBodies.map(row => {
    const dossier = retrievePlacementDossier(row, chart, isDay);
    if (
      !dossier.nakshatraRecord ||
      !dossier.manzilRecord ||
      !dossier.decanRecord
    )
      throw new Error(
        `PLACEMENT_CANON_MISSING: ${row.name} mansion or decan Canon is unavailable.`
      );
    const facts: Fact[] = [];
    const add = (layerId: string, id: string, value: unknown) => {
      if (value != null) facts.push({ id, layerId, value });
    };
    add("western-planets-and-signs", `planet-${row.name.toLowerCase()}`, {
      longitude: row.longitude,
      display: row.display,
      house: row.house,
      godHouse: row.godHouse,
      agentHouse: row.agentHouse,
      retrograde: row.retrograde,
    });
    for (const method of parsed) {
      for (let index = 0; index < method.values.length; index++) {
        const value = method.values[index];
        const id = method.evidenceIds[index] ?? method.evidenceIds[0];
        if (!id || !value || typeof value !== "object") continue;
        if (method.id === "vedic-vargas-divisional") {
          const placement = value.placements?.find(
            (p: ChartRow & { body?: string }) => p.body === row.name
          );
          if (placement)
            add(method.id, id, {
              division: value.division,
              purpose: value.purpose,
              placement: {
                sign: placement.sign,
                house: placement.house,
                longitude: placement.longitude,
                divisionPart: placement.divisionPart,
              },
              ascendant: {
                sign: value.ascendant?.sign,
                longitude: value.ascendant?.longitude,
              },
            });
        } else if (method.id === "fixed-stars-royal-watchers") {
          const contacts = value.contacts?.filter(
            (c: { body: string }) => c.body === row.name
          );
          if (contacts?.length)
            add(method.id, id, { star: value.name, contacts });
        } else if (method.id === "vedic-dasha-and-ashtakavarga") {
          // Keep this planet's BAV row and global SAV, not seven repeated matrices.
          if (value.technique === "ashtakavarga") {
            const statement = String(value.statement);
            const start = statement.indexOf(`${row.name} BAV total`);
            const end = start < 0 ? -1 : statement.indexOf(".", start);
            if (start >= 0)
              add(method.id, id, {
                bav: statement.slice(start, end < 0 ? undefined : end + 1),
                sav: statement.slice(0, statement.indexOf("Sun BAV total")),
              });
          }
        } else if (
          method.id === "elemental-decans" &&
          value.body === row.name
        ) {
          add(method.id, id, {
            sign: value.sign,
            decanIndex: value.decanIndex,
            elementalFamilyRuler: value.elementalFamilyRuler,
          });
        } else if (
          [value.body, value.planet, value.body1, value.body2].includes(
            row.name
          )
        ) {
          add(method.id, id, value);
        } else if (
          method.id === "kabbalah-sefer-yetzirah" &&
          (value.subject === row.name ||
            value.concepts?.some(
              (c: string) => c.toLowerCase() === row.name.toLowerCase()
            ))
        ) {
          add(method.id, id, {
            subject: value.subject,
            statement: value.statement,
          });
        }
      }
    }
    const lordName = dossier.nakshatraRecord.vimshottariRuler;
    const lord = chart.movingBodies.find(p => p.name === lordName);
    return {
      name: row.name,
      facts,
      canon: {
        planetInSign: short(dossier.planetInSignSynthesis),
        planetInHouse: short(dossier.planetInHouseSynthesis),
        dignity: dossier.dignityAndCondition,
        nakshatra: {
          name: dossier.nakshatraRecord.name,
          ruler: lordName,
          deity: dossier.nakshatraRecord.deity,
          shakti: dossier.nakshatraRecord.shakti,
          meaning: dossier.nakshatraRecord.coreMeaning,
          pattern: dossier.nakshatraRecord.psychologicalPattern,
          pada: dossier.activePada,
          rulerPlacement: lord && {
            display: lord.display,
            house: lord.house,
            retrograde: lord.retrograde,
          },
        },
        manzil: {
          name: dossier.manzilRecord.name,
          meaning: dossier.manzilRecord.natalAndPsychologicalMeaning,
        },
        decan: {
          number: dossier.decanRecord.decanNumber,
          elementalFamilyRuler: dossier.decanRecord.triplicitySubRuler,
        },
        stars: dossier.fixedStarContacts,
      },
    };
  });
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
    if (
      !placement.evidenceIds.includes(`planet-${placement.name.toLowerCase()}`)
    ) {
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
  const { synthesis, canonicalChart } = await synthesizeChartForReading(
    chart,
    mode,
    "Compact planetary placement card summaries"
  );
  const packets = buildPlacementPackets(canonicalChart, synthesis);
  const key = `${synthesis.snapshotId}:${mode}:placement-paragraphs-v2`;
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
    max_tokens: 4500,
    timeoutMs: 180_000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildAstrologyInterpreterSystem(
          `Write SHORT Chart page placement cards. Return JSON {"placements":[{"name":"Sun","paragraph":"...","evidenceIds":["..."],"layerIds":["..."]}]}, one entry for EVERY supplied planet. Each paragraph is 70–110 words, 4–6 connected sentences, maximum 140 words. This is a compact natal placement interpretation, never a life story, full-chart report, chapter sequence or method inventory. Keep depth by explaining the central drive, a precise modification from its nakshatra/pada AND Arabic manzil, and how the strongest relevant aspect, ruler condition, varga, Ashtakavarga or star finding changes its expression. End with a concrete strength/tension or recognizable consequence. Prioritize Sun equally with Moon; include every planet. Use only supplied facts and retrieved Canon. Do not equate pada and D9 with independent corroboration, invent manzil rulers, conflate essential dignity with Shadbala, or fabricate Chinese-mansion/strength results. Decans use the supplied elemental-family ruler. No generic sign/house-only descriptions, repeated boilerplate, predetermined biography or flattering filler. Cite the planet's own evidence ID and the mansion IDs; list all actually used layer IDs. Rely on the same Master Interpreter depth within ONE paragraph per planet.`
        ),
      },
      {
        role: "user",
        content: JSON.stringify({
          scope: "Natal planetary cards for the displayed chart",
          packets,
          unavailableMethods: synthesis.methodFindings
            .filter(m => m.status !== "computed-with-result")
            .map(m => ({ id: m.id, status: m.status })),
          strengthAvailability:
            "Shadbala and Bhava Bala are not present in this method ledger; dignity and BAV are distinct measures.",
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
