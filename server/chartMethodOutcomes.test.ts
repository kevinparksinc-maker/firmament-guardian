import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { calculateMasterChart } from "./masterChart/entry";
import { buildChartMethodOutcomes, buildMethodOutcomeBatches } from "./chartMethodOutcomes";
import { buildMasterPipeline } from "./master-pipeline";
import { MASTER_METHOD_IDS } from "./masterChart/registry";
import { packSynthesis } from "./astrologyKnowledge/synthesis/context";
import { decodeEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import type { MethodOutcome } from "./astrologyKnowledge/synthesis/types";
import { invokeLLM } from "./_core/llm";
const input={location:"Dallas",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",worldview:"agent" as const,readingScope:"natal" as const,transitLocation:"Las Vegas",transitLatitude:36.1699,transitLongitude:-115.1398,transitTimezone:"America/Los_Angeles",transitDate:"2026-11-06",transitTime:"16:22"};
beforeEach(()=>{
  vi.useFakeTimers({toFake:["Date"]});
  vi.setSystemTime(new Date("2026-11-07T00:22:00Z"));
  vi.mocked(invokeLLM).mockImplementation(async (request: any) => {
    const packet = decodeEvidence(JSON.parse(request.messages[1].content));
    const readings = Object.fromEntries(packet.methodOutcomes.map((method: any) => [method.methodId, `Reading for ${method.methodId}`]));
    return { choices: [{ message: { content: JSON.stringify(readings) }, finish_reason: "stop" }] } as any;
  });
});
afterEach(()=>vi.useRealTimers());
function miniOutcome(methodId: string): MethodOutcome {
  const evidenceId = `evidence-${methodId}`;
  return {
    methodId,
    methodName: `Method ${methodId}`,
    tradition: "test",
    chartScope: "natal",
    frame: "shared",
    status: "interpreted",
    calculatedFindings: [{ evidenceId, label: "finding", calculatedValue: "calculated fact ".repeat(12) }],
    findingJudgments: [{ id: `finding-${methodId}`, subject: "Sun", domain: "identity", judgment: "A specific judgment.", mechanism: "validated rule", valence: "neutral", strength: "moderate", evidenceIds: [evidenceId], rules: [] }],
    canonApplications: [{ canonEvidenceId: `canon-${methodId}`, ruleId: "rule-test", sourceId: "source-test", sourceTitle: "Test source", technique: "test", subject: "Sun", statement: "Supplied Canon doctrine.", calculationEvidenceIds: [evidenceId], confidence: "high" }],
    interpretation: "A specific interpretation.",
    judgment: "A specific judgment.",
    contribution: "One finding contributes.",
    evidenceIds: [evidenceId],
    strengthAndLimitations: [],
    missingCanon: false,
  };
}

describe("bounded chart-method AI packets", () => {
  it("preserves all methods and attached Canon in bounded packets without raw chart payloads", () => {
    const methods = Array.from({ length: 8 }, (_, index) => miniOutcome(`method-${index}`));
    const batches = buildMethodOutcomeBatches("snapshot-1", "combined", methods, 2_000);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every(batch => batch.content.length <= 2_000)).toBe(true);
    const decoded = batches.flatMap(batch => {
      const packet = decodeEvidence(JSON.parse(batch.content) as any) as any;
      expect(packet.snapshotId).toBe("snapshot-1");
      expect(packet.mode).toBe("combined");
      expect(packet).not.toHaveProperty("snapshot");
      expect(packet).not.toHaveProperty("chartFacts");
      expect(packet.methodOutcomes.every((method: any) => !("interpretation" in method) && !("judgment" in method))).toBe(true);
      expect(packet.canonApplications.length).toBeGreaterThan(0);
      return packet.methodOutcomes.map((method: any) => ({ ...method, canonApplications: packet.canonApplications }));
    });
    expect(decoded.map((method: MethodOutcome) => method.methodId)).toEqual(methods.map(method => method.methodId));
    expect(decoded.every((method: any) => method.canonApplicationIds[0] === `canon-${method.methodId}`)).toBe(true);
    expect(batches.every(batch => batch.content.length <= 2_000)).toBe(true);
  });

  it("fails explicitly rather than truncating a single oversized method outcome", () => {
    expect(() => buildMethodOutcomeBatches("snapshot-1", "natal", [miniOutcome("large")], 10)).toThrow("METHOD_MINI_READING_TOO_LARGE");
  });
});

describe("My Chart method outcomes",()=>{
  it("publishes every individual natal outcome from the same chart and same judgments consumed by synthesis",async()=>{
    const chart=await calculateMasterChart(input);
    const displayed=await buildChartMethodOutcomes(chart,"natal");
    const master=await buildMasterPipeline(chart,"natal","Read the whole chart");
    const sentMethods = vi.mocked(invokeLLM).mock.calls.flatMap(([request]: any) => {
      const content = request.messages[1].content as string;
      expect(content.length).toBeLessThanOrEqual(180_000);
      const packet = decodeEvidence(JSON.parse(content)) as any;
      expect(packet).not.toHaveProperty("snapshot");
      return packet.methodOutcomes.map((method: any) => method.methodId);
    });
    expect(sentMethods.sort()).toEqual(master.synthesis.methodOutcomes.filter(method => method.status === "interpreted").map(method => method.methodId).sort());
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
  it("refuses to display outcomes for positions that disagree with the calculated chart",async()=>{
    const chart=await calculateMasterChart(input);
    chart.movingBodies[0].longitude+=1;
    await expect(buildChartMethodOutcomes(chart,"natal")).rejects.toThrow("mismatch");
  });
});
