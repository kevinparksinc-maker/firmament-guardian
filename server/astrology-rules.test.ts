import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { resolveVedicEvidence } from "./astrologyKnowledge/vedic";
import { overlay } from "../shared/hybrid";
import { calculateArabicLots } from "./utils/arabicLots";
import { detectWesternAspects } from "./utils/patternMatcher";
import { analyzeGenesisPatterns } from "./patterns/genesisEngine";
import {
  runGenesisAstroPipeline,
  runGenesisPatternPipeline,
} from "./genesisBackup/adapter";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
} from "./astrologyKnowledge/evidencePacket";

describe("deterministic astrology rule fixtures", () => {
  it("matches the documented Dallas natal houses and canonical positions", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    expect(chart.validation.passed).toBe(true);
    expect(chart.ascendant?.display).toBe("Capricorn 07°22′");
    expect(chart.movingBodies.find(row => row.name === "Sun")).toMatchObject({
      display: "Scorpio 28°02′",
      house: 11,
    });
    expect(chart.movingBodies.find(row => row.name === "Moon")).toMatchObject({
      display: "Cancer 13°30′",
      house: 7,
    });
  });

  it("enforces the five-degree aspect boundary and wraparound", () => {
    const placements = (a: number, b: number) => [
      { planet: "A", longitude: a, sign: "Aries", house: 1 },
      { planet: "B", longitude: b, sign: "Aries", house: 1 },
    ];
    expect(detectWesternAspects(placements(10, 15))).toHaveLength(1);
    expect(detectWesternAspects(placements(10, 15.01))).toHaveLength(0);
    expect(detectWesternAspects(placements(359, 4))).toHaveLength(1);
  });

  it("keeps Nakshatra, pada, and Manzil boundary geometry deterministic", () => {
    expect(overlay(0)).toMatchObject({
      nakshatra: "Ashwini",
      pada: 1,
      manzil: "Al-Sharatain",
    });
    expect(overlay(13.333334)).toMatchObject({ nakshatra: "Bharani", pada: 1 });
    expect(overlay(12.857142)).toMatchObject({ manzil: "Al-Sharatain" });
    expect(overlay(12.857143)).toMatchObject({ manzil: "Al-Butain" });
  });

  it("matches sect-sensitive Fortune, Spirit, and Eros lots", () => {
    const lots = calculateArabicLots({
      ascendant: 277.3745,
      sun: 238.0376526763464,
      moon: 103.50073488984668,
      venus: 215.5076077942207,
      sect: "day",
    });
    expect(lots).toEqual({
      fortune: 142.837582,
      spirit: 51.911418,
      eros: 80.97069,
    });
    const night = calculateArabicLots({
      ascendant: 277.3745,
      sun: 238.0376526763464,
      moon: 103.50073488984668,
      venus: 215.5076077942207,
      sect: "night",
    });
    expect(night.fortune).not.toBe(lots.fortune);
    expect(night.spirit).not.toBe(lots.spirit);
  });

  it("emits the configured Vedic house-lord and graha-drishti evidence", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    const plan = {
      question: "Why do my relationships keep repeating the same pattern?",
      domains: ["vedic"],
      subjects: ["Moon", "Venus", "7th-house"],
      techniques: ["nakshatra", "house-lord", "drishti"],
      includeTiming: false,
      includeDivisionalCharts: [],
      reasons: [],
    };
    const evidence = resolveVedicEvidence(chart, plan);
    expect(
      evidence.some(
        item =>
          item.id === "vedic-nakshatra-Moon" &&
          item.statement.includes("Pushya, pada 4")
      )
    ).toBe(true);
    expect(
      evidence.some(
        item =>
          item.id === "vedic-house-lord-Moon" &&
          item.statement.includes("house 7")
      )
    ).toBe(true);
    expect(evidence.some(item => item.id === "vedic-drishti-Jupiter-7")).toBe(
      true
    );
    expect(evidence.some(item => item.id === "vedic-drishti-Saturn-2")).toBe(
      true
    );
  });

  it("runs Genesis pattern recognition on Firmament chart calculations", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    const analysis = analyzeGenesisPatterns(chart);
    expect(analysis.doctrine).toBe("genesis-pattern-engine");
    expect(analysis.config.orbConjunction).toBe(8);
    expect(
      analysis.dominantPatterns.some(pattern => pattern.type === "stellium")
    ).toBe(true);
    expect(
      analysis.archetypes.some(archetype => archetype.archetype === "Stellium")
    ).toBe(true);
    expect(Array.isArray(analysis.vedicYogas)).toBe(true);

    const packet = buildAstrologyEvidencePacket(
      chart,
      "Why do my relationships keep repeating the same pattern?",
      "natal"
    );
    expect(packet.patternEvidence.length).toBeGreaterThan(0);
    expect(
      packet.patternEvidence.every(item =>
        ["genesis-pattern-rules", "genesis-pattern-engine-original"].includes(
          item.sourceId
        )
      )
    ).toBe(true);
    expect(packet.doctrine.genesis).toMatchObject({
      engine: "genesis-pattern-engine",
      role: "active pattern-recognition, Astro Engine, and hard-coded interpretive rules",
    });
    expect(formatEvidencePacket(packet)).toContain(
      "Genesis Pattern Engine evidence"
    );
  });

  it("runs the original Genesis Astro Engine as a live pipeline stage", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    const astro = runGenesisAstroPipeline(chart);
    expect(astro.engine).toBe("genesis-astro-engine");
    expect(astro.result).not.toBeNull();
    expect(astro.result?.mind).toBeDefined();
    expect(astro.result?.soul).toBeDefined();
    expect(astro.result?.spirit).toBeDefined();
    expect(astro.natalInput).toContain("Sun:");
  });

  it("runs the original Genesis Pattern Engine as a live pipeline stage", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    const patterns = runGenesisPatternPipeline(chart);
    expect(patterns.engine).toBe("genesis-pattern-engine-original");
    expect(patterns.analysis.config.orbConjunction).toBe(8);
    expect(patterns.analysis.dominantPatterns.length).toBeGreaterThan(0);
    expect(
      Object.keys(patterns.analysis.planetaryStrength).length
    ).toBeGreaterThan(0);
  });
});
