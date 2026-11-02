import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";

const input = {
  location: "Alexandria, Egypt", latitude: 31.2001, longitude: 29.9187,
  timezone: "Africa/Cairo", date: "1988-08-08", time: "12:00",
  readingScope: "natal" as const,
};

describe("Canonical synthesis reading bridge", () => {
  it("accepts matching calculated planets, ascendant, houses and includes method findings", async () => {
    const chart = await calculateChart(input);
    const result = await synthesizeChartForReading(chart, "natal", "What does this chart say?");
    expect(result.synthesis.methodFindings.length).toBe(16);
    expect(result.context).toContain("CALCULATED METHOD FINDINGS");
    expect(result.context).toContain("vedic-nakshatras-and-padas");
  });

  it("refuses a silently changed planet position", async () => {
    const chart = await calculateChart(input);
    const altered = { ...chart, movingBodies: chart.movingBodies.map((body, index) =>
      index === 0 ? { ...body, longitude: (body.longitude + 10) % 360 } : body) };
    await expect(synthesizeChartForReading(altered, "natal", "Check chart")).rejects.toThrow("mismatch");
  });
});
