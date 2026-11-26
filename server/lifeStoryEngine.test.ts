import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockInvokeLLM } = vi.hoisted(() => ({
  mockInvokeLLM: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: mockInvokeLLM,
}));

import { calculateChart, type ChartResult } from "./astronomy";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { buildVimshottariTimeline } from "./astrologyKnowledge/vedic/timingAndAshtakavarga";
import {
  LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS,
  compileLifeStoryChapters,
  collectChapterDashaEvidence,
  parseLifeStoryPlan,
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
    mockInvokeLLM.mockImplementation(async (request) => {
      const message = request.messages.find((m: {role: string; content: string}) =>
        m.role === "user" && m.content.includes("## VEDIC TIMING THROUGHOUT THE REQUESTED STAGE"));
      const line = message.content.split("\n").find((value: string) => value.startsWith('{"start":') && value.includes('"windows":'));
      const packet = JSON.parse(line);
      const window = packet.windows.find((value: {level: string}) => value.level === "Antardasha");
      const { synthesis } = await synthesizeChartForReading(SAMPLE_CHART, "natal", "2. Childhood: Home, School & First Discoveries");
      const method = synthesis.methodOutcomes.find(m => /vedic|jyotish|parashar/i.test(m.tradition) && m.calculatedFindings.length);
      if (!method) throw new Error("Fixture has no Vedic calculation evidence");
      const id = method.calculatedFindings[0].evidenceId;
      return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        beats: [{
          period: "Childhood", lifeDomain: "Education", configuration: "Fixture chart evidence",
          manifestation: "Potential educational opening", consequence: "Possible change in available schooling",
          timingBasis: "Calculated chapter window", findingIds: [id, window.id],
          counterEvidenceIds: [], vedicEvidenceIds: [id], timingWindowIds: [window.id],
          soulDevelopment: "Cultivation of a skill", behavioralResponse: "Practice",
          prose: "You enter your school years as family circumstances begin to change. An early opportunity for study could open a path beyond your first home."
        }], gaps: []
      }) } }] };
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
    expect(callArg.messages[0].content).toContain(LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS);
    expect(callArg.messages[0].content).toContain("70/30 EDITORIAL TARGET");
    const prompt = callArg.messages.find((m: {role: string; content: string}) => m.role === "user" && m.content.includes("PINPOINT SILENT SYNTHESIS")).content;
    expect(prompt).toContain("PINPOINT SILENT SYNTHESIS");
    expect(prompt).toContain("72 Genesis questions");
    expect(prompt).toContain("Childhood");
    expect(prompt).toContain("Age ~");
    expect(prompt).not.toContain("how their behavior lands");
    expect(result.title).toContain("Childhood");
    expect(result.content).toContain("family circumstances");
    const beat = result.genesisPlan.beats[0];
    expect(beat.vedicEvidenceIds?.length).toBeGreaterThan(0);
    expect(beat.timingWindowIds?.[0]).toBe(result.genesisPlan.chapterDasha?.windows.find(w => w.level === "Antardasha")?.id);
    expect(result.genesisPlan.gaps).toEqual([]);
  });
  it("includes every overlapping major/subperiod and clips windows at both chapter boundaries", () => {
    const chapter = collectChapterDashaEvidence(SAMPLE_CHART, [1, 13]);
    const source = buildVimshottariTimeline(SAMPLE_CHART);
    expect(source.available).toBe(true);
    if (!source.available) throw new Error(source.reason);
    const expected = source.periods.flatMap(maha => [
      { level: "Mahadasha", ...maha },
      ...maha.antardashas.map(ad => ({ level: "Antardasha", ...ad })),
    ]).filter(w => w.start < chapter.end && w.end > chapter.start);
    expect(chapter.windows).toHaveLength(expected.length);
    expect(chapter.windows.every(w => w.chapterStart >= chapter.start && w.chapterEnd <= chapter.end)).toBe(true);
    const major = chapter.windows.filter(w => w.level === "Mahadasha");
    expect(major[0].chapterStart).toBe(chapter.start);
    expect(major.at(-1)?.chapterEnd).toBe(chapter.end);
    expect(new Set(chapter.windows.map(w => w.id)).size).toBe(chapter.windows.length);
    expect(chapter.gaps).toEqual([]);
    const next = collectChapterDashaEvidence(SAMPLE_CHART, [13, 20]);
    for (const w of chapter.windows.filter(w => w.end > chapter.end))
      expect(next.windows.some(n => n.id === w.id)).toBe(true);
  });

  it("withholds exact Dasha timing for unknown birth time and retains the gap in parsed plans", () => {
    const unknown = { ...SAMPLE_CHART, input: { ...SAMPLE_CHART.input, birthTimeKnown: false } };
    const timing = collectChapterDashaEvidence(unknown, [1, 13]);
    expect(timing.windows).toEqual([]);
    expect(timing.gaps[0]).toMatch(/birth time/i);
    expect(() => parseLifeStoryPlan({ beats: [{
      period: "Childhood", lifeDomain: "School", configuration: "Invented",
      manifestation: "Opening", consequence: "Change", timingBasis: "Invented date",
      findingIds: ["invented-id"], timingWindowIds: ["invented-id"], prose: "An opening."
    }] }, [], timing)).toThrow(/PLAN_INCOMPLETE/);
  });
});
