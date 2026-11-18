import { describe, expect, it } from "vitest";
import { savedReadingProse } from "./SavedHistoryDetails";

describe("saved history record replay", () => {
  it("keeps the original completed reading intact", () => {
    const original = "You guard your creative energy.\n\nYour commitments ask for greater consistency.";
    expect(savedReadingProse({ reading: original })).toBe(original);
    expect(savedReadingProse({ narrative: [original, "This timing is temporary."] }))
      .toBe(original + "\n\nThis timing is temporary.");
  });
  it("never invents prose for technical or empty archive records", () => {
    expect(savedReadingProse({ chart: {}, evidenceIds: ["mars-1"] })).toBeNull();
    expect(savedReadingProse(null)).toBeNull();
  });
});
