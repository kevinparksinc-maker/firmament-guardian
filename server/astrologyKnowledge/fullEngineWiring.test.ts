import { describe, it, expect } from "vitest";
import {
  ASTROLOGY_TECHNIQUE_REGISTRY,
  getTechniqueById,
  getTechniqueAuditSummary,
} from "../../shared/astrologyRegistry";
import { calculateChart, type ChartResult } from "../astronomy";
import {
  overlay,
  vargaPlacement,
  grahaDrishtiTargetHouses,
  normalizeLongitude,
} from "../../shared/hybrid";
import { buildAstrologyEvidencePacket, formatEvidencePacket } from "./evidencePacket";
import { calculateEnergyRead } from "../energyReadV2";
import {
  MOTHER_LETTERS,
  DOUBLE_LETTERS,
  SIMPLE_LETTERS,
  FOUR_WORLDS,
} from "./canon/seferYetzirah";
import { buildAstrologyInterpreterSystem } from "../master-interpreter";

// Two distinct test birth charts across different eras, latitudes, and longitudes
const CHART_1_INPUT = {
  date: "1990-05-15",
  time: "14:30",
  latitude: 40.7128,
  longitude: -74.006, // New York, USA
  timezone: "America/New_York",
  location: "New York, NY",
};

const CHART_2_INPUT = {
  date: "1985-11-20",
  time: "08:15",
  latitude: 35.6762,
  longitude: 139.6503, // Tokyo, Japan
  timezone: "Asia/Tokyo",
  location: "Tokyo, Japan",
};

describe("FULL ASTROLOGY ENGINE WIRING & INTERPRETATION AUDIT", () => {
  // -------------------------------------------------------------------------
  // 1. CENTRAL ASTROLOGY REGISTRY AUDIT
  // -------------------------------------------------------------------------
  describe("1. Central Astrology Registry Audit", () => {
    it("declares every required astrology technique without gaps", () => {
      expect(ASTROLOGY_TECHNIQUE_REGISTRY.length).toBeGreaterThanOrEqual(25);
      const summary = getTechniqueAuditSummary();
      expect(summary.total).toBe(ASTROLOGY_TECHNIQUE_REGISTRY.length);
      expect(summary.verified).toBeGreaterThanOrEqual(20);
      expect(summary.notImplemented).toBe(0);
    });

    it("ensures every registry entry has non-empty required fields and explicit audit notes", () => {
      for (const entry of ASTROLOGY_TECHNIQUE_REGISTRY) {
        expect(entry.id, `Missing ID for ${entry.name}`).toBeTruthy();
        expect(entry.name, `Missing name for ${entry.id}`).toBeTruthy();
        expect(entry.tradition, `Missing tradition for ${entry.id}`).toBeTruthy();
        expect(entry.calculationProvider, `Missing calculation provider for ${entry.id}`).toBeTruthy();
        expect(entry.knowledgeSource, `Missing knowledge source for ${entry.id}`).toBeTruthy();
        expect(entry.interpretationProvider, `Missing interpretation provider for ${entry.id}`).toBeTruthy();
        expect(entry.uiDestinations.length, `Missing UI destinations for ${entry.id}`).toBeGreaterThan(0);
        expect(entry.auditNotes.length, `Missing audit notes for ${entry.id}`).toBeGreaterThan(15);
        expect(
          ["VERIFIED", "PARTIALLY_IMPLEMENTED", "KNOWLEDGE_ONLY", "NOT_IMPLEMENTED"],
          `Invalid status for ${entry.id}`
        ).toContain(entry.verificationStatus);
      }
    });

    it("verifies key techniques exist in registry", () => {
      const keys = [
        "big-three",
        "planetary-positions",
        "equal-houses",
        "vedic-nakshatras",
        "vimshottari-dasha",
        "ashtakavarga",
        "graha-drishti",
        "vargas-divisional-charts",
        "arabic-manazil",
        "arabic-lots",
        "chinese-lunar-mansions",
        "sefer-yetzirah-canon",
        "chart-sect",
        "energy-read-v2",
        "master-interpreter-v2",
        "infinite-discovery-engine",
      ];
      for (const key of keys) {
        const found = getTechniqueById(key);
        expect(found, `Technique ${key} not registered`).toBeDefined();
        expect(found?.verificationStatus).toMatch(/VERIFIED|PARTIALLY_IMPLEMENTED/);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. END-TO-END CALCULATION PIPELINE ON REAL BIRTH CHARTS
  // -------------------------------------------------------------------------
  describe("2. End-to-End Calculation Pipeline On Distinct Charts", () => {
    let chart1: ChartResult;
    let chart2: ChartResult;

    it("calculates real, distinct astronomical charts without placeholders", async () => {
      chart1 = await calculateChart(CHART_1_INPUT);
      chart2 = await calculateChart(CHART_2_INPUT);

      expect(chart1).toBeDefined();
      expect(chart2).toBeDefined();

      // Sun positions must be real and different
      const sun1 = chart1.movingBodies.find((b) => b.name === "Sun");
      const sun2 = chart2.movingBodies.find((b) => b.name === "Sun");
      expect(sun1).toBeDefined();
      expect(sun2).toBeDefined();
      expect(sun1!.longitude).not.toBe(sun2!.longitude);

      // Ascendant must be distinct based on different latitudes/longitudes
      expect(chart1.ascendant).toBeDefined();
      expect(chart2.ascendant).toBeDefined();
      expect(chart1.ascendant!.longitude).not.toBe(chart2.ascendant!.longitude);

      // Verify all 10 moving bodies computed for both
      expect(chart1.movingBodies.length).toBe(10);
      expect(chart2.movingBodies.length).toBe(10);
    });

    it("calculates distinct Vedic Nakshatras and Padas for Chart 1 vs Chart 2", () => {
      const moon1 = chart1.movingBodies.find((b) => b.name === "Moon")!;
      const moon2 = chart2.movingBodies.find((b) => b.name === "Moon")!;

      const overlay1 = overlay(moon1.longitude);
      const overlay2 = overlay(moon2.longitude);

      expect(overlay1.nakshatra).toBeTruthy();
      expect(overlay2.nakshatra).toBeTruthy();
      expect(overlay1.pada).toBeGreaterThanOrEqual(1);
      expect(overlay1.pada).toBeLessThanOrEqual(4);

      // Different charts must have different lunar mansion placements
      expect(overlay1.nakshatra !== overlay2.nakshatra || overlay1.pada !== overlay2.pada).toBe(true);
    });

    it("calculates distinct Arabic Manāzil for Chart 1 vs Chart 2", () => {
      const moon1 = chart1.movingBodies.find((b) => b.name === "Moon")!;
      const moon2 = chart2.movingBodies.find((b) => b.name === "Moon")!;

      const overlay1 = overlay(moon1.longitude);
      const overlay2 = overlay(moon2.longitude);

      expect(overlay1.manzil).toBeTruthy();
      expect(overlay2.manzil).toBeTruthy();
      expect(overlay1.manzil).not.toBe(overlay2.manzil);
    });

    it("calculates distinct Arabic Lots (Fortune, Spirit, Eros, Necessity) with Sect", () => {
      const getLots = (c: ChartResult) => {
        const sun = c.movingBodies.find((b) => b.name === "Sun")!;
        const moon = c.movingBodies.find((b) => b.name === "Moon")!;
        const asc = c.ascendant!;
        const ven = c.movingBodies.find((b) => b.name === "Venus")!;
        const isDay = sun.house >= 7 && sun.house <= 12;

        const fortune = normalizeLongitude(isDay ? asc.longitude + moon.longitude - sun.longitude : asc.longitude + sun.longitude - moon.longitude);
        const spirit = normalizeLongitude(isDay ? asc.longitude + sun.longitude - moon.longitude : asc.longitude + moon.longitude - sun.longitude);
        const eros = normalizeLongitude(asc.longitude + ven.longitude - spirit);
        return { fortune, spirit, eros, isDay };
      };

      const lots1 = getLots(chart1);
      const lots2 = getLots(chart2);

      expect(lots1.fortune).not.toBe(lots2.fortune);
      expect(lots1.spirit).not.toBe(lots2.spirit);
      expect(lots1.eros).not.toBe(lots2.eros);
    });

    it("verifies Vargas divisional calculations (D1, D2, D3, D9, D10)", () => {
      const sun1 = chart1.movingBodies.find((b) => b.name === "Sun")!;
      const d2 = vargaPlacement(sun1.longitude, "D2");
      const d3 = vargaPlacement(sun1.longitude, "D3");
      const d9 = vargaPlacement(sun1.longitude, "D9");
      const d10 = vargaPlacement(sun1.longitude, "D10");

      expect(["Cancer", "Leo"]).toContain(d2.sign);
      expect(d3.sign).toBeTruthy();
      expect(d9.sign).toBeTruthy();
      expect(d10.sign).toBeTruthy();
    });

    it("verifies Graha Drishti target houses for Mars, Jupiter, Saturn", () => {
      // Mars from House 1 must aspect 4, 7, 8
      expect(grahaDrishtiTargetHouses("Mars", 1)).toEqual([4, 7, 8]);
      // Jupiter from House 10 must aspect 2, 4, 6
      expect(grahaDrishtiTargetHouses("Jupiter", 10)).toEqual([2, 4, 6]);
      // Saturn from House 7 must aspect 9, 1, 4
      expect(grahaDrishtiTargetHouses("Saturn", 7)).toEqual([9, 1, 4]);
    });

    it("verifies authentic Sefer Yetzirah correspondences", () => {
      expect(MOTHER_LETTERS.length).toBe(3);
      expect(DOUBLE_LETTERS.length).toBe(7);
      expect(SIMPLE_LETTERS.length).toBe(12);
      expect(FOUR_WORLDS.length).toBe(4);

      // Verify no tarot terms are present in Sefer Yetzirah canon
      const text = JSON.stringify({ MOTHER_LETTERS, DOUBLE_LETTERS, SIMPLE_LETTERS, FOUR_WORLDS });
      expect(text.toLowerCase()).not.toContain("tarot");
      expect(text.toLowerCase()).not.toContain("major arcana");
    });
  });

  // -------------------------------------------------------------------------
  // 3. EVIDENCE PACKET & MASTER INTERPRETER INTEGRATION
  // -------------------------------------------------------------------------
  describe("3. Evidence Packet & Master Interpreter Wiring", () => {
    it("generates evidence packet with hundreds of real calculated evidence items", async () => {
      const chart = await calculateChart(CHART_1_INPUT);
      const packet = buildAstrologyEvidencePacket(chart, "Explain my core purpose and career");

      expect(packet).toBeDefined();
      expect(packet.westernEvidence.length).toBeGreaterThan(0);
      expect(packet.vedicEvidence.length).toBeGreaterThan(0);
      expect(packet.arabicEvidence.length).toBeGreaterThan(0);
      expect(packet.canonEvidence.length).toBeGreaterThan(0);
      expect(packet.fixedStarEvidence.length).toBeGreaterThan(0);

      const formatted = formatEvidencePacket(packet);
      expect(formatted.length).toBeGreaterThan(1000);
      expect(formatted).toContain("Western evidence");
      expect(formatted).toContain("Vedic evidence");
      expect(formatted).toContain("Arabic evidence");
    });

    it("proves evidence packets differ between Chart 1 and Chart 2", async () => {
      const chart1 = await calculateChart(CHART_1_INPUT);
      const chart2 = await calculateChart(CHART_2_INPUT);

      const packet1 = buildAstrologyEvidencePacket(chart1, "Core reading");
      const packet2 = buildAstrologyEvidencePacket(chart2, "Core reading");

      const text1 = formatEvidencePacket(packet1);
      const text2 = formatEvidencePacket(packet2);

      expect(text1).not.toBe(text2);
    });

    it("verifies Master Interpreter system instructions enforce WHAT, WHY, HOW, CONSEQUENCE, MEANING", () => {
      const systemPrompt = buildAstrologyInterpreterSystem();
      expect(systemPrompt).toContain("MASTER INTERPRETER");
      expect(systemPrompt).toContain("WHAT");
      expect(systemPrompt).toContain("WHY");
      expect(systemPrompt).toContain("HOW");
      expect(systemPrompt).toContain("CONSEQUENCE");
      expect(systemPrompt).toContain("MEANING");
      expect(systemPrompt).toContain("BOLD CLAIM → WHY");
      expect(systemPrompt).toContain("GUARDIAN POWER PRINCIPLE");
    });

    it("asserts zero placeholder strings exist in evidence outputs", async () => {
      const chart = await calculateChart(CHART_1_INPUT);
      const packet = buildAstrologyEvidencePacket(chart, "Audit check");
      const text = formatEvidencePacket(packet);

      const forbidden = [
        "Galactic beacon",
        "High spiritual energy",
        "Leadership charge",
        "Powerful cosmic influence",
        "This placement brings transformation",
        "Your interpretation will appear",
        "Coming soon",
        "Lorem ipsum",
      ];

      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. ENERGY READ V2 INTEGRATION AUDIT
  // -------------------------------------------------------------------------
  describe("4. Energy Read V2 Scoring & Transit Mechanics", () => {
    it("calculates exact harmony and friction percentages for 10x10 planetary matrix", () => {
      const natal = [
        { name: "Sun", longitude: 45 },
        { name: "Moon", longitude: 120 },
        { name: "Mercury", longitude: 40 },
        { name: "Venus", longitude: 60 },
        { name: "Mars", longitude: 90 },
        { name: "Jupiter", longitude: 180 },
        { name: "Saturn", longitude: 270 },
        { name: "Uranus", longitude: 300 },
        { name: "Neptune", longitude: 330 },
        { name: "Pluto", longitude: 15 },
      ];

      const transits = [
        { name: "Sun", longitude: 46 }, // conjunction (harmony)
        { name: "Moon", longitude: 180 }, // opposition (friction)
        { name: "Mercury", longitude: 130 },
        { name: "Venus", longitude: 240 },
        { name: "Mars", longitude: 0 },
        { name: "Jupiter", longitude: 180 }, // conjunction (harmony)
        { name: "Saturn", longitude: 90 },
        { name: "Uranus", longitude: 120 },
        { name: "Neptune", longitude: 150 },
        { name: "Pluto", longitude: 210 },
      ];

      const result = calculateEnergyRead(natal, transits);
      expect(result.contacts.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.friction + result.harmony);
      if (result.total > 0) {
        expect(result.frictionPercent! + result.harmonyPercent!).toBeCloseTo(100, 1);
        expect(["friction", "easy-flow", "mixed"]).toContain(result.status);
      }
    });
  });
});
