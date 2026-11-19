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
import {
  GENESIS_HISTORIAN_INSTRUCTIONS,
  GENESIS_QUESTIONS,
  buildGenesisInquiryPrompt,
} from "./genesisLifeStoryInquiry";

let SAMPLE_CHART: ChartResult;

describe("Life Story — chronology and Genesis 72-question evidence synthesis", () => {
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
      choices: [{
        message: {
          content: "You enter your school years as family circumstances begin to change. " +
            "An early opportunity for study could open a path beyond your first home, " +
            "though the same years may require material sacrifices that delay that opening.",
        },
      }],
    });
  });

  it("requires chronological life developments instead of personality or behavior analysis", () => {
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("THE ABSOLUTE LIFE HISTORIAN");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("A LIFE, NOT A PERSONALITY REPORT");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("72-QUESTION DEEP INVESTIGATION");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("single most plausible");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("FOLLOW THE CHRONOLOGY");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("ASTROLOGICAL POSSIBILITY IS NOT VERIFIED HISTORY");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).toContain("Keep all astrology jargon");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).not.toContain("Show what the reader does when a pattern is active");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).not.toContain("how their behavior lands with other people");
    expect(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS).not.toContain("psychological astrologer");
  });

  it("uses 72 silent biographical questions, including independently supported turning points", () => {
    expect(GENESIS_QUESTIONS).toHaveLength(72);
    expect(GENESIS_QUESTIONS[0].id).toBe(1);
    expect(GENESIS_QUESTIONS[71].id).toBe(72);
    expect(GENESIS_QUESTIONS.map(q => q.section)).toContain("Teenage Turning Points");
    expect(GENESIS_QUESTIONS.map(q => q.section)).toContain("Career and Public Achievement");
    expect(GENESIS_QUESTIONS.map(q => q.section)).toContain("Trials, Losses and Recoveries");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("life historian");
    expect(GENESIS_HISTORIAN_INSTRUCTIONS).toContain("Never turn this into a behavioral");
    const prompt = buildGenesisInquiryPrompt("Teenage years");
    expect(prompt).toContain("Investigate all 72 questions internally");
    expect(prompt).toContain("Teenage years");
    expect(prompt).not.toMatch(/What would this person's natural temperament look like/i);
    expect(prompt).not.toMatch(/How might they behave in a classroom/i);
  });

  it("returns eight chronological chapters with real-world life settings", () => {
    const cycles = generatePlanetaryCycles(SAMPLE_CHART, 38);
    const chapters = compileLifeStoryChapters(SAMPLE_CHART, 38, cycles);
    expect(chapters).toHaveLength(8);
    expect(chapters.map(c => c.key)).toEqual([
      "birth_origins", "childhood", "adolescence", "early_adulthood",
      "adult_development", "later_life", "turning_points", "future_chapters",
    ]);
    expect(chapters[0].title).toContain("Birth");
    expect(chapters[1].title).toContain("Childhood");
    expect(chapters[2].title).toContain("Teenage");
    expect(chapters[3].title).toContain("Young Adulthood");
    expect(chapters[4].title).toContain("Adult Years");
    expect(chapters[5].title).toContain("Later Years");
    expect(chapters[1].agentViewThemes).toContain("school");
    expect(chapters[4].agentViewThemes).toContain("career");
    expect(JSON.stringify({ cycles, chapters })).not.toMatch(/psychological crucible|emotional regulation|attachment wounds/i);
  });

  it("sends the event-focused Genesis inquiry and pinpoint instructions into the life-story AI pathway", async () => {
    const result = await generateLifeStoryChapter(SAMPLE_CHART, "childhood", 8);
    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    const callArg = mockInvokeLLM.mock.calls[0][0];
    expect(callArg.messages[0].role).toBe("system");
    expect(callArg.messages[0].content).toBe(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS);
    expect(callArg.messages[1].content).toContain("PINPOINT SILENT SYNTHESIS");
    expect(callArg.messages[1].content).toContain("72 Genesis questions");
    expect(callArg.messages[1].content).toContain("Childhood");
    expect(callArg.messages[1].content).toContain("Age ~");
    expect(callArg.messages[1].content).not.toContain("how their behavior lands");
    expect(result.title).toContain("Childhood");
    expect(result.content).toContain("family circumstances");
  });
});
