import { synthesizeChartForReading } from "../astrologyKnowledge/synthesis/readingBridge";
import { runInterpretation } from "../astrologyKnowledge/synthesis/interpretationPipeline";
import { MINI_SYNTHESIS_STYLE } from "../master-interpreter";
import { scrubNonHoraryAstrologyJargon } from "../astrologyKnowledge/synthesis/narrative";
import { buildAstrologyEvidencePacket } from "../astrologyKnowledge";
import type { ChartResult } from "../astronomy";
import { PLACEMENT_METHODS } from "./registry";
import type { PlacementAdapterContext, PlacementContribution, PlacementPacket } from "./types";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const signAt = (longitude: number) => SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];

function findRow(chart: ChartResult, body: string) {
  return [
    ...chart.movingBodies, chart.ascendant, chart.descendant, chart.midheaven,
    chart.northNode, chart.southNode,
  ].find(row => row?.name.toLowerCase() === body.toLowerCase());
}

function promptFor(packet: PlacementPacket) {
  const methodText = packet.contributions.map(item => [
    `METHOD: ${item.label} (${item.method})`,
    `STATUS: ${item.status}`,
    `RELATION: ${item.relation}`,
    item.reason ? `REASON: ${item.reason}` : "",
    item.result.length ? item.result.map((result, index) => `RESULT [${item.evidenceIds?.[index]}]: ${result}`).join("\n") : "RESULT: none returned",
    item.sourceTrace.length ? `SOURCE TRACE: ${item.sourceTrace.join(" | ")}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
  return `You are the Firmament precision placement synthesizer. Interpret one exact placement, not a generic horoscope.

PLACEMENT: ${packet.body} at ${packet.display}; ${packet.sign}, ${packet.degree.toFixed(4)}°; House ${packet.house}; reading scope ${packet.mode}.

Every configured method below was executed and has an explicit status. Use every included result that is relevant. Do not invent a result for no-result, not-applicable, incomplete, reference-only, or failed methods. Do not merely name methods: explain how their actual results reinforce, qualify, or contradict one another. Preserve distinct traditions and coordinate systems. The final meaning must be specific to this placement and chart, not a generic Sun/sign/house paragraph.

Use only the evidence IDs printed on the RESULT lines to support placement claims.
${packet.activationUtc
    ? `The calculated activation instant is ${packet.activationUtc}. Only discuss time-specific changes at that instant, and cite one or more of these IDs: ${packet.timingEvidenceIds.join(", ")}. Refer to the actual date if it differs from the current date.`
    : "There is no calculated placement activation. Use enduring language and omit claims about the current period."}

${methodText}

CROSS-METHOD CONVERGENCES:
${packet.convergences.length ? packet.convergences.join("\n") : "None returned."}

CROSS-METHOD CONTRADICTIONS:
${packet.contradictions.length ? packet.contradictions.join("\n") : "None returned."}

SILENT SPECIFICITY SELECTION BEFORE WRITING:
- Construct multiple distinct candidate conclusions from actually reported placements and intersecting method results. For each ask: "Could this describe almost anybody?" If yes, KILL that entire candidate, without rephrasing or recycling its generic premise.
- Select one genuinely chart-distinct controlling thesis corroborated by materially different calculated witnesses; if none exists, report the evidence gap rather than manufacturing a personality reading. Citation IDs must identify actual supporting evidence, not decorate a stock claim.
- Only after this selection may you write reader-facing prose.

Write two flowing second-person paragraphs in plainspoken, recognizable everyday language. Translate converging layers into one coherent insight and show how conflicting pulls take turns in ordinary life: what you do, what you are protecting or trying to get, what comes naturally that others rely on you for, and what that pattern costs you. Keep ALL astrology terminology out of the two paragraphs—never name planets, zodiac signs, houses, degrees, aspects, lunar mansions, bounds, faces, or Lots. Do not output bullet lists, headings, method inventories, or invented events/diagnoses/motives. Return one claim per line with a suffix [evidence: id1, id2]. For every time-specific claim use [timing: activation-id, other-id] and include a calculated placement activation ID. Use a single blank line between the two groups of claims. These suffixes are private annotations stripped before display.`;
}

export function buildPlacementPacket(chart: ChartResult, body: string, question = "") : PlacementPacket {
  const row = findRow(chart, body);
  if (!row) throw new Error(`Placement ${body} was not found in the calculated chart.`);
  const packet = buildAstrologyEvidencePacket(chart, question || `Interpret ${body} as a precise placement`, chart.readingScope);
  const context: PlacementAdapterContext = { chart, body, row, packet };
  const contributions: PlacementContribution[] = PLACEMENT_METHODS.map(({ method, label, adapter }) => {
    try { return adapter(context); }
    catch (error) { return { method, label, status: "failed", relation: "unavailable", result: [], sourceTrace: [], reason: error instanceof Error ? error.message : String(error) }; }
  });
  const evidenceIds = new Set(contributions.flatMap(contribution => contribution.evidenceIds ?? []));
  const relatesToPlacement = (item: { evidenceIds: string[] }) =>
    item.evidenceIds.length > 0 && item.evidenceIds.every(id => evidenceIds.has(id));
  const convergences = packet.convergences.filter(relatesToPlacement).map(item => item.explanation);
  const contradictions = packet.contradictions.filter(relatesToPlacement).map(item => item.explanation);
  const timingEvidenceIds = contributions.find(item => item.method === "transits")?.evidenceIds ?? [];
  const result: PlacementPacket = {
    body,
    display: row.display,
    sign: signAt(row.longitude),
    degree: row.longitude % 30,
    house: row.house,
    mode: chart.readingScope,
    contributions,
    includedMethods: contributions.filter(item => item.status === "included").map(item => item.method),
    excludedMethods: contributions.filter(item => ["not-applicable", "reference-only"].includes(item.status)).map(item => item.method),
    unresolvedMethods: contributions.filter(item => ["no-result", "incomplete", "failed"].includes(item.status)).map(item => item.method),
    convergences,
    contradictions,
    activationUtc: timingEvidenceIds.length ? chart.transitDate : undefined,
    timingEvidenceIds,
    prompt: "",
  };
  result.prompt = promptFor(result);
  return result;
}

export async function synthesizePlacement(chart: ChartResult, body: string, question = "") {
  const packet = buildPlacementPacket(chart, body, question);
  const { synthesis: fullSynthesis } = await synthesizeChartForReading(chart, chart.readingScope, question || `Interpret ${body}`);
  const response = await runInterpretation("PLACEMENT_SYNTHESIS", fullSynthesis, {
    provider: "gemini",
    timeoutMs: 60_000,
    messages: [
      { role: "system", content: `${MINI_SYNTHESIS_STYLE}\nWrite two flowing second-person paragraphs translating the supplied dossier silently into candid everyday human prose with zero astrology terminology.` },
      { role: "user", content: packet.prompt },
    ],
    maxTokens: 900,
  }, "placement-reference");
  const allowedIds = new Set(packet.contributions.flatMap(item => item.evidenceIds ?? []));
  const timingIds = new Set(packet.timingEvidenceIds);
  function parseClaims(rawSynthesis: string) {
    const groups = rawSynthesis.split(/\r?\n[ \t]*\r?\n/).map(group => group.trim()).filter(Boolean);
    if (groups.length !== 2)
      throw new Error("PLACEMENT_SYNTHESIS_INCOMPLETE: The provider did not return both paragraphs.");
    return groups.map(group => {
      const parsed: Array<{ text: string; evidenceIds: string[]; timing: boolean }> = [];
      const annotation = /\[(evidence|timing):\s*([^\]]+)\]/g;
      let cursor = 0;
      for (const match of Array.from(group.matchAll(annotation))) {
        const start = match.index ?? 0;
        const prose = group.slice(cursor, start).trim();
        if (!prose) throw new Error("PLACEMENT_SYNTHESIS_TRACE: An evidence annotation has no claim.");
        const evidenceIds = Array.from(new Set(match[2].split(",").map(id => id.trim())));
        const usesActivation = evidenceIds.some(id => timingIds.has(id));
        if (evidenceIds.some(id => !id || !allowedIds.has(id)) || (match[1] === "timing") !== usesActivation)
          throw new Error("PLACEMENT_SYNTHESIS_TRACE: A claim cites unsupported placement or timing evidence.");
        parsed.push({ text: scrubNonHoraryAstrologyJargon(prose.replace(/\s+/g, " ")), evidenceIds, timing: usesActivation });
        cursor = start + match[0].length;
      }
      if (!parsed.length || group.slice(cursor).trim())
        throw new Error("PLACEMENT_SYNTHESIS_TRACE: A claim is missing its evidence IDs.");
      return parsed;
    });
  }
  const content = response.choices[0]?.message?.content;
  const rawSynthesis = typeof content === "string" ? content.trim() : "";
  let claims: ReturnType<typeof parseClaims>;
  try {
    claims = parseClaims(rawSynthesis);
  } catch (error) {
    if (!(error instanceof Error) || !/^PLACEMENT_SYNTHESIS_(TRACE|INCOMPLETE)/.test(error.message)) throw error;
    const repaired = await runInterpretation("PLACEMENT_SYNTHESIS_REPAIR", fullSynthesis, {
      provider: "gemini",
      timeoutMs: 60_000,
      maxTokens: 1400,
      messages: [
        { role: "system", content: "Repair evidence annotations only. Preserve the original meaning and two-paragraph structure. Each claim must end in [evidence: exact-id] or, for time-specific claims, [timing: exact-activation-id]. Never invent IDs, calculations, or unsupported claims. Delete claims that cannot be supported by the supplied RESULT evidence. Output only two annotated paragraphs." },
        { role: "user", content: packet.prompt + "\n\nPREVIOUS RESPONSE TO REPAIR:\n" + rawSynthesis + "\n\nVALIDATION ERROR:\n" + error.message },
      ],
    }, "placement-reference");
    const repairedContent = repaired.choices[0]?.message?.content;
    claims = parseClaims(typeof repairedContent === "string" ? repairedContent.trim() : "");
  }
  const synthesis = claims.map(group => group.map(claim => claim.text).join(" ")).join("\n\n");
  return { packet: { ...packet, prompt: undefined }, synthesis, claimTrace: claims.flat() };
}
