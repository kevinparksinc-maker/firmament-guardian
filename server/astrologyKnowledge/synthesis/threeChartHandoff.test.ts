import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SynthesisResult } from "./types";

const invoke = vi.hoisted(() => vi.fn(async (_request: unknown) => ({
  choices: [{ message: { content: "One grounded, coherent reading." }, finish_reason: "stop" }],
})));
vi.mock("../../_core/llm", () => ({ invokeLLM: invoke }));

import { runInterpretation } from "./interpretationPipeline";

function ledger(mode: "natal" | "combined", role?: "event"): SynthesisResult {
  const chart = {
    input: { chartRole: role },
    worldview: "agent-vs-god",
    agentViewAvailable: role !== "event",
    utc: "2026-11-18T12:00:00.000Z",
    transitDate: "2026-11-18T19:00:00.000Z",
    houses: Array(12).fill(0),
    ascendant: null,
    movingBodies: [
      { name: "Sun", longitude: 42, display: "Taurus 12°", godHouse: 2, agentHouse: 10 },
    ],
    northNode: { name: "North Node", longitude: 45, display: "Taurus 15°", godHouse: 2, agentHouse: 10 },
    southNode: { name: "South Node", longitude: 225, display: "Scorpio 15°", godHouse: 8, agentHouse: 4 },
    transits: [{
      name: "Mars", longitude: 132, display: "Leo 12°", godHouse: 5, agentHouse: 2,
      natalContacts: [{ natalName: "Sun", aspect: "square", orb: 0.5 }],
      minorNatalContacts: [],
    }],
  };
  return {
    mode,
    snapshotId: "test-snapshot",
    sourceSnapshot: {
      natal: chart,
      transit: mode === "combined"
        ? { transitInstantUtc: chart.transitDate, planets: chart.transits, aspectsToNatal: [] }
        : undefined,
      methodExecutionLedger: [],
    },
    methodOutcomes: [],
    canonApplications: [],
    themes: [],
    contradictionsAndTensions: [],
  } as unknown as SynthesisResult;
}

describe("universal three-chart interpretation handoff", () => {
  beforeEach(() => invoke.mockClear());

  it("transmits calculated three-chart relationships in a combined reading", async () => {
    await runInterpretation("MASTER_READING", ledger("combined"), {
      messages: [{ role: "system", content: "Reader" }, { role: "user", content: "Question" }],
    });
    const request = invoke.mock.calls[0][0] as { messages: Array<{ role: string; content: string }> };
    const packet = request.messages.map(m => m.content).join("\n");
    expect(packet).toContain("horary-style-three-chart-testimony");
    expect(packet).toContain("natalAgent");
    expect(packet).toContain("natalGod");
    expect(packet).toContain("currentGod");
    expect(packet).toContain("square");
    expect(packet).toContain("sharedBirthPositionsCountOnce");
  });

  it("does not inject current-sky testimony into natal-only readings", async () => {
    await runInterpretation("CHART_HOST", ledger("natal"), {
      messages: [{ role: "user", content: "Who am I?" }],
    });
    const request = invoke.mock.calls[0][0] as { messages: Array<{ content: string }> };
    const text = request.messages.map(m => m.content).join("\n");
    expect(text).toContain('"currentGod":null');
  });

  it("preserves the reference placement question while adding the three-view discipline", async () => {
    await runInterpretation("PLACEMENT", ledger("natal"), {
      messages: [{ role: "user", content: "REFERENCE PROMPT" }],
    }, "placement-reference");
    const request = invoke.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(request.messages[0].content.startsWith("REFERENCE PROMPT")).toBe(true);
    expect(request.messages.map(m => m.content).join("\n")).toContain("THREE-CHART TESTIMONY");
  });

  it("preserves separate natal ledgers in synastry without inventing transits", async () => {
    await runInterpretation("SYNASTRY", [ledger("natal"), ledger("natal")], {
      messages: [{ role: "user", content: "Compare these charts" }],
    });
    const request = invoke.mock.calls[0][0] as { messages: Array<{ content: string }> };
    const text = request.messages.map(m => m.content).join("\n");
    expect((text.match(/horary-style-three-chart-testimony/g) ?? []).length).toBe(2);
  });
});
