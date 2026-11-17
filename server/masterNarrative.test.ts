import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart/builder";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import { narrateMasterSynthesis } from "./astrologyKnowledge/synthesis/narrative";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import { invokeLLM } from "./_core/llm";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
let synthesis: SynthesisResult;
const text = "You seek a life that answers to your own judgment. Your strongest drive and the pressures around it must be understood together through this chart’s actual layers.";
const response = (content = text, finish_reason = "stop") => ({id:"test",created:0,model:"test",choices:[{index:0,finish_reason,message:{role:"assistant" as const,content}}]});
beforeAll(async () => {
  const snapshot = await buildUnifiedMasterChart({location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",mode:"combined",transitDate:"2026-11-06",transitTime:"16:22",transitLocation:"Las Vegas",transitLatitude:36.1699,transitLongitude:-115.1398,transitTimezone:"America/Los_Angeles"});
  synthesis = (await synthesizeMasterSnapshot(snapshot,"combined","Read this moment")).synthesis;
});
beforeEach(() => vi.mocked(invokeLLM).mockReset());
describe("AI master reading", () => {
  it("delivers canonical chart context and uses returned non-empty narrative cleanly", async () => {
    const longAnswer = `${text} `.repeat(3).trim();
    vi.mocked(invokeLLM).mockResolvedValue(response(longAnswer));
    const failedAudit = { ...synthesis, qualityAudit: { ...synthesis.qualityAudit, passed: false } };
    const result = await narrateMasterSynthesis(failedAudit, "Read my Sun and Moon");
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(String(request.messages[0].content)).toContain("Do not repeat the same placement in more than one section");
    expect(String(request.messages[1].content)).toContain("PLANET PERSONA CANON MATRIX");
    expect(result.narrative.answer).toContain(text);
    expect(result.calculatedNarrative).toEqual(synthesis.integratedNarrative);
    expect(result.narrativeAudit.deliveredMethodIds).toHaveLength(synthesis.sourceSnapshot.methodExecutionLedger.length);
  });

  it("rejects truncated and empty output before returning a later complete AI reading", async () => {
    const longAnswer = `${text} `.repeat(3).trim();
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce(response(longAnswer, "length"))
      .mockResolvedValueOnce(response(" "))
      .mockResolvedValueOnce(response(longAnswer));

    await expect(narrateMasterSynthesis(synthesis, "Read my Sun")).rejects.toThrow("MASTER_READING_INCOMPLETE");
    await expect(narrateMasterSynthesis(synthesis, "Read my Sun")).rejects.toThrow("MASTER_READING_EMPTY");
    const third = await narrateMasterSynthesis(synthesis, "Read my Sun");
    expect(third.narrative.answer).toContain(text);
  });
});
