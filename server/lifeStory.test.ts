import { describe, expect, it } from "vitest";
import {
  calculatePersonAge,
  calculateAnnualProfection,
  generatePlanetaryCycles,
  compileLifeStoryChapters,
  runAstrologyEngineAudit,
} from "./lifeStoryEngine";
import { calculateChart } from "./astronomy";

describe("Life Story Engine — Planetary Cycles, Profections & Engine Audit", () => {
  it("calculates accurate decimal age and future calendar dates from birth date", () => {
    const age = calculatePersonAge("1986-11-20", new Date("2026-11-20"));
    expect(Math.round(age)).toBe(40);

    const childAge = calculatePersonAge("2010-05-15", new Date("2020-05-15"));
    expect(Math.round(childAge)).toBe(10);
  });

  it("calculates exact Hellenistic annual profections and Lord of the Year across age milestones", async () => {
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

    // Age 0 (1st year of life): Profected House 1
    const p0 = calculateAnnualProfection(0, chart);
    expect(p0.profectedHouseGod).toBe(1);
    expect(p0.profectedHouseAgent).toBe(1);
    expect(p0.profectedSignGod).toBe("Aries");
    expect(p0.lordOfTheYearGod).toBe("Mars");

    // Age 12 (13th year of life): Profected House 1 again (12 % 12 + 1 = 1)
    const p12 = calculateAnnualProfection(12, chart);
    expect(p12.profectedHouseAgent).toBe(1);

    // Age 29 (First Saturn return year, 30th year of life): 29 % 12 + 1 = 6 (6th House)
    const p29 = calculateAnnualProfection(29, chart);
    expect(p29.profectedHouseGod).toBe(6);
    expect(p29.traditionalThemes).toBeDefined();
    expect(p29.traditionalThemes.length).toBeGreaterThan(0);

    // Age 40: 40 % 12 + 1 = 5 (5th House)
    const p40 = calculateAnnualProfection(40, chart);
    expect(p40.profectedHouseGod).toBe(5);
  });

  it("generates all major planetary return and transition cycles across a lifetime", async () => {
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

    const currentAge = calculatePersonAge("1986-11-20", new Date("2026-10-27"));
    const cycles = generatePlanetaryCycles(chart, currentAge);

    expect(cycles.length).toBeGreaterThanOrEqual(20);

    // Check specific critical milestones
    const saturnReturn1 = cycles.find(c => c.id === "saturn-ret-1");
    expect(saturnReturn1).toBeDefined();
    expect(saturnReturn1?.age).toBe(29.5);
    expect(saturnReturn1?.approxDate).toBe("2016-05-20");
    expect(saturnReturn1?.isPast).toBe(true);

    const jupiterReturn1 = cycles.find(c => c.id === "jupiter-ret-1");
    expect(jupiterReturn1).toBeDefined();
    expect(jupiterReturn1?.age).toBe(11.86);

    const uranusOpp = cycles.find(c => c.id === "uranus-opp");
    expect(uranusOpp).toBeDefined();
    expect(uranusOpp?.age).toBe(41.8);

    const chironRet = cycles.find(c => c.id === "chiron-ret");
    expect(chironRet).toBeDefined();
    expect(chironRet?.age).toBe(50.5);
  });

  it("compiles all 8 chronological chapters with age-adaptive status", async () => {
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

    const currentAge = calculatePersonAge("1986-11-20", new Date("2026-10-27")); // ~40 years old
    const cycles = generatePlanetaryCycles(chart, currentAge);
    const chapters = compileLifeStoryChapters(chart, currentAge, cycles);

    expect(chapters).toHaveLength(8);

    const chapterKeys = chapters.map(c => c.key);
    expect(chapterKeys).toEqual([
      "birth_origins",
      "childhood",
      "adolescence",
      "early_adulthood",
      "adult_development",
      "later_life",
      "turning_points",
      "future_chapters",
    ]);

    // For a 40-year old:
    const childhood = chapters.find(c => c.key === "childhood");
    expect(childhood?.status).toBe("past");

    const adultDev = chapters.find(c => c.key === "adult_development");
    expect(adultDev?.status).toBe("current");

    const laterLife = chapters.find(c => c.key === "later_life");
    expect(laterLife?.status).toBe("future");
  });

  it("audits the complete 20-layer astrological calculation engine", async () => {
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

    const audit = runAstrologyEngineAudit(chart);
    expect(audit).toHaveLength(20);

    const verified = audit.filter(l => l.status === "implemented-verified");
    // 19 verified layers + 1 documented-uncalibrated (Chinese Xiu boundaries preserved without fabrication)
    expect(verified.length).toBeGreaterThanOrEqual(19);

    const chineseXiu = audit.find(l => l.layer.includes("Chinese"));
    expect(chineseXiu?.status).toBe("documented-uncalibrated");
    expect(chineseXiu?.auditNotes).toContain("intentionally uncalibrated");

    const fixedStars = audit.find(l => l.layer === "Fixed Stars");
    expect(fixedStars?.status).toBe("implemented-verified");

    const arabicLots = audit.find(l => l.layer === "Hermetic Arabic Lots");
    expect(arabicLots?.status).toBe("implemented-verified");

    const dasha = audit.find(l => l.layer === "Vimshottari Dasha");
    expect(dasha?.status).toBe("implemented-verified");
  });
});
