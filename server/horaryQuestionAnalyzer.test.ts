import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { ENV } from "./_core/env";
import { analyzeHoraryQuestionHeuristic, analyzeHoraryQuestionWithAI } from "./horaryQuestionAnalyzer";

const originalGroqKey = ENV.groqApiKey;

beforeEach(() => {
  mocked.invokeLLM.mockReset();
  ENV.groqApiKey = originalGroqKey;
});

describe("Horary question understanding and automatic house assignment", () => {
  it("classifies 'What does this app need to make it complete?' as solo H1/H5 creation with H6 and H10", () => {
    const result = analyzeHoraryQuestionHeuristic("What does this app need to make it complete?");
    expect(result.subject).toBe("querent");
    expect(result.subjectHouse).toBe(1);
    expect(result.topicHouse).toBe(5);
    expect(result.additionalHouses).toEqual(expect.arrayContaining([6, 10]));
    expect(result.isInterpersonal).toBe(false);
    expect(result.questionType).toBe("open_explanatory");
  });

  it("classifies 'What does my astrology app need to make it complete?' as app completion, never romance", () => {
    const result = analyzeHoraryQuestionHeuristic("What does my astrology app need to make it complete?");
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(5);
    expect(result.additionalHouses).toEqual(expect.arrayContaining([6, 10]));
    expect(result.isInterpersonal).toBe(false);
    expect(result.questionType).toBe("open_explanatory");
  });

  it("classifies 'Will I get this job?' to House 1 & House 10", () => {
    const result = analyzeHoraryQuestionHeuristic("Will I get this job?");
    expect(result.subject).toBe("querent");
    expect(result.subjectHouse).toBe(1);
    expect(result.topicHouse).toBe(10);
    expect(result.questionType).toBe("yes_no");
    expect(result.isInterpersonal).toBe(false);
  });

  it("turns 'Will my brother get married?' from House 3 brother to 7th from 3rd", () => {
    const result = analyzeHoraryQuestionHeuristic("Will my brother get married?");
    expect(result.subject).toBe("other");
    expect(result.subjectHouse).toBe(3);
    expect(result.topicHouse).toBe(7);
    expect(result.isInterpersonal).toBe(true);
    expect(result.questionType).toBe("yes_no");
  });

  it("classifies 'Will my business succeed?' to House 10 plus Houses 2 and 8", () => {
    const result = analyzeHoraryQuestionHeuristic("Will my business succeed?");
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(10);
    expect(result.additionalHouses).toEqual(expect.arrayContaining([2, 8]));
    expect(result.isInterpersonal).toBe(false);
  });

  it("classifies 'Where is my missing wallet?' to House 2 and House 4 as location", () => {
    const result = analyzeHoraryQuestionHeuristic("Where is my missing wallet?");
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(2);
    expect(result.additionalHouses).toContain(4);
    expect(result.questionType).toBe("location");
    expect(result.isInterpersonal).toBe(false);
  });

  it("classifies 'Will my application be approved?' without defaulting to romance", () => {
    const result = analyzeHoraryQuestionHeuristic("Will my application be approved?");
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(10);
    expect(result.isInterpersonal).toBe(false);
    expect(result.questionType).toBe("yes_no");
  });

  it("classifies 'What is preventing my project from being completed?' to Houses 5, 6, 10 as open_explanatory", () => {
    const result = analyzeHoraryQuestionHeuristic("What is preventing my project from being completed?");
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(5);
    expect(result.additionalHouses).toEqual(expect.arrayContaining([6, 10]));
    expect(result.questionType).toBe("open_explanatory");
    expect(result.isInterpersonal).toBe(false);
  });

  it("calls Step 1 AI analyzer when provider is configured and blocks accidental House 7 classification on apps", async () => {
    ENV.groqApiKey = "test-key";
    mocked.invokeLLM.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              subject: "other",
              subjectHouse: 7,
              topicHouse: 7,
              additionalHouses: [11],
              matterSubject: "romantic partner",
              intendedOutcome: "mutual commitment",
              questionType: "yes_no",
              isInterpersonal: true,
              reasoning: "Partner relationship question",
            }),
          },
        },
      ],
    });

    const result = await analyzeHoraryQuestionWithAI("What does this app need to make it complete?");
    expect(mocked.invokeLLM).toHaveBeenCalledTimes(1);
    expect(result.subject).toBe("querent");
    expect(result.topicHouse).toBe(5);
    expect(result.additionalHouses).toEqual(expect.arrayContaining([6, 10]));
    expect(result.isInterpersonal).toBe(false);
    expect(result.questionType).toBe("open_explanatory");
  });
});
