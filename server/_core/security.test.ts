import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  __resetSecurityStateForTests,
  aiBudgetConfig,
  FixedWindowLimiter,
  isAllowedOrigin,
  parseOriginList,
  takeAiBudget,
} from "./security";

describe("request security", () => {
  it("refuses incorrect site origins and explicitly allows trusted domains", () => {
    expect(isAllowedOrigin("https://app.example.com", "app.example.com", "https", [])).toBe(true);
    expect(isAllowedOrigin("http://app.example.com", "app.example.com", "https", [])).toBe(false);
    expect(isAllowedOrigin("https://app.example.com.evil.org", "app.example.com", "https", [])).toBe(false);
    expect(isAllowedOrigin("null", "app.example.com", "https", [])).toBe(false);
    expect(isAllowedOrigin("https://preview.example.com", "app.example.com", "https", ["https://preview.example.com"])).toBe(true);
    expect(parseOriginList(" https://a.example, ,https://b.example ")).toEqual(["https://a.example", "https://b.example"]);
  });

  it("enforces independent window counters and resets expired windows", () => {
    const limiter = new FixedWindowLimiter();
    expect(limiter.consume("a", 2, 60_000, 1_000_000).allowed).toBe(true);
    expect(limiter.consume("a", 2, 60_000, 1_000_001).allowed).toBe(true);
    expect(limiter.consume("a", 2, 60_000, 1_000_002).allowed).toBe(false);
    expect(limiter.consume("b", 2, 60_000, 1_000_002).allowed).toBe(true);
    expect(limiter.consume("a", 2, 60_000, 1_060_001).allowed).toBe(true);
  });
});

describe("AI spend budget", () => {
  beforeEach(() => __resetSecurityStateForTests());
  const limits = { anonPerMinute: 2, anonPerHour: 3, userPerHour: 3, globalPerDay: 4 };

  it("limits anonymous clients without exhausting the global budget with rejected requests", () => {
    const now = 10_000_000;
    expect(takeAiBudget({ ip: "1.1.1.1" }, limits, now).allowed).toBe(true);
    expect(takeAiBudget({ ip: "1.1.1.1" }, limits, now).allowed).toBe(true);
    for (let i = 0; i < 30; i++) expect(takeAiBudget({ ip: "1.1.1.1" }, limits, now).allowed).toBe(false);
    expect(takeAiBudget({ ip: "2.2.2.2" }, limits, now).allowed).toBe(true);
    expect(takeAiBudget({ ip: "3.3.3.3", userId: "registered" }, limits, now).allowed).toBe(true);
    expect(takeAiBudget({ ip: "4.4.4.4", userId: "another" }, limits, now).allowed).toBe(false);
  });
  it("gives each signed-in account its own hourly limit", () => {
    const cfg = { ...limits, globalPerDay: 100 };
    for (let i = 0; i < 3; i++) expect(takeAiBudget({ ip: "5.5.5.5", userId: 7 }, cfg, 15_000_000).allowed).toBe(true);
    expect(takeAiBudget({ ip: "5.5.5.5", userId: 7 }, cfg, 15_000_000).allowed).toBe(false);
    expect(takeAiBudget({ ip: "5.5.5.5", userId: 8 }, cfg, 15_000_000).allowed).toBe(true);
  });
  it("uses safe default limits for malformed env values", () => {
    const cfg = aiBudgetConfig({ AI_ANON_PER_MINUTE: "7", AI_USER_PER_HOUR: "-1" } as NodeJS.ProcessEnv);
    expect(cfg.anonPerMinute).toBe(7);
    expect(cfg.userPerHour).toBe(120);
  });
});

describe("public source and paid route security", () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  it("never serves a public source ZIP endpoint", () => {
    const index = source("./index.ts");
    const nav = source("../../client/src/components/GuardianNavigation.tsx");
    expect(index).not.toContain('app.get(["/the-absolute-astrology.zip"');
    expect(index).not.toContain('"/api/download-zip"');
    expect(nav).not.toContain("handleDownloadZip");
  });
  it("guards every provider-backed route with an AI spend budget", () => {
    const router = source("../routers.ts");
    for (const name of [
      "placementSynthesis", "behavioralReport", "methodOutcomes", "independentSkyReading",
      "energyReading", "chartPage", "chatWithChart", "focusedPlacement", "host",
      "generate", "masterSynthesize", "followUp", "open", "checkInStatus",
      "systemIntersect", "answerChartQuestion", "askTransitQuestion",
      "generateSoulmatePrediction", "generateSynastryBreakdown", "genesisReading",
      "generateChapter",
    ]) {
      expect(router).toMatch(new RegExp(name + ": aiProcedure\\b"));
    }
  });
});
