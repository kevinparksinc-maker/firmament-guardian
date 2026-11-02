import { describe, expect, it } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart";
import { synthesizeMasterReading } from "./astrologyKnowledge/synthesis/synthesizer";
import { extractPropositionsFromSnapshot } from "./astrologyKnowledge/synthesis/normalizer";

const input = {
  location: "Alexandria, Egypt", latitude: 31.2001, longitude: 29.9187,
  timezone: "Africa/Cairo", date: "1988-08-08", time: "12:00", mode: "natal" as const,
};

describe("Unified synthesis method-coverage contract", () => {
  it("incorporates each computed layer's actual findings into interpreted themes", async () => {
    const snapshot = await buildUnifiedMasterChart(input);
    const synthesis = await synthesizeMasterReading({ snapshot, readingMode: "natal" });
    const propositions = extractPropositionsFromSnapshot(snapshot);
    const linked = new Set(synthesis.themes.flatMap(theme => theme.linkedPropositionIds));
    for (const layer of snapshot.methodExecutionLedger) {
      const entry = synthesis.methodFindings.find(method => method.id === layer.id);
      expect(entry?.status).toBe(layer.status);
      if (layer.status !== "computed-with-result") continue;
      const records = Array.isArray(layer.results) ? layer.results : layer.results == null ? [] : [layer.results];
      expect(records.length).toBeGreaterThan(0);
      for (let index = 0; index < records.length; index++) {
        const id = `prop-method-${layer.id}-${index}`;
        expect(propositions.some(prop => prop.id === id)).toBe(true);
        expect(linked.has(id)).toBe(true);
        expect(synthesis.integratedNarrative.some(line => line.includes(layer.name))).toBe(true);
      }
    }
    expect(synthesis.qualityAudit.unsupportedClaims).toEqual([]);
  });

  it("never promotes reference-only Chinese mansions into computed interpretations", async () => {
    const snapshot = await buildUnifiedMasterChart(input);
    const synthesis = await synthesizeMasterReading({ snapshot, readingMode: "natal" });
    const xiu = synthesis.methodFindings.find(layer => layer.id === "chinese-lunar-mansions-xiu");
    expect(xiu?.status).toBe("reference-only");
    expect(synthesis.themes.flatMap(theme => theme.linkedPropositionIds)
      .some(id => id.startsWith("prop-method-chinese-lunar-mansions-xiu-"))).toBe(false);
  });
});
