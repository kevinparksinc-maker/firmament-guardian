import { stringifyEvidence } from "./evidenceTransport";
import type { SynthesisResult } from "./types";

/**
 * The Canon-to-chart placement index is a routing aid, not another calculation.
 * Each row ties one authoritative planetary placement to its exact God/Agent
 * position and any existing planetary-lordship evidence IDs. Synthesis must
 * consume these identities rather than assigning Canon by planet name alone.
 */
export function buildCanonPlacementIndex(synthesis: SynthesisResult) {
  const snapshot = synthesis.sourceSnapshot;
  if (!snapshot) return [];
  const lordship = snapshot.layers["vedic-planetary-lordship-connections"];
  const connections = Array.isArray(lordship?.results) ? lordship.results as Array<{
    planet: string; occupiedHouse: number; ruledHouses: number[];
    connections: Array<{fromHouse:number;toHouse:number;type:string}>;
    selfPlacedFor: number[]; coRuledPair: [number,number] | null;
    exchangeWith: unknown;
  }> : [];
  const byPlanet = new Map(connections.map(record => [record.planet, record]));
  return [
    ...snapshot.baseCelestialState.planets,
    snapshot.baseCelestialState.northNode,
    snapshot.baseCelestialState.southNode,
  ].map(row => {
    const name = row.name === snapshot.baseCelestialState.northNode.name
      ? "Rahu" : row.name === snapshot.baseCelestialState.southNode.name ? "Ketu" : row.name;
    const nodeAlias = name === "Rahu" ? "North Node" : name === "Ketu" ? "South Node" : name;
    const god = snapshot.godView.placements.find(p => p.body === row.name);
    const agent = snapshot.agentView.placements.find(p => p.body === row.name);
    const lord = byPlanet.get(name);
    return {
      planet: name,
      sourceBody: row.name,
      longitude: row.longitude,
      sign: snapshot.godView.placements.find(p => p.body === row.name)?.sign
        ?? snapshot.agentView.placements.find(p => p.body === row.name)?.sign
        ?? null,
      godHouse: god?.godHouse ?? row.godHouse ?? null,
      agentHouse: agent?.agentHouse ?? row.agentHouse ?? null,
      ruledHouses: lord?.ruledHouses ?? [],
      lordshipConnections: lord?.connections ?? [],
      selfPlacedFor: lord?.selfPlacedFor ?? [],
      coRuledPair: lord?.coRuledPair ?? null,
      exchangeWith: lord?.exchangeWith ?? null,
      lordshipEvidenceId: lord ? `lordship-${name.toLowerCase()}` : null,
      // These are separate, precomputed outcomes; no judgments are fabricated here.
      matchingEvidenceIds: Array.from(new Set(synthesis.methodOutcomes.flatMap(outcome =>
        outcome.findingJudgments
          .filter(f => f.subject === name || f.subject === row.name || f.subject.startsWith(name + " ·") || f.subject.startsWith(nodeAlias + " ·"))
          .flatMap(f => f.evidenceIds)
      ))),
    };
  });
}

/** Lossless text/source interning keeps ALL judged findings within the interpreter packet. */
export function packSynthesis(synthesis: SynthesisResult) {
  const split = (text: string) => text.split(/(?<=[.!?])(?=\s)/);
  const counts = new Map<string, number>();
  for (const outcome of synthesis.methodOutcomes)
    for (const finding of outcome.findingJudgments)
      for (const part of split(finding.judgment))
        counts.set(part, (counts.get(part) ?? 0) + 1);
  const textTable = Array.from(counts.entries())
    .filter(([part, count]) => part.length >= 80 && count > 1)
    .map(([part]) => part);
  const textIndex = new Map(textTable.map((part, index) => [part, index]));
  const sources = Array.from(
    new Map(
      synthesis.canonApplications.map(rule => [
        `${rule.ruleId}:${rule.sourceTitle}`,
        {
          ruleId: rule.ruleId,
          sourceId: rule.sourceId,
          sourceTitle: rule.sourceTitle,
          confidence: rule.confidence,
        },
      ])
    ).values()
  );
  const sourceIndex = new Map(
    sources.map((rule, index) => [`${rule.ruleId}:${rule.sourceTitle}`, index])
  );
  return {
    snapshotId: synthesis.snapshotId,
    sourceSnapshot: synthesis.sourceSnapshot,
    canonPlacementIndex: buildCanonPlacementIndex(synthesis),
    calculatedMethodOutcomes: synthesis.sourceSnapshot?.methodExecutionLedger,
    fullMethodOutcomes: synthesis.methodOutcomes,
    fullCanonApplications: synthesis.canonApplications,
    qualityAudit: synthesis.qualityAudit,
    methodLedgerSummary: synthesis.methodLedgerSummary,
    methodOutcomeAudit: synthesis.methodOutcomeAudit,
    methodFindings: synthesis.methodFindings.map(
      ({ findings: _raw, ...metadata }) => metadata
    ),
    judgmentColumns: [
      "subject",
      "judgmentParts",
      "evidenceIds",
      "sourceRefs",
      "valence",
      "strength",
      "frame",
      "limitation",
      "findingId",
    ],
    textTable,
    methodOutcomes: synthesis.methodOutcomes.map(outcome => ({
      methodId: outcome.methodId,
      methodName: outcome.methodName,
      chartScope: outcome.chartScope,
      frame: outcome.frame,
      status: outcome.status,
      findingJudgments:
        outcome.findingJudgments.map(f => [
              f.subject,
              split(f.judgment).map(part => textIndex.get(part) ?? part),
              f.evidenceIds,
              Array.from(
                new Set(
                  f.rules.map(rule =>
                    sourceIndex.get(`${rule.ruleId}:${rule.sourceTitle}`)
                  )
                )
              ),
              f.valence,
              f.strength,
              f.frame ?? outcome.frame,
              f.limitation ?? null,
              f.id,
            ]),
      limitations: outcome.strengthAndLimitations,
    })),
    canonApplications: sources,
    themes: synthesis.themes.map(theme => ({
      id: theme.id,
      humanTheme: theme.humanTheme,
    })),
  };
}
export function formatSynthesisContext(synthesis: SynthesisResult) {
  return [
    "UNIFIED MASTER SYNTHESIS — CALCULATED METHOD FINDINGS AND CANON RULE APPLICATIONS",
    "The authoritative inputs are sourceSnapshot, calculatedMethodOutcomes, fullMethodOutcomes and fullCanonApplications. Read every supplied calculation and outcome, including findings whose rule-based interpretation failed. The compact rows below are an additional view, never a selection gate. Rows use judgmentColumns. In judgmentParts, a number means the exact textTable entry; strings are literal text. Concatenate the parts IN ORDER to read the full judgment. sourceRefs index canonApplications. ALL judgments are retained; these references only avoid repeated text. Cite the original evidence ID strings, never the numeric text/source references.",
    "CANON PLACEMENT CONTRACT: For every planet, begin at canonPlacementIndex. Keep its longitude, sign, God House and Agent Equal House distinct. Link domicile lordship flows to the planet occupying the receiving house, then enrich those exact placements using the existing Canon and calculated methods. The Canon identifies what each method means; the engine supplies where it applies. Do not move a planet, substitute whole-sign occupancy, cross natal/event scopes, reinterpret an uncalculated method as calculated, or present neutral lordship wiring as a positive or negative verdict. Do not replace source evidence with generic doctrine.",
    "Each judgment already applies its specific Canon to its actual findings. Reconcile their support, pressure and conditions using WHAT → WHY → HOW → CONSEQUENCE → MEANING. Reconcile the raw calculations and Canon directly when a rule-based judgment is incomplete. Preserve method execution statuses; do not invent a calculation that is absent.",
    "Unprefixed evidence belongs to the base chart. transit: identifies the separate event sky. chartScope identifies natal/event independently of God/Agent/shared frame. God House sectors are fixed background fields; Agent houses follow the real local horizon. Divisional and timing results seeded from an event are event-model results, never a person's natal biography.",
    "Every applicable method's judgment must be considered. Preserve disagreements and source limitations. Use each method’s recorded status and supplied Canon to distinguish calculated activations from reference material. Use the recorded Shadbala and Bhava Bala component totals, adequacy, house lord delivery and relative rankings to qualify the interpretation. Capacity is distinct from favorable outcome; preserve the supplied fixed-XYZ/Equal-House and motion/calendar variants. Never invent scores when their method status is unavailable.",
    stringifyEvidence(packSynthesis(synthesis)),
  ].join("\n");
}
