import { describe, it, expect } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart/builder";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import { buildNarrativePacket } from "./astrologyKnowledge/synthesis/narrativePacket";
import { encodeEvidence, decodeEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";

const input = {location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"natal" as const};
describe("Complete final synthesis handoff", () => {
  it("retains all method statuses, readings, Canon IDs, themes, scope, and evidence lineage", async () => {
    const snapshot = await buildUnifiedMasterChart(input);
    const { synthesis } = await synthesizeMasterSnapshot(snapshot, "natal", "purpose");
    const before = JSON.stringify(synthesis);
    const readings = Object.fromEntries(synthesis.methodOutcomes.filter(method => method.status === "interpreted").map(method => [method.methodId, `Reading ${method.methodId}`]));
    const { packet } = buildNarrativePacket(synthesis, "purpose", readings);
    expect(packet.snapshotId).toBe(synthesis.snapshotId);
    expect(packet.methodOutcomes.map(method => method.methodId)).toEqual(synthesis.methodOutcomes.map(method => method.methodId));
    expect(packet.methodOutcomes.filter(method => method.status === "interpreted").every(method => method.reading !== null)).toBe(true);
    expect(packet.methodOutcomes.filter(method => method.status !== "interpreted").every(method => method.reading === null)).toBe(true);
    expect(packet.methodOutcomes.every(method => Array.isArray(method.evidenceIds) && Array.isArray(method.canonApplicationIds))).toBe(true);
    expect(packet.coverage.registeredMethodIds).toEqual(snapshot.methodExecutionLedger.map(layer => layer.id));
    expect(packet.coverage.evaluatedMethodIds).toHaveLength(snapshot.methodExecutionLedger.length);
    expect(packet.chartFacts.natal.placements.length).toBeGreaterThan(0);
    expect(packet.chartFacts.natal.houses).toHaveLength(12);
    expect(packet.themes.every(theme => theme.linkedMethodIds.length >= 0 && theme.linkedFindingIds.length > 0 && theme.evidenceIds.length > 0)).toBe(true);
    const encoded = encodeEvidence(packet);
    expect(decodeEvidence(JSON.parse(JSON.stringify(encoded)))).toEqual(packet);
    expect(JSON.stringify(packet)).not.toContain("locationContext");
    expect(JSON.stringify(packet)).not.toContain('"latitude"');
    expect(JSON.stringify(synthesis)).toBe(before);
  });

  it("keeps failed calculation status visible in the final reducer packet", async () => {
    const snapshot = await buildUnifiedMasterChart(input);
    snapshot.methodExecutionLedger[0] = {...snapshot.methodExecutionLedger[0], status:"failed", errorCode:"TEST_PARTIAL_FAILURE"};
    const { synthesis } = await synthesizeMasterSnapshot(snapshot, "natal", "purpose");
    const { packet } = buildNarrativePacket(synthesis, "purpose");
    expect(packet.coverage.failedMethodIds).toContain(packet.methodOutcomes[0].methodId);
    expect(packet.methodOutcomes).toHaveLength(snapshot.methodExecutionLedger.length);
  });
});
