import { describe, it, expect } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart";
import {
  extractPropositionsFromSnapshot,
  clusterPropositionsIntoThemes,
  synthesizeMasterReading,
} from "./astrologyKnowledge/synthesis";

const SAMPLE_INPUT = {
  location: "Athens, Greece",
  latitude: 37.9838,
  longitude: 23.7275,
  timezone: "Europe/Athens",
  date: "1990-05-15",
  time: "14:30",
  mode: "natal" as const,
};

describe("Master Synthesizer Pipeline", () => {
  it("distinguishes sub-four-decimal coordinate changes in snapshot identity", async () => {
    const first = await buildUnifiedMasterChart(SAMPLE_INPUT);
    const shifted = await buildUnifiedMasterChart({ ...SAMPLE_INPUT, latitude: SAMPLE_INPUT.latitude + 0.000001 });
    expect(shifted.snapshotId).not.toBe(first.snapshotId);
  });

  it("extracts grounded propositions with explicit evidence IDs across traditions", async () => {
    const snapshot = await buildUnifiedMasterChart(SAMPLE_INPUT);
    const propositions = extractPropositionsFromSnapshot(snapshot);

    expect(propositions.length).toBeGreaterThanOrEqual(6);
    for (const prop of propositions) {
      expect(prop.id).toBeDefined();
      expect(prop.domain).toBeDefined();
      expect(prop.causalMechanism).toBeDefined();
      expect(prop.supportingEvidenceIds.length).toBeGreaterThan(0);
      expect(prop.tradition).toBeDefined();
    }
  });

  it("clusters propositions by lived human domains and detects cross-tradition corroboration", async () => {
    const snapshot = await buildUnifiedMasterChart(SAMPLE_INPUT);
    const propositions = extractPropositionsFromSnapshot(snapshot);
    const { themes, tensions } = clusterPropositionsIntoThemes(propositions);

    expect(themes.length).toBeGreaterThanOrEqual(4);

    const domains = themes.map(t => t.domain);
    expect(domains).toContain("identity");
    expect(domains).toContain("purpose_work");

    for (const theme of themes) {
      expect(theme.primaryConclusion).toBeDefined();
      expect(theme.whyHow).toBeDefined();
      expect(theme.concreteManifestations.length).toBeGreaterThan(0);
      expect(theme.convergenceAssessment.independentTraditions.length).toBeGreaterThan(0);
      expect(theme.evidenceIds.length).toBeGreaterThan(0);
    }
  });

  it("synthesizes a complete master reading with dominant conclusion, integrated prose, and 100% evidence traceability", async () => {
    const snapshot = await buildUnifiedMasterChart(SAMPLE_INPUT);
    const result = await synthesizeMasterReading({
      snapshot,
      readingMode: "natal",
      userQuestion: "What is my core life trajectory and highest calling?",
    });

    expect(result.snapshotId).toBe(snapshot.snapshotId);
    expect(result.dominantConclusion).toContain("celestial configuration");
    expect(result.integratedNarrative.length).toBeGreaterThanOrEqual(4);

    // Verify trace map has entries for every theme and dominant conclusion
    expect(result.evidenceTraceMap["dominant-conclusion"]).toBeDefined();
    expect(result.evidenceTraceMap["dominant-conclusion"].length).toBeGreaterThan(0);

    for (const theme of result.themes) {
      expect(result.evidenceTraceMap[theme.id]).toEqual(theme.evidenceIds);
    }

    // Verify method ledger summary reports real counts
    expect(result.methodLedgerSummary.totalEvaluated).toBe(16);
    expect(result.methodLedgerSummary.computedWithResult).toBeGreaterThanOrEqual(10);
    expect(result.methodLedgerSummary.referenceOnly).toBe(1); // Chinese 28 Xiu

    // Quality audit verification
    expect(result.qualityAudit.passed).toBe(true);
    expect(result.qualityAudit.groundedRatio).toBe(1.0);
    expect(result.qualityAudit.unsupportedClaims).toHaveLength(0);
  });
});
