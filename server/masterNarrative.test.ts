import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart/builder";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import { narrateMasterSynthesis } from "./astrologyKnowledge/synthesis/narrative";
import { decodeEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import { invokeLLM } from "./_core/llm";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
let synthesis: SynthesisResult;
const text = "You seek a life that answers to your own judgment. Your strongest drive and the pressures around it must be understood together through this chart’s actual layers.";
const response = (content = text, finish_reason = "stop") => ({id:"test",created:0,model:"test",choices:[{index:0,finish_reason,message:{role:"assistant" as const,content}}]});
function installModel(finalResponses: ReturnType<typeof response>[] = []) {
  vi.mocked(invokeLLM).mockImplementation(async (request: any) => {
    const userContent = String(request?.messages?.[1]?.content ?? "");
    if (!userContent) return (finalResponses.shift() ?? response()) as any;
    if (userContent.startsWith("<chart_data>")) return (finalResponses.shift() ?? response()) as any;
    const batch = decodeEvidence(JSON.parse(userContent)) as any;
    const readings = Object.fromEntries(batch.methodOutcomes.map((method: any) => [method.methodId, `Evidence-led reading for ${method.methodId}.`]));
    return response(JSON.stringify(readings)) as any;
  });
}
beforeAll(async () => {
  const snapshot = await buildUnifiedMasterChart({location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"combined",transitDate:"2026-11-06",transitTime:"16:22",transitLocation:"Las Vegas",transitLatitude:36.1699,transitLongitude:-115.1398,transitTimezone:"America/Los_Angeles"});
  synthesis = (await synthesizeMasterSnapshot(snapshot,"combined","Read this moment")).synthesis;
});
beforeEach(() => vi.mocked(invokeLLM).mockReset());
describe("AI master reading", () => {
  it("covers all interpreted natal/event methods in bounded Canon-aware calls before final synthesis", async () => {
    installModel();
    const failedAudit = {...synthesis, qualityAudit:{...synthesis.qualityAudit,passed:false}};
    const result = await narrateMasterSynthesis(failedAudit,"Read me");
    const calls = vi.mocked(invokeLLM).mock.calls;
    const methodPackets = calls.filter(([request]: any) => !String(request.messages[1].content).startsWith("<chart_data>"));
    const sentMethods = methodPackets.flatMap(([request]: any) => {
      const content = String(request.messages[1].content);
      expect(content.length).toBeLessThanOrEqual(180_000);
      const batch = decodeEvidence(JSON.parse(content)) as any;
      expect(batch).not.toHaveProperty("snapshot");
      expect(batch.methodOutcomes.every((method: any) => Array.isArray(method.findingJudgments))).toBe(true);
      expect(batch.canonApplications.length).toBeGreaterThan(0);
      return batch.methodOutcomes.map((method: any) => method.methodId);
    });
    expect(sentMethods.sort()).toEqual(synthesis.methodOutcomes.filter(method => method.status === "interpreted").map(method => method.methodId).sort());
    const deliveredCanonIds = methodPackets.flatMap(([request]: any) => decodeEvidence(JSON.parse(String(request.messages[1].content))) as any).flatMap((batch: any) => batch.canonApplications.map((canon: any) => canon.canonEvidenceId));
    expect(new Set(deliveredCanonIds).size).toBeGreaterThan(0);
    const finalRequest = calls[calls.length - 1][0] as any;
    const finalContent = String(finalRequest.messages[1].content);
    expect(finalContent.length).toBeLessThanOrEqual(240_000);
    const wrapped = finalContent.replace(/^<chart_data>\n/, "").replace(/\n<\/chart_data>$/, "");
    const delivered = decodeEvidence(JSON.parse(wrapped)) as any;
    expect(delivered.methodOutcomes.map((method: any) => method.methodId)).toEqual(synthesis.methodOutcomes.map(method => method.methodId));
    expect(delivered.methodOutcomes.every((method: any) => method.reading !== null || method.status !== "interpreted")).toBe(true);
    expect(delivered.themes.every((theme: any) => Array.isArray(theme.linkedMethodIds) && Array.isArray(theme.linkedFindingIds) && Array.isArray(theme.linkedCanonApplicationIds) && Array.isArray(theme.evidenceIds) && Array.isArray(theme.scope))).toBe(true);
    expect(delivered.chartFacts.natal.placements.length).toBeGreaterThan(0);
    expect(delivered.coverage.failedMethodIds).toEqual([]);
    expect(result.narrative.answer).toBe(text);
    expect(result.integratedNarrative).toEqual([text]);
    expect(result.calculatedNarrative).toEqual(synthesis.integratedNarrative);
    expect(result.narrativeAudit.deliveredMethodIds).toHaveLength(synthesis.sourceSnapshot.methodExecutionLedger.length);
    expect(result.narrative.methodsReviewed).toEqual([]);
    expect(result.narrativeAudit.passed).toBeNull();
  });

  it("rejects empty or truncated final synthesis and permits a fresh retry", async () => {
    installModel([response(text,"length"), response(" "), response()]);
    await expect(narrateMasterSynthesis(synthesis,"retry")).rejects.toThrow("TRUNCATED");
    await expect(narrateMasterSynthesis(synthesis,"retry")).rejects.toThrow("EMPTY");
    await expect(narrateMasterSynthesis(synthesis,"retry")).resolves.toHaveProperty("narrative.answer",text);
  });
});
