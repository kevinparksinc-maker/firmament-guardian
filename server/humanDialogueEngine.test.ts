import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { buildDialogueContext, getHumanDialogue } from "../client/src/lib/humanDialogueEngine";

const BANNED_FILLER = /\b(cosmic|sacred|tapestry|bastion|alchemist|underworld)\b/i;

describe("Human Dialogue Engine - Chart-Anchored Freshness & Zero Boilerplate", () => {
  it("produces distinct house-anchored guidance for the same transit/aspect hitting different houses and signs", () => {
    const careerChartCtx = {
      transitHouse: 11,
      transitSign: "Aquarius",
      natalHouse: 10,
      natalSign: "Capricorn",
      transitRetrograde: false,
    };

    const homeChartCtx = {
      transitHouse: 3,
      transitSign: "Gemini",
      natalHouse: 4,
      natalSign: "Cancer",
      transitRetrograde: false,
    };

    const careerDialogue = getHumanDialogue("Mercury", "square", "Moon", true, 0.85, careerChartCtx);
    const homeDialogue = getHumanDialogue("Mercury", "square", "Moon", true, 0.85, homeChartCtx);

    expect(careerDialogue.houseBridgeLabel).toBe("H11 → H10");
    expect(homeDialogue.houseBridgeLabel).toBe("H3 → H4");
    expect(careerDialogue.freshSignal).not.toBe(homeDialogue.freshSignal);
    expect(careerDialogue.workAndMoney).not.toBe(homeDialogue.workAndMoney);
    expect(careerDialogue.relationshipsAndPeople).not.toBe(homeDialogue.relationshipsAndPeople);

    for (const d of [careerDialogue, homeDialogue]) {
      const joined = `${d.everydayTitle} ${d.tagline} ${d.freshSignal} ${d.feelingInBodyAndMind} ${d.workAndMoney} ${d.relationshipsAndPeople} ${d.bestMoveToday} ${d.trapToAvoid}`;
      expect(joined).not.toMatch(BANNED_FILLER);
    }
  });

  it("explicitly calls out retrograde review threads when transit planet is retrograde", () => {
    const direct = getHumanDialogue("Venus", "trine", "Jupiter", true, 1.2, {
      transitHouse: 2,
      natalHouse: 6,
      transitRetrograde: false,
    });
    const retrograde = getHumanDialogue("Venus", "trine", "Jupiter", true, 1.2, {
      transitHouse: 2,
      natalHouse: 6,
      transitRetrograde: true,
    });

    expect(direct.freshSignal).not.toContain("retrograde");
    expect(retrograde.freshSignal).toContain("retrograde");
    expect(retrograde.freshSignal).toContain("second look");
  });

  it("extracts real houses, signs, and retrograde metadata cleanly from a live calculated chart", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      transitLocation: "Las Vegas, Nevada, USA",
      transitLatitude: 36.1699,
      transitLongitude: -115.1398,
      transitTimezone: "America/Los_Angeles",
      transitDate: "2026-11-06",
      transitTime: "11:06",
      worldview: "agent",
      readingScope: "combined",
    });

    const transitWithContact = chart.transits.find((t) => t.natalContacts.length > 0);
    expect(transitWithContact).toBeTruthy();

    const firstContact = transitWithContact!.natalContacts[0];
    const ctx = buildDialogueContext(chart, transitWithContact!.name, firstContact.natalName);
    expect(ctx?.transitHouse).toBeTypeOf("number");
    expect(ctx?.natalHouse).toBeTypeOf("number");
    expect(ctx?.transitSign).toBeTruthy();
    expect(ctx?.natalSign).toBeTruthy();

    const dialogue = getHumanDialogue(
      transitWithContact!.name,
      firstContact.aspect,
      firstContact.natalName,
      true,
      firstContact.orb,
      ctx
    );

    expect(dialogue.houseBridgeLabel).toMatch(/^(H\d+ → H\d+|House \d+)$/);
    expect(dialogue.freshSignal.length).toBeGreaterThan(25);
  });
});
