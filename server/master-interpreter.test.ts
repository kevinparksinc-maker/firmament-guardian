import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { askHost } from "./host";
import { followUp, generateChapter } from "./interpretation";
import type { ChartResult } from "./astronomy";
import { ASTROLOGY_INTERPRETATION_ADAPTER, MASTER_INTERPRETER_PROMPT } from "./master-interpreter";

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
    choices: [{ message: { role: "assistant", content: "A concise synthetic interpretation response." } }],
  });
});

describe("Master Interpreter prompt coverage", () => {
  it("keeps the full supplied operating instructions and astrology-only source-of-truth adapter", () => {
    expect(MASTER_INTERPRETER_PROMPT.split(/\s+/)).toHaveLength(3172);
    expect(MASTER_INTERPRETER_PROMPT).toContain("KNOWLEDGE IS THE MATERIAL.");
    expect(MASTER_INTERPRETER_PROMPT).toContain("UNDERSTANDING IS THE RESULT.");
    expect(MASTER_INTERPRETER_PROMPT).not.toContain("The next thing I'd build");
    expect(ASTROLOGY_INTERPRETATION_ADAPTER).toContain("calculation engine and the supplied chart evidence are the sole source of chart facts");
  });

  it("attaches the Master Interpreter to generated chart chapters", async () => {
    await generateChapter(chart, "natal", "synthetic chart intelligence", "identity");
    expect(systemPromptFromLastCall()).toContain(MASTER_INTERPRETER_PROMPT);
    expect(systemPromptFromLastCall()).toContain(ASTROLOGY_INTERPRETATION_ADAPTER);
    expect(systemPromptFromLastCall()).toContain("CLARITY, PRECISION & ELABORATION FRAMEWORK");
  });

  it("attaches the Master Interpreter to chart-anchored interpretive follow-ups", async () => {
    await followUp(chart, { intelligence: "synthetic", reading: "synthetic" }, [], "What does this pattern mean?", "combined");
    expect(systemPromptFromLastCall()).toContain(MASTER_INTERPRETER_PROMPT);
    expect(systemPromptFromLastCall()).toContain(ASTROLOGY_INTERPRETATION_ADAPTER);
  });

  it("attaches the Master Interpreter to model-backed Host responses", async () => {
    await askHost([], "What might a supplied Saturn placement mean in relationships?");
    expect(systemPromptFromLastCall()).toContain(MASTER_INTERPRETER_PROMPT);
    expect(systemPromptFromLastCall()).toContain(ASTROLOGY_INTERPRETATION_ADAPTER);
    expect(systemPromptFromLastCall()).toContain("product host for this exact engine");
  });
});
