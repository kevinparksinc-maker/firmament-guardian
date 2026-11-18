import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));
beforeEach(() => {
  mocked.invokeLLM.mockReset();
  mocked.invokeLLM.mockResolvedValue({
    choices: [{ message: { role: "assistant", content:
      "You are facing a synthetic chart pattern whose calculated relationships ask for a clear decision. The relevant methods reinforce some evidence and complicate other evidence. You can use that tension to choose deliberate actions instead of mistaking a symbolic map for a guaranteed event." } }],
  });
});

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
        const proposition = propositions.find(prop => prop.id === id)!;
        expect(synthesis.themes.some(theme => theme.linkedPropositionIds.includes(id) && theme.whyHow.includes(proposition.plainLanguageMeaning) && proposition.supportingEvidenceIds.every(evidenceId => theme.evidenceIds.includes(evidenceId)))).toBe(true);
        // The reader receives every method; user-visible prose must weave, not enumerate ingredients.
        const request = mocked.invokeLLM.mock.calls.at(-1)?.[0] as { messages: Array<{role: string; content: string}> };
        const payload = JSON.parse(request.messages.find(message => message.role === "user")!.content);
        expect(payload.methodExecutionLedger.some((sent: {id: string; name: string}) => sent.id === layer.id && sent.name === layer.name)).toBe(true);
      }
    }
    for (const theme of synthesis.themes) {
      expect(theme.evidenceIds.length).toBeGreaterThan(0);
      expect(theme.linkedPropositionIds.length).toBeGreaterThan(0);
      expect(theme.consequences).toContain("Evidence:");
      expect(theme.deeperMeaning).toContain("Symbolic interpretation of");
      const evidenceProps = propositions.filter(prop => theme.linkedPropositionIds.includes(prop.id) && !prop.id.endsWith("-remaining") && prop.supportingEvidenceIds.length > 0);
      expect(theme.concreteManifestations.length).toBe(Math.min(4, evidenceProps.length));
      for (const manifestation of theme.concreteManifestations) {
        expect(evidenceProps.some(prop => manifestation.includes(prop.plainLanguageMeaning) && prop.supportingEvidenceIds.every(id => manifestation.includes(id)))).toBe(true);
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
