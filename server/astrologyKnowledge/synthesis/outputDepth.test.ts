import { describe, expect, it } from "vitest";
import { OUTPUT_DEPTH_INSTRUCTIONS } from "./outputDepth";

describe("final-stage reading depth contract", () => {
  it("supports quick, mini, standard and full without filtering calculated evidence", () => {
    expect(Object.keys(OUTPUT_DEPTH_INSTRUCTIONS)).toEqual([
      "quick", "mini", "standard", "full",
    ]);
    expect(OUTPUT_DEPTH_INSTRUCTIONS.quick).toContain("sentences");
    expect(OUTPUT_DEPTH_INSTRUCTIONS.mini).toContain("paragraphs");
    expect(OUTPUT_DEPTH_INSTRUCTIONS.standard).toContain("paragraphs");
    expect(OUTPUT_DEPTH_INSTRUCTIONS.full).toContain("multi-section");
  });
});
