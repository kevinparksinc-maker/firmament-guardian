import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateMasterChart } from "../masterChart/entry";
import { synthesizePlacement } from "./orchestrator";
import { calculateArabicLots } from "../utils/arabicLots";
import { findFixedStarContactsForLongitude, majorLongitudeContact } from "../astrologyKnowledge/canon/fixedStarsAndLots";
import { invokeLLM } from "../_core/llm";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

const text =
  "You hold back your first impression until you have watched what someone actually does. People trust you with the part of a problem that requires patience and discretion.\n\nYou can keep watching long after you know enough to speak. When that happens, people have to guess what you need while you are waiting for them to show you that they mean what they say.";
const birth = {
  location: "Dallas, Texas",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
  worldview: "agent" as const,
  transitLocation: "Las Vegas",
  transitLatitude: 36.1699,
  transitLongitude: -115.1398,
  transitTimezone: "America/Los_Angeles",
  transitDate: "2026-11-06",
  transitTime: "16:22",
};
afterEach(() => vi.useRealTimers());

describe("November 16 placement reference", () => {
  const reference = [
    { body: "Sun", readingScope: "natal" },
    { body: "Moon", readingScope: "combined" },
  ] as const;

  it.each(reference)("sends traced evidence for $body $readingScope", async fixture => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T00:22:00Z"));
    const chart = await calculateMasterChart({ ...birth, readingScope: fixture.readingScope });
    const letter = `sy-natal-double-${fixture.body.toLowerCase()}`;
    vi.mocked(invokeLLM).mockClear().mockResolvedValue({
      choices: [{
        message: { content: text.split("\n\n").map((paragraph, index) =>
          `${paragraph} [evidence: ${index === 0 ? letter : "arabic-lot-fortune"}]`).join("\n\n") },
        finish_reason: "stop",
      }],
    } as never);
    const result = await synthesizePlacement(chart, fixture.body);
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    const dossier = request.messages.find(message => message.role === "user")?.content;
    for (const id of [letter, "sy-four-worlds", "arabic-lot-fortune", "arabic-lot-spirit", "arabic-lot-eros", "arabic-lot-necessity"]) {
      expect(dossier).toContain(`RESULT [${id}]`);
    }
    const stars = result.packet.contributions.find(item => item.method === "fixedStars");
    const longitude = chart.movingBodies.find(row => row.name === fixture.body)!.longitude;
    for (const { star, aspect } of findFixedStarContactsForLongitude(longitude)) {
      expect(stars?.result.some(statement => statement.includes(star.name) && statement.includes(aspect))).toBe(true);
    }
    for (const id of stars?.evidenceIds ?? []) expect(dossier).toContain(`RESULT [${id}]`);
    const expectedActivations = fixture.readingScope === "natal" ? [] : chart.transits.flatMap(row =>
      row.natalContacts.filter(contact => contact.natalName === fixture.body && contact.orb <= 5)
        .map(contact => `timing-${row.name}-${contact.natalName}-${contact.aspect}`));
    expect(result.packet.timingEvidenceIds).toEqual(expectedActivations);
    for (const id of expectedActivations) expect(dossier).toContain(`RESULT [${id}]`);
    expect(result.synthesis).toBe(text);
    expect(result.claimTrace.map(claim => claim.evidenceIds)).toEqual([[letter], ["arabic-lot-fortune"]]);
    expect(request).toMatchObject({ provider: "gemini", maxTokens: 900, timeoutMs: 60_000 });
  }, 12000);

  it("rejects a timing claim backed only by natal evidence", async () => {
    const chart = await calculateMasterChart({ ...birth, readingScope: "natal" });
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{
        message: { content: "You are changing now. [timing: sy-natal-double-sun]\n\nYou know where to start. [evidence: sy-natal-double-sun]" },
        finish_reason: "stop",
      }],
    } as never);
    await expect(synthesizePlacement(chart, "Sun")).rejects.toThrow("PLACEMENT_SYNTHESIS_TRACE");
  });

  it("rejects a one-paragraph placement even when the provider reports success", async () => {
    const chart = await calculateMasterChart({
      ...birth,
      readingScope: "natal",
    });
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        { message: { content: text.split("\n\n")[0] }, finish_reason: "stop" },
      ],
    } as never);
    await expect(synthesizePlacement(chart, "Sun")).rejects.toThrow(
      "PLACEMENT_SYNTHESIS_INCOMPLETE"
    );
  });
});

describe("placement calculations", () => {
  it.each([
    [359, "conjunction", 1],
    [61, "sextile", 1],
    [91, "square", 1],
    [121, "trine", 1],
    [179, "opposition", 1],
  ] as const)("calculates the aspect at %s degrees", (longitude, aspect, orbDeg) => {
    expect(majorLongitudeContact(0, longitude, 2)).toEqual({ aspect, orbDeg });
  });

  it("reverses the Lots and their dependencies by sect", () => {
    const input = { ascendant: 30, sun: 80, moon: 150, venus: 120, mercury: 70 };
    expect(calculateArabicLots({ ...input, sect: "day" })).toEqual({
      fortune: 100, spirit: 320, eros: 190, necessity: 60,
    });
    expect(calculateArabicLots({ ...input, sect: "night" })).toEqual({
      fortune: 320, spirit: 100, eros: 10, necessity: 140,
    });
    expect(calculateArabicLots({ ...input, venus: undefined, mercury: undefined, sect: "day" }))
      .toEqual({ fortune: 100, spirit: 320 });
  });
});
