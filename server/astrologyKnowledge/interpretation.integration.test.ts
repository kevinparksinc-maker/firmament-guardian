import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import {
  followUp,
  generateChapter,
  generateInterpretation,
} from "../interpretation";
import { calculateChart, type ChartResult } from "../astronomy";

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

describe("interpretation.generate knowledge gateway integration", () => {
  beforeEach(() => {
    mocked.invokeLLM.mockReset();
    mocked.invokeLLM.mockImplementation(async request => {
      const system = request.messages.find((message: { role: string }) => message.role === "system")?.content || "";
      const plan = {
        threads: [
          { title: "Solar pattern", insight: "Fixture solar evidence.", evidence: ["Sun"], chapters: ["identity", "work-purpose"] },
          { title: "Lunar pattern", insight: "Fixture lunar evidence.", evidence: ["Moon"], chapters: ["mind-heart", "relationships"] },
        ],
        tensions: [],
        chapters: Object.fromEntries(["identity", "mind-heart", "relationships", "work-purpose"].map(id => [id, { angle: "Fixture evidence", evidence: [id === "identity" ? "Sun" : "Moon"] }])),
      };
      const content = system.includes("silent first reader") ? JSON.stringify(plan) : "A synthetic interpretation grounded in the supplied chart evidence. ".repeat(8);
      return { choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] };
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
    expect(result.evidencePacket.vedicEvidence.some(item => item.technique === "dasha")).toBe(true);
    expect(result.evidencePacket.vedicEvidence.some(item => item.technique === "ashtakavarga")).toBe(true);
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
    expect(userPrompts.some(prompt => prompt.includes("[vedic/dasha]") && prompt.includes("[vedic/ashtakavarga]"))).toBe(true);

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

  it("rejects invented evidence labels in the reading plan", async () => {
    const plan = {
      threads: [
        {
          title: "Calculated pattern",
          insight:
            "A selected Genesis pattern should remain available to the reading.",
          evidence: ["Stellium in Scorpio"],
          chapters: ["work-purpose"],
        },
        {
          title: "Selected activation",
          insight:
            "A selected activation should remain available to the reading.",
          evidence: ["Genesis Astro Engine activation"],
          chapters: ["mind-heart"],
        },
      ],
      tensions: [],
      chapters: {
        identity: { angle: "identity", evidence: ["Stellium in Scorpio"] },
        "mind-heart": {
          angle: "mind",
          evidence: ["Genesis Astro Engine activation"],
        },
        relationships: { angle: "relationships", evidence: ["Venus"] },
        "work-purpose": { angle: "work", evidence: ["Stellium in Scorpio"] },
      },
    };
    mocked.invokeLLM.mockResolvedValueOnce({
      choices: [
        { message: { role: "assistant", content: JSON.stringify(plan) } },
      ],
    });
    await expect(generateInterpretation(
      chart,
      "natal",
      "What is the major pattern affecting my career?"
    )).rejects.toThrow("READING_PLAN_FAILED");
    expect(mocked.invokeLLM).toHaveBeenCalledTimes(1);
  });
});
