import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildUnifiedMasterChart } from "./masterChart/builder";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import { narrateMasterSynthesis, scrubLeaks, scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: { content: [
        "**What you notice first**\n\nYou remember who followed through when everyone else wanted to talk. Chart weighting marks this area.",
        "**What you bring to your people**\n\nYou pick up on missing details before a plan collapses and make the next step practical.",
        "**Where the delay costs you**\n\nYou sometimes wait too long to name what bothered you; evaluated 2026-11-14T03:15:25.437Z.",
        "**What changes with one honest conversation**\n\nAsking earlier gives people a chance to answer before you decide to handle the whole thing yourself. Your vitality rises when you speak up.",
      ].join("\n\n") },
      finish_reason: "stop",
    }],
  }),
}));

let synthesis: SynthesisResult;

beforeAll(async () => {
  const snapshot = await buildUnifiedMasterChart({
    location: "Dallas",
    latitude: 32.7767,
    longitude: -96.797,
    timezone: "America/Chicago",
    date: "1986-11-20",
    time: "10:06",
    mode: "combined",
    transitDate: "2026-11-13",
    transitTime: "19:15",
    transitLocation: "Las Vegas",
    transitLatitude: 36.1699,
    transitLongitude: -115.1398,
    transitTimezone: "America/Los_Angeles",
  });
  synthesis = (await synthesizeMasterSnapshot(snapshot, "combined", "Give me a full chart reading")).synthesis;
});

describe("Reader-facing reading readability & leak prevention", () => {
  it("eliminates repeated boilerplate, doubled placements, raw flow/orb/timestamps, and unbalanced bold markers", async () => {
    const result = await narrateMasterSynthesis(synthesis, "Give me a full chart reading");
    const fullText = result.narrative.answer;

    // 1. Banned boilerplate & generic instructions must never appear
    expect(fullText).not.toMatch(/Read their specific mechanisms together/i);
    expect(fullText).not.toMatch(/The relative strength and evidence of each finding determine its emphasis/i);
    expect(fullText).not.toMatch(/Use this awareness practically: lean on your direct honesty/i);

    // 2. Internal telemetry, module names, configured flow, and UTC timestamps must never leak
    expect(fullText).not.toMatch(/\bconfigured flow\b/i);
    expect(fullText).not.toMatch(/\bhalf major weight\b/i);
    expect(fullText).not.toMatch(/evaluated\s+\d{4}-\d{2}-\d{2}T/i);
    expect(fullText).not.toMatch(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/);
    expect(fullText).not.toMatch(/\b\d+\.\d{4,}°/);
    expect(fullText).not.toMatch(/\bvirupas\b/i);
    expect(fullText).not.toMatch(/\b(?:Western Classical Longitudes & Signs|Ptolemaic Aspects & Orbs|Vedic Divisional Charts)\b/i);

    // 3. dominantConclusion is a clean single paragraph with balanced ** markers and no raw heading tokens
    expect(result.dominantConclusion).not.toMatch(/^###/);
    const domBold = result.dominantConclusion.match(/\*\*/g) ?? [];
    expect(domBold.length % 2).toBe(0);

    // 4. Every section has balanced ** markers and no inline • bullet chains
    for (const section of result.narrative.sections) {
      const boldMatches = section.text.match(/\*\*/g) ?? [];
      expect(boldMatches.length % 2).toBe(0);
      expect(section.text).not.toMatch(/[^\n]\s+•\s+/);
    }

    // 5. Tension reconciliations do not cite the same placement twice or dump citation labels
    expect(fullText).not.toMatch(/The favorable testimony \(/);
    expect(fullText).not.toMatch(/The challenging testimony \(/);
    expect(fullText).not.toMatch(/\*\*Chart Factors:\*\*/i);

    // 6. Bold reader-specific section titles, flowing paragraphs, zero bullet lists of traits, and zero astrology jargon
    expect(result.narrative.sections.length).toBeGreaterThanOrEqual(4);
    expect(fullText).toMatch(/^\*\*[^*\n]+\*\*/m);
    expect(fullText).not.toMatch(/^[-•]\s+/m);
    expect(fullText).not.toMatch(
      /\b(?:Ascendant|Descendant|Midheaven|Nakshatras?|Manazil|Manzil|House\s+(?:1[0-2]|[1-9])|Chaldean face|Egyptian bounds?|Lot of (?:Fortune|Spirit|Eros|Necessity|Courage|Victory|Nemesis)|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\b/
    );

    // 7. No leaked raw orb text, awkward decan flavor prefixes, stock coaching/hedging, routing boilerplate, or poetic filler
    expect(fullText).not.toMatch(/\(\s*\d+(?:\.\d+)?°\s*orb\s*\)/i);
    expect(fullText).not.toMatch(/aura of [a-z]+\s+flavor:\s*decan/i);
    expect(fullText).not.toMatch(/\b(?:cosmic|sacred mirror|tapestry|bastion|alchemist|underworld)\b/i);
    expect(fullText).not.toMatch(/\bChart weighting marks\b/i);
    expect(fullText).not.toMatch(/\bYour vitality rises\b/i);
    expect(fullText).not.toMatch(/\bAt its best, this gives you\b/i);
    expect(fullText).not.toMatch(/\bUnder stress, watch the trap\b/i);
    expect(fullText).not.toMatch(/\bThis could suggest\b/i);
    expect(fullText).not.toMatch(/\bYou might possibly\b/i);
    expect(fullText).not.toMatch(/\bWatch out for the trap of\b/i);
    expect(fullText).not.toMatch(/is routed through Agent House/i);
    expect(fullText).not.toMatch(/\bVenus-toned\b/i);
    expect(fullText).not.toMatch(/\b(?:diagnostic intellect|emotional regulation|protective strategies|psychological safety|attachment wounds|somatic gut-instincts)\b/i);
  });

  it("scrubLeaks neutralizes LLM echoes of raw calculation metadata, routing boilerplate, stock hedging, and fixes unbalanced markdown", () => {
    const dirty = [
      "### Overview",
      "Your **Mercury semisextile Saturn · Ptolemaic Aspects & Orbs (Mercury semisextile Saturn, orb 2.38°; configured flow 1) shows precision.",
      "D9 Sun · Vedic Divisional Charts (D1, D2, D3, D9 Navamsha, D10) (D9: 30° sign / 9 = 3°20′; Sun 322.02576095356227°; source 235.78064010595136°) adds drive.",
      "Mercury in God House 8 (transformation) is routed through Agent House 10. Venus-toned phrasing.",
      "Venus Mahadasha; evaluated 2026-11-14T03:15:25.437Z. Paired with Trine Moon (3.68° orb).",
      "You present an aura of venus flavor: decan 2 (capricorn triplicity) — the mountain goat.",
      "At its best, this gives you clarity. Under stress, watch the trap of silence. Chart weighting marks this area.",
      "Item one • Item two • Item three",
      "Read their specific mechanisms together: favorable indications describe available strengths; challenging indications describe pressures, costs, or vulnerabilities. The relative strength and evidence of each finding determine its emphasis.",
    ].join("\n\n");

    const cleaned = scrubLeaks(dirty);
    expect(cleaned).not.toContain("configured flow");
    expect(cleaned).not.toContain("2026-11-14T03:15:25.437Z");
    expect(cleaned).not.toContain("322.02576095356227");
    expect(cleaned).not.toContain("3.68° orb");
    expect(cleaned).not.toMatch(/venus flavor: decan 2/i);
    expect(cleaned).not.toContain("Read their specific mechanisms together");
    expect(cleaned).not.toMatch(/Ptolemaic Aspects & Orbs/);
    expect(cleaned).not.toMatch(/is routed through Agent House/i);
    expect(cleaned).not.toMatch(/\bVenus-toned\b/i);
    expect(cleaned).not.toMatch(/\bAt its best, this gives you\b/i);
    expect(cleaned).not.toMatch(/\bUnder stress, watch the trap\b/i);
    expect(cleaned).not.toMatch(/\bChart weighting marks\b/i);
    expect(cleaned).toContain("\n- Item two\n- Item three");
    expect((cleaned.match(/\*\*/g) ?? []).length % 2).toBe(0);
  });

  it("scrubNonHoraryAstrologyJargon strips astrology tokens for non-Horary reader prose while leaving Horary scrubLeaks intact", () => {
    const sample =
      "> **Chart Factors:** Sun in Scorpio\n\nWith your Ascendant in Capricorn and Moon trine Jupiter in House 7, guided by Nakshatra Pushya and Lot of Fortune at 14.2°, you hold high standards at work.";
    const scrubbed = scrubNonHoraryAstrologyJargon(sample);
    expect(scrubbed).not.toContain("Chart Factors");
    expect(scrubbed).not.toContain("Ascendant");
    expect(scrubbed).not.toContain("Capricorn");
    expect(scrubbed).not.toContain("Scorpio");
    expect(scrubbed).not.toContain("House 7");
    expect(scrubbed).not.toContain("Nakshatra");
    expect(scrubbed).not.toContain("Lot of Fortune");
    expect(scrubbed).not.toContain("14.2°");
    expect(scrubbed).toContain("you hold high standards at work");
  });
});

