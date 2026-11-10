import type { SynthesisResult } from "./types";

function chartFacts(synthesis: SynthesisResult) {
  const snapshot = synthesis.sourceSnapshot;
  const fact = (row: { name: string; longitude: number; display: string; house: number; godHouse?: number; agentHouse?: number } | null | undefined) =>
    row ? {
      body: row.name,
      longitude: row.longitude,
      house: row.house,
      ...(row.godHouse != null ? { godHouse: row.godHouse } : {}),
      ...(row.agentHouse != null ? { agentHouse: row.agentHouse } : {}),
    } : null;
  return {
    frameConfig: {
      zodiacMode: snapshot.frameConfig.zodiacMode,
      firmamentCenter: snapshot.frameConfig.firmamentCenter,
      houseSystem: snapshot.frameConfig.houseSystem,
    },
    natal: {
      placements: [fact(snapshot.baseCelestialState.ascendant), fact(snapshot.baseCelestialState.midheaven), fact(snapshot.baseCelestialState.descendant), ...snapshot.baseCelestialState.planets.map(fact), fact(snapshot.baseCelestialState.northNode), fact(snapshot.baseCelestialState.southNode)].filter(Boolean),
      houses: snapshot.baseCelestialState.houses.map(house => ({ house: house.house, sign: house.sign, cusp: house.cusp })),
    },
    ...(snapshot.transit ? { transit: {
      placements: snapshot.transit.planets.map(fact),
      aspectsToNatal: snapshot.transit.aspectsToNatal,
    } } : {}),
  };
}

/**
 * Build a faithful final narrative packet. Full method outcomes and Canon are
 * supplied to the preceding bounded method-reading calls; this reducer packet
 * carries every method result summary and all deterministic synthesis lineage.
 */
export function buildNarrativePacket(
  synthesis: SynthesisResult,
  question: string,
  methodReadings: Record<string, string> = {}
) {
  const methodOutcomes = synthesis.methodOutcomes.map(method => ({
    methodId: method.methodId,
    methodName: method.methodName,
    tradition: method.tradition,
    status: method.status,
    chartScope: method.chartScope,
    frame: method.frame,
    evidenceIds: method.evidenceIds,
    canonApplicationIds: method.canonApplications.map(application => application.canonEvidenceId),
    limitation: method.strengthAndLimitations,
    reading: methodReadings[method.methodId] ?? null,
  }));
  const themes = synthesis.themes.map(theme => {
    const linkedJudgments = synthesis.methodOutcomes.flatMap(method => method.findingJudgments)
      .filter(finding => theme.linkedPropositionIds.includes(finding.id));
    const linkedMethods = synthesis.methodOutcomes.filter(method =>
      method.findingJudgments.some(finding => theme.linkedPropositionIds.includes(finding.id))
    );
    return {
      id: theme.id,
      theme: theme.humanTheme,
      domain: theme.domain,
      linkedMethodIds: linkedMethods.map(method => method.methodId),
      linkedFindingIds: theme.linkedPropositionIds,
      linkedCanonApplicationIds: Array.from(new Set(linkedJudgments.flatMap(finding => finding.rules.map(rule => rule.canonEvidenceId)))),
      evidenceIds: theme.evidenceIds,
      scope: Array.from(new Set(linkedMethods.map(method => `${method.chartScope}:${method.frame}`))),
    };
  });
  // Full Canon records were already delivered to the bounded method calls;
  // final-stage method records retain each linked Canon ID without another list.
  const tensions = synthesis.contradictionsAndTensions.map(tension => ({
    relation: "supportive-and-challenging testimony",
    linkedMethodIds: synthesis.methodOutcomes.filter(method => method.findingJudgments.some(finding => tension.evidenceIds.includes(finding.id))).map(method => method.methodId),
    linkedFindingIds: tension.evidenceIds,
    evidenceIds: tension.evidenceIds,
    scope: Array.from(new Set(synthesis.methodOutcomes.filter(method => method.findingJudgments.some(finding => tension.evidenceIds.includes(finding.id))).map(method => `${method.chartScope}:${method.frame}`))),
  }));
  const ledger = synthesis.sourceSnapshot.methodExecutionLedger;
  return {
    packet: {
      question,
      snapshotId: synthesis.snapshotId,
      mode: synthesis.mode,
      chartFacts: chartFacts(synthesis),
      methodOutcomes,
      themes,
      tensions,
      coverage: {
        registeredMethodIds: ledger.map(method => method.id),
        evaluatedMethodIds: methodOutcomes.map(method => method.methodId),
        failedMethodIds: methodOutcomes.filter(method => method.status === "failed").map(method => method.methodId),
        referenceOnlyMethodIds: methodOutcomes.filter(method => method.status === "reference-only").map(method => method.methodId),
        notApplicableMethodIds: methodOutcomes.filter(method => method.status === "not-applicable").map(method => method.methodId),
        missingCanonMappings: methodOutcomes.filter(method => synthesis.methodOutcomes.find(outcome => outcome.methodId === method.methodId)?.missingCanon).map(method => method.methodId),
        methodLedgerSummary: synthesis.methodLedgerSummary,
        methodOutcomeAudit: synthesis.methodOutcomeAudit,
        qualityAudit: synthesis.qualityAudit,
      },
    },
  };
}
