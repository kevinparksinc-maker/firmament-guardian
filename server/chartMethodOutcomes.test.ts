import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { calculateMasterChart } from "./masterChart/entry";
import { buildChartMethodOutcomes } from "./chartMethodOutcomes";
import { buildMasterPipeline } from "./master-pipeline";
import { MASTER_METHOD_IDS } from "./masterChart/registry";
import { packSynthesis } from "./astrologyKnowledge/synthesis/context";
import { invokeLLM } from "./_core/llm";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
beforeEach(() => {
  vi.mocked(invokeLLM).mockClear().mockImplementation(async request => {
    const payload = JSON.parse(String(request.messages[1].content));
    return { choices: [{ message: { content: JSON.stringify(
      Object.fromEntries(payload.requestedMethodIds.map((id: string, index: number) => [
        id, `This fixture gives the calculated finding a complete and distinct reading for entry ${index}.`,
      ]))
    ) }, finish_reason: "stop" }] } as never;
  });
});
const input={location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",worldview:"agent" as const,readingScope:"natal" as const,transitLocation:"Las Vegas",transitLatitude:36.1699,transitLongitude:-115.1398,transitTimezone:"America/Los_Angeles",transitDate:"2026-11-06",transitTime:"16:22"};
beforeEach(()=>{vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(new Date("2026-11-07T00:22:00Z"));});
afterEach(()=>vi.useRealTimers());
describe("My Chart method outcomes",()=>{
  it("publishes every individual natal outcome from the same chart and same judgments consumed by synthesis",async()=>{
    const chart=await calculateMasterChart(input);
    const displayed=await buildChartMethodOutcomes(chart,"natal");
    const master=await buildMasterPipeline(chart,"natal","Read the whole chart");
    expect(displayed.methods.map(m=>m.methodId)).toEqual(MASTER_METHOD_IDS);
    expect(displayed.snapshotId).toBe(master.synthesis.snapshotId);
    const packet=packSynthesis(master.synthesis);
    for(const method of displayed.methods){
      const actual=master.synthesis.methodOutcomes.find(o=>o.methodId===method.methodId)!;
      expect(method.findingJudgments).toEqual(actual.findingJudgments);
      expect(method.calculatedFindings).toEqual(actual.calculatedFindings);
      expect(method.formula.length).toBeGreaterThan(0);
      const packed=packet.methodOutcomes.find(o=>o.methodId===method.methodId)!;
      if(method.status==="interpreted") expect(packed.findingJudgments.map(row=>row[8])).toEqual(method.findingJudgments.map(f=>f.id));
    }
    expect(displayed.methods.find(m=>m.methodId==="chinese-lunar-mansions-xiu")?.status).toBe("reference-only");
    expect(displayed.methods.find(m=>m.methodId==="transit-activation-layer")?.status).toBe("not-applicable");
  });
  it("keeps all event methods separate from the base chart in combined mode",async()=>{
    const chart=await calculateMasterChart({...input,readingScope:"combined"});
    const result=await buildChartMethodOutcomes(chart,"combined");
    expect(result.methods).toHaveLength(MASTER_METHOD_IDS.length * 2);
    for(const id of MASTER_METHOD_IDS){
      const base=result.methods.find(m=>m.methodId===id)!;
      const event=result.methods.find(m=>m.methodId===`transit:${id}`)!;
      expect(base).toBeDefined();expect(event).toBeDefined();
      expect(event.chartScope).toBe("event");
      expect(event.findingJudgments.flatMap(f=>f.evidenceIds).every(id=>id.startsWith("transit:"))).toBe(true);
    }
  });
  it("rejects a partial method batch and retries the same snapshot", async () => {
    const chart = await calculateMasterChart({ ...input, time: "10:18" });
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "{}" }, finish_reason: "stop" }],
    } as never);
    await expect(buildChartMethodOutcomes(chart, "natal")).rejects.toThrow("METHOD_MINIS_INCOMPLETE");
    const complete = await buildChartMethodOutcomes(chart, "natal");
    expect(complete.methods.filter(method =>
      method.calculatedFindings.length || method.findingJudgments.length
    ).every(method => Boolean(method.aiMiniReading))).toBe(true);
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });
  it("refuses to display outcomes for positions that disagree with the calculated chart",async()=>{
    const chart=await calculateMasterChart(input);
    chart.movingBodies[0].longitude+=1;
    await expect(buildChartMethodOutcomes(chart,"natal")).rejects.toThrow("mismatch");
  });
});
