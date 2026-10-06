import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import {
  followUp,
  generateChapter,
  generateInterpretation,
} from "../interpretation";
import type { ChartResult } from "../astronomy";

const chart = {
  input: {
    location: "Synthetic City",
    latitude: 0,
    longitude: 0,
    timezone: "UTC",
    date: "1990-01-01",
    time: "12:00",
  },
  utc: "1990-01-01T12:00:00.000Z",
  julianDay: 2447893,
  worldview: "agent",
  readingScope: "natal",
  agentViewAvailable: true,
  ascendant: {
    name: "Ascendant",
    longitude: 100,
    display: "Cancer 10°00′",
    house: 1,
    godHouse: 4,
    agentHouse: 1,
  },
  descendant: null,
  midheaven: null,
  northNode: {
    name: "North Node",
    longitude: 20,
    display: "Aries 20°00′",
    house: 10,
  },
  southNode: {
    name: "South Node",
    longitude: 200,
    display: "Libra 20°00′",
    house: 4,
  },
  houses: [],
  movingBodies: [
    {
      name: "Sun",
      longitude: 10,
      display: "Aries 10°00′",
      house: 10,
      godHouse: 1,
      agentHouse: 10,
    },
    {
      name: "Moon",
      longitude: 12,
      display: "Aries 12°00′",
      house: 10,
      godHouse: 1,
      agentHouse: 10,
    },
    {
      name: "Venus",
      longitude: 190,
      display: "Libra 10°00′",
      house: 4,
      godHouse: 7,
      agentHouse: 4,
    },
  ],
  frozenStars: [],
  godPlacements: [],
  transitDate: "1990-01-01T12:00:00.000Z",
  momentPrecision: "exact",
  transitHouseFrame: "natal-location",
  transits: [],
  validation: { passed: true, notes: [] },
} as unknown as ChartResult;

describe("interpretation.generate knowledge gateway integration", () => {
  beforeEach(() => {
    mocked.invokeLLM.mockReset();
    mocked.invokeLLM.mockResolvedValue({
      choices: [
        {
          message: { role: "assistant", content: "not a valid plan" },
          finish_reason: "stop",
        },
      ],
    });
  });

  it("runs question planning and evidence retrieval before the Master Interpreter request", async () => {
    const result = await generateInterpretation(
      chart,
      "natal",
      "Why do relationships keep repeating the same pattern for me?"
    );
    expect(result.evidencePacket.plan.subjects).toEqual(
      expect.arrayContaining(["7th-house", "7th-lord", "D9"])
    );
    expect(result.intelligence).toContain("ASTROLOGY EVIDENCE PACKET");
    const userPrompts = mocked.invokeLLM.mock.calls.map(call =>
      String(
        call[0].messages.find(
          (message: { role: string }) => message.role === "user"
        )?.content ?? ""
      )
    );
    expect(
      userPrompts.some(
        prompt =>
          prompt.includes("ASTROLOGY EVIDENCE PACKET") &&
          prompt.includes("Why do relationships")
      )
    ).toBe(true);

    await generateChapter(
      chart,
      "natal",
      result.intelligence,
      "relationships",
      [],
      result.analysis
    );
    await followUp(
      chart,
      { intelligence: result.intelligence, reading: "Synthetic reading" },
      [],
      "What does that mean specifically for marriage?",
      "natal"
    );
    const laterPrompts = mocked.invokeLLM.mock.calls.map(call =>
      String(
        call[0].messages.find(
          (message: { role: string }) => message.role === "user"
        )?.content ?? ""
      )
    );
    expect(
      laterPrompts.some(
        prompt =>
          prompt.includes("ASTROLOGY EVIDENCE PACKET") &&
          prompt.includes("Chapter focus: Relationships")
      )
    ).toBe(true);
    expect(
      laterPrompts.some(
        prompt =>
          prompt.includes("ASTROLOGY EVIDENCE PACKET") &&
          prompt.includes("specifically for marriage")
      )
    ).toBe(true);
  });
});
