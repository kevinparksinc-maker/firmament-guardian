import type { ChartResult } from "./astronomy";
import { placementRows } from "../shared/placementMiniReadings";
import { retrievePlacementDossier } from "./astrologyKnowledge/canon/retriever";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import { buildPlanetPersonaMatrix } from "../shared/planetPersonaMatrix";

export type Fact = { id: string; layerId: string; value: unknown };

/** Select planet-specific findings once; never ship the 575k-character life-story context. */
export function buildPlacementPackets(
  chart: ChartResult,
  synthesis: SynthesisResult,
  options: { requireJudgments?: boolean } = {}
) {
  const sun = chart.movingBodies.find(p => p.name === "Sun");
  const personaMatrix = buildPlanetPersonaMatrix(chart);
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
    if (!judgments.length && options.requireJudgments !== false)
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
    const persona = personaMatrix.find(p => p.planet === row.name);
    return {
      name: row.name,
      placementEvidenceId: `planet-${slug}`,
      facts,
      judgments,
      persona,
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


/**
 * Reuse the exact placement association logic for whole-chart interpretation.
 * Reference the full ledger rather than duplicating or truncating judgments.
 * Unmatched findings remain in the complete dossier, not excluded from it.
 */
export function buildWholeChartPlacementIndex(chart: ChartResult, synthesis: SynthesisResult) {
  const packets = buildPlacementPackets(chart, synthesis, { requireJudgments: false });
  const linked = new Set(packets.flatMap(p => p.judgments.map(j => j.findingId)));
  return {
    placements: packets.map(p => ({
      body: p.name,
      position: p.facts[0].value,
      findingIds: [...new Set(p.judgments.map(j => j.findingId))],
      methodIds: [...new Set(p.judgments.map(j => j.methodId))],
      canon: p.canon,
    })),
    chartWideOrUnlinkedFindingIds: synthesis.methodOutcomes.flatMap(m =>
      m.findingJudgments.filter(f => !linked.has(f.id)).map(f => f.id)
    ),
  };
}
