import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockInvokeLLM } = vi.hoisted(() => ({
  mockInvokeLLM: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: mockInvokeLLM,
}));

import { calculateChart, type ChartResult } from "./astronomy";
import {
  LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS,
  compileLifeStoryChapters,
  generateLifeStoryChapter,
  generatePlanetaryCycles,
} from "./lifeStoryEngine";
import { GENESIS_HISTORIAN_INSTRUCTIONS } from "./genesisLifeStoryInquiry";

let SAMPLE_CHART: ChartResult;

describe("LifeStoryPage Engine System Instructions & Chapters", () => {
  beforeAll(async () => {
    SAMPLE_CHART = await calculateChart({
      date: "1986-11-20",
      time: "10:06",
      location: "Dallas, TX",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      worldview: "agent",
    });
  });
  beforeEach(() => {
    mockInvokeLLM.mockReset();
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "From your earliest years in that household, your core identity took shape around steady self-reliance. " +
              "These emotional regulation habits and protective strategies showed up early, yet your real gift was learning by doing.",
          },
        },
      ],
    });
  });

  it("incorporates the 12 life areas, core identity / childhood roots / life-script focus, and zero-astrology rule in system instructions", () => {
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("psychological astrologer and narrative writer for The Absolute");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("USE THE FULL CHART SILENTLY");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("12 life areas");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toMatch(/core identity/i);
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toMatch(/childhood roots/i);
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toMatch(/life-script/i);
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("Give natural gifts");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("Use no bullet-point lists of traits");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("Keep ALL astrology terminology out of the reader-facing text");

    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("core identity");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("childhood roots");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("life-script");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("12 Life Areas");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("no bullet-point lists of traits");
  });

  it("keeps planetary cycles and chronological chapters free of clinical/cosmic clichés", () => {
    const cycles = generatePlanetaryCycles(SAMPLE_CHART, 38);
    const chapters = compileLifeStoryChapters(SAMPLE_CHART, 38, cycles);
    const serialized = JSON.stringify({ cycles, chapters });

    expect(serialized).not.toMatch(/psychological crucible/i);
    expect(serialized).not.toMatch(/psychological rebirth/i);
    expect(serialized).not.toMatch(/Cosmic Liberation/i);
    expect(serialized).not.toMatch(/attachment wounds/i);
    expect(serialized).not.toMatch(/emotional regulation/i);
  });

  it("sends LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS to the LLM and scrubs clinical leaks from output", async () => {
    const result = await generateLifeStoryChapter(SAMPLE_CHART, "childhood", 8);

    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    const callArg = mockInvokeLLM.mock.calls[0][0];
    expect(callArg.messages[0].role).toBe("system");
    expect(callArg.messages[0].content).toBe(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS);
    expect(callArg.messages[1].content).toContain("life-script development");

    expect(result.content).not.toMatch(/emotional regulation/i);
    expect(result.content).not.toMatch(/protective strategies/i);
  });
});
