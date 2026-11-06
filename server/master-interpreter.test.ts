import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { askHost } from "./host";
import { followUp, generateChapter } from "./interpretation";
import type { ChartResult } from "./astronomy";
import { MASTER_INTERPRETER_PROMPT, buildAstrologyInterpreterSystem } from "./master-interpreter";

const chart = {
  input: { location: "Synthetic Test City", date: "1990-01-01", time: "12:00", timezone: "UTC" },
  utc: "1990-01-01T12:00:00.000Z",
  julianDay: 2447893,
  ascendant: { display: "Libra 12°00′" },
  descendant: { display: "Aries 12°00′" },
  northNode: { display: "Aquarius 4°00′", house: 5 },
  southNode: { display: "Leo 4°00′", house: 11 },
  houses: [],
  movingBodies: [],
  frozenStars: [],
  transitDate: "2025-01-01T12:00:00.000Z",
  transits: [],
  validation: [],
} as unknown as ChartResult;

function systemPromptFromLastCall() {
  const request = mocked.invokeLLM.mock.calls.at(-1)?.[0] as { messages: Array<{ role: string; content: string }> };
  return request.messages.find(message => message.role === "system")?.content ?? "";
}

beforeEach(() => {
  mocked.invokeLLM.mockReset();
  mocked.invokeLLM.mockResolvedValue({
    choices: [{ message: { role: "assistant", content: "A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. A synthetic interpretation grounded in the supplied chart evidence. " } }],
  });
});

describe("Master Interpreter prompt coverage", () => {
  it("keeps the current replacement interpretation contract and domain instructions", () => {
    expect(MASTER_INTERPRETER_PROMPT).toContain("THE ABSOLUTE — INTERPRETATION ENGINE");
    expect(MASTER_INTERPRETER_PROMPT).toContain("The calculation engine supplies positions");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Read the relevant evidence from all supplied traditions");
    expect(MASTER_INTERPRETER_PROMPT).toContain("WHAT the configuration indicates, WHY");
    expect(MASTER_INTERPRETER_PROMPT).toContain("without flattering, sugarcoating");
    expect(buildAstrologyInterpreterSystem("fixture domain instruction")).toContain("fixture domain instruction");

  });

  it("writes chapters from a distilled prompt, the evidence sheet, and the reading plan", async () => {
    const analysis = JSON.stringify({
      threads: [{ title: "Test thread", insight: "A synthetic insight.", evidence: ["Sun — Aries 1°"], chapters: ["identity"] }],
      tensions: [],
      chapters: { identity: { angle: "A synthetic angle.", evidence: ["Sun — Aries 1°"] } },
    });
    await generateChapter(chart, "natal", "synthetic chart intelligence", "identity", [], analysis);
    const request = mocked.invokeLLM.mock.calls.at(-1)?.[0] as { messages: Array<{ role: string; content: string }> };
    const system = systemPromptFromLastCall();
    const user = request.messages.find(message => message.role === "user")?.content ?? "";
    expect(system).toContain(MASTER_INTERPRETER_PROMPT);
    expect(system).toContain("What this means for you");
    expect(system).toContain("Follow the reading plan");
    expect(user).toContain("CHART EVIDENCE SHEET");
    expect(user).toContain("READING PLAN");
    expect(user).toContain("Test thread");
  });

  it("attaches the Master Interpreter to chart-anchored interpretive follow-ups", async () => {
    await followUp(chart, { intelligence: "synthetic", reading: "synthetic" }, [], "What does this pattern mean?", "combined");
    expect(systemPromptFromLastCall()).toContain(MASTER_INTERPRETER_PROMPT);
  });

  it("attaches the Master Interpreter to model-backed Host responses", async () => {
    await askHost([], "What might a supplied Saturn placement mean in relationships?");
    expect(systemPromptFromLastCall()).toContain(MASTER_INTERPRETER_PROMPT);
    expect(systemPromptFromLastCall()).toContain("The Absolute's Host Interpreter");
  });
});
