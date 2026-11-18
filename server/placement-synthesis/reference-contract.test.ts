import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PLACEMENT_METHODS } from "./registry";
import { MINI_SYNTHESIS_STYLE } from "../master-interpreter";

// A source-level regression lock: do not silently rewrite the reference
// synthesis or replace its distinct claim/evidence validation behavior.
const orchestrator = readFileSync(fileURLToPath(new URL("./orchestrator.ts", import.meta.url)), "utf8");
const pipeline = readFileSync(fileURLToPath(new URL("../astrologyKnowledge/synthesis/interpretationPipeline.ts", import.meta.url)), "utf8");

describe("Planetary Placement Synthesis reference contract", () => {
  it("retains the 17 named method adapters, without duplicates", () => {
    expect(PLACEMENT_METHODS).toHaveLength(17);
    expect(new Set(PLACEMENT_METHODS.map(x => x.method)).size).toBe(17);
    for (const id of ["western", "vedic", "arabic", "nakshatra", "manzil", "decan", "lots", "sect", "fixedStars", "genesis", "behavior", "lifeEvents", "kabbalah", "godAgent", "aspects", "transits", "timing"]) {
      expect(PLACEMENT_METHODS.some(x => x.method === id)).toBe(true);
    }
  });
  it("keeps the human-facing two-paragraph reference and evidence trace", () => {
    expect(MINI_SYNTHESIS_STYLE).toContain("second person");
    expect(orchestrator).toContain("Write two flowing second-person paragraphs");
    expect(orchestrator).toContain("CROSS-METHOD CONVERGENCES:");
    expect(orchestrator).toContain("CROSS-METHOD CONTRADICTIONS:");
    expect(orchestrator).toContain("const allowedIds = new Set");
    expect(orchestrator).toContain("parseClaims(rawSynthesis)");
    expect(orchestrator).toContain("PLACEMENT_SYNTHESIS_REPAIR");
    expect(orchestrator).toContain('"placement-reference"');
    expect(pipeline).toContain('if (layout === "placement-reference")');
  });
  it("applies the universal contract only to non-placement routes", () => {
    const placement = pipeline.indexOf('if (layout === "placement-reference")');
    const universal = pipeline.indexOf("UNIVERSAL EVIDENCE-WEAVING CONTRACT");
    expect(placement).toBeGreaterThan(0);
    expect(universal).toBeGreaterThan(placement);
    expect(pipeline).toContain("Do not list parallel methods as a substitute for interpretation.");
  });
});
