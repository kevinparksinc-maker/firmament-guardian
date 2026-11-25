import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { askHost } from "./host";
import { followUp, generateChapter } from "./interpretation";
import { calculateChart, type ChartResult } from "./astronomy";
import { MASTER_INTERPRETER_PROMPT, FULL_SYNTHESIS_STYLE, DEEP_SYNTHESIS_METHOD, MINI_SYNTHESIS_STYLE, READING_BEHAVIOR_DIRECTIVE, buildAstrologyInterpreterSystem } from "./master-interpreter";

let chart: ChartResult;
beforeAll(async () => {
  chart = await calculateChart({
    location: "Dallas, Texas, USA", latitude: 32.7767, longitude: -96.797,
    timezone: "America/Chicago", date: "1986-11-20", time: "10:06",
    worldview: "agent", readingScope: "combined",
    transitLocation: "Las Vegas, Nevada, USA", transitLatitude: 36.1699,
    transitLongitude: -115.1398, transitTimezone: "America/Los_Angeles",
    transitDate: "2026-11-06", transitTime: "11:06",
  });
});

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
    expect(MASTER_INTERPRETER_PROMPT).toContain("psychological astrologer and narrative writer for The Absolute");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Use the full chart silently");
    expect(MASTER_INTERPRETER_PROMPT).toContain(READING_BEHAVIOR_DIRECTIVE);
    expect(MASTER_INTERPRETER_PROMPT).toContain("COMBINATION RECOGNITION");
    expect(FULL_SYNTHESIS_STYLE).toContain("Do not confuse one trine with a Grand Trine");
    expect(FULL_SYNTHESIS_STYLE).toContain("WHO ARE YOU — WHOLE-CHART HOMEPAGE MODE");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Taurus—neck/throat/voice");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Scorpio—reproductive and excretory regions");
    expect(MASTER_INTERPRETER_PROMPT).toContain("8—genital region/bladder");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Never infer a symptom, disease");
    expect(READING_BEHAVIOR_DIRECTIVE).toContain("IF YES — KILL IT");
    expect(READING_BEHAVIOR_DIRECTIVE).toContain("DO NOT rewrite it");
    expect(READING_BEHAVIOR_DIRECTIVE).toContain("Could this describe almost anybody?");
    expect(READING_BEHAVIOR_DIRECTIVE).toContain("VERBATIM");
    expect(MINI_SYNTHESIS_STYLE).toContain(READING_BEHAVIOR_DIRECTIVE);
    expect(MASTER_INTERPRETER_PROMPT).toContain("Write the life the reader recognizes");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Give natural gifts the same weight as difficult patterns");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Use short, bold section titles specific to this reader and topic");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Keep all astrology terminology out of the reader-facing text, including the titles");
    expect(MASTER_INTERPRETER_PROMPT).toContain("Use no bullet-point lists of traits");
    expect(MASTER_INTERPRETER_PROMPT).toContain("End with a sentence that belongs to this reader and this chart");
    expect(DEEP_SYNTHESIS_METHOD).toContain("Trace rulership chains");
    expect(DEEP_SYNTHESIS_METHOD).toContain("short, bold section title specific to this reader and topic");
    expect(DEEP_SYNTHESIS_METHOD).toContain("bullet-point lists of traits");
    expect(FULL_SYNTHESIS_STYLE).toContain(DEEP_SYNTHESIS_METHOD);
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
    expect(system).not.toContain("What this means for you");
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
