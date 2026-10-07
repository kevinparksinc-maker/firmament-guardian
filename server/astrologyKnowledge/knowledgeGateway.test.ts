import { describe, expect, it } from "vitest";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
} from "./evidencePacket";
import { planKnowledge } from "./planner";
import { ASTROLOGY_RULES, ASTROLOGY_SOURCES } from "./registry";
import { resolveRelationships } from "./resolver";
import type { ChartResult } from "../astronomy";

const chart = {
  input: {
    location: "Dallas, Texas, USA",
    latitude: 32.7767,
    longitude: -96.797,
    timezone: "America/Chicago",
    date: "1986-11-20",
    time: "10:06",
  },
  utc: "1986-11-20T16:06:00.000Z",
  julianDay: 2446751,
  worldview: "agent",
  readingScope: "combined",
  agentViewAvailable: true,
  ascendant: {
    name: "Ascendant",
    longitude: 256,
    display: "Sagittarius 16°00′",
    house: 1,
    godHouse: 9,
    agentHouse: 1,
  },
  descendant: null,
  midheaven: null,
  northNode: {
    name: "North Node",
    longitude: 20,
    display: "Aries 20°00′",
    house: 5,
    godHouse: 1,
    agentHouse: 5,
  },
  southNode: {
    name: "South Node",
    longitude: 200,
    display: "Libra 20°00′",
    house: 11,
    godHouse: 7,
    agentHouse: 11,
  },
  houses: [],
  movingBodies: [
    {
      name: "Sun",
      longitude: 238,
      display: "Scorpio 28°00′",
      house: 12,
      godHouse: 8,
      agentHouse: 12,
    },
    {
      name: "Moon",
      longitude: 103.5,
      display: "Cancer 13°30′",
      house: 8,
      godHouse: 4,
      agentHouse: 8,
    },
    {
      name: "Pluto",
      longitude: 238.5,
      display: "Scorpio 28°30′",
      house: 12,
      godHouse: 8,
      agentHouse: 12,
    },
    {
      name: "Jupiter",
      longitude: 345,
      display: "Pisces 15°00′",
      house: 4,
      godHouse: 12,
      agentHouse: 4,
    },
    {
      name: "Saturn",
      longitude: 100,
      display: "Cancer 10°00′",
      house: 8,
      godHouse: 4,
      agentHouse: 8,
    },
  ],
  frozenStars: [],
  godPlacements: [],
  transitDate: "2026-01-01T12:00:00.000Z",
  momentPrecision: "exact",
  transitHouseFrame: "natal-location",
  transits: [],
  validation: { passed: true, notes: [] },
} as unknown as ChartResult;

describe("astrology knowledge gateway", () => {
  it("plans relationship questions without retrieving the entire chart indiscriminately", () => {
    const plan = planKnowledge(
      "Why do relationships keep repeating the same pattern for me?",
      "natal"
    );
    expect(plan.subjects).toEqual(
      expect.arrayContaining(["7th-house", "7th-lord", "Venus", "Moon", "D9"])
    );
    expect(plan.techniques).toEqual(
      expect.arrayContaining(["house-lord", "varga", "nakshatra", "manzil"])
    );
    expect(plan.includeTiming).toBe(false);
    expect(plan.coreLayers).toEqual([
      "genesis-astro-engine",
      "genesis-pattern-engine",
      "genesis-yoga-detector",
    ]);
    expect(plan.genesisPolicy).toBe("mandatory-evaluate-before-prioritization");
    expect(plan.reasons.join(" ")).toContain("mandatory core evidence layer");
  });

  it("produces an auditable evidence packet with all three layers and explicit incomplete families", () => {
    const packet = buildAstrologyEvidencePacket(
      chart,
      "Why do relationships keep repeating the same pattern for me?",
      "natal"
    );
    expect(packet.westernEvidence.length).toBeGreaterThan(0);
    expect(packet.vedicEvidence.length).toBeGreaterThan(0);
    expect(packet.arabicEvidence.length).toBeGreaterThan(0);
    expect(packet.sourceTrace.every(trace => trace.sourceId)).toBe(true);
    expect(packet.doctrine.western.relationshipOrb).toBe(5);
    expect(packet.uncertainties.some(item => item.technique === "varga")).toBe(
      true
    );
    expect(formatEvidencePacket(packet)).toContain("ASTROLOGY EVIDENCE PACKET");
    expect(formatEvidencePacket(packet)).toContain(
      "Genesis Astro Engine, Genesis Pattern Engine, and Genesis Yoga Detector are mandatory evaluated layers"
    );
  });

  it("keeps reference sources distinct from local deterministic rules", () => {
    expect(
      ASTROLOGY_SOURCES.find(source => source.id === "tvam-jyotish")?.status
    ).toBe("reference-only");
    expect(
      ASTROLOGY_SOURCES.find(source => source.id === "canopy-arabian")?.status
    ).toBe("reference-only");
    expect(
      ASTROLOGY_RULES.find(rule => rule.id === "western-5-degree-geometry")
        ?.status
    ).toBe("implemented");
    expect(
      ASTROLOGY_RULES.find(rule => rule.id === "vedic-dasha-architecture")
        ?.status
    ).toBe("incomplete");
  });

  it("distinguishes evidence convergence from contradiction", () => {
    const base = (
      tradition: "western" | "vedic" | "arabic",
      polarity: "supportive" | "pressured" | "mixed"
    ) => ({
      id: tradition,
      tradition,
      category: "deterministic-rule" as const,
      technique: "relationship",
      subject: "relationship",
      statement: `${tradition} testimony`,
      concepts: ["relationship", "7th-house"],
      polarity,
      sourceId: "local",
      sourceTrace: {
        sourceId: "local",
        tradition,
        technique: "relationship",
        sourceTitle: "fixture",
        retrievedAt: new Date().toISOString(),
        confidence: "high" as const,
      },
    });
    const agreement = resolveRelationships([
      base("western", "pressured"),
      base("vedic", "pressured"),
      base("arabic", "pressured"),
    ]);
    expect(agreement.convergences[0]).toMatchObject({
      relation: "reinforcement",
      traditions: ["western", "vedic", "arabic"],
    });
    const mixed = resolveRelationships([
      base("western", "pressured"),
      base("vedic", "supportive"),
      base("arabic", "mixed"),
    ]);
    expect(mixed.contradictions.length).toBeGreaterThan(0);
  });

  it("evaluates the 200-pattern Human Behavior & Life-Event Intelligence System in the evidence packet", () => {
    const packet = buildAstrologyEvidencePacket(
      chart,
      "Why do I feel guarded and intensely self-protective in relationships and emotional intimacy?",
      "combined"
    );
    expect(packet.behavioralReport).toBeDefined();
    expect(packet.behavioralReport.dominantBehaviors.length).toBeGreaterThan(0);
    expect(packet.behavioralReport.activeLifeEvents.length).toBeGreaterThan(0);
    expect(packet.behavioralReport.polarityAxes.length).toBe(12);
    expect(packet.behavioralReport.doNotClaimRestrictions.length).toBeGreaterThanOrEqual(8);
    expect(packet.behavioralEvidence.length).toBeGreaterThan(0);
    expect(packet.lifeEventEvidence.length).toBeGreaterThan(0);
    expect(formatEvidencePacket(packet)).toContain(
      "Firmament Human Behavior Pattern Intelligence"
    );
    expect(formatEvidencePacket(packet)).toContain(
      "Firmament Life-Event & Situation Intelligence"
    );
  });
});
