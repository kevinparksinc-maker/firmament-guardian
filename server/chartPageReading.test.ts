import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildPlacementPackets,
  validatePlacementSummaries,
  buildChartPageReading,
} from "./chartPageReading";
import { calculateChart, type ChartResult } from "./astronomy";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { invokeLLM } from "./_core/llm";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
let chart: ChartResult;
let packets: ReturnType<typeof buildPlacementPackets>;
beforeAll(async () => {
  chart = await calculateChart({
    location: "Dallas, TX",
    latitude: 32.7767,
    longitude: -96.797,
    timezone: "America/Chicago",
    date: "1986-11-20",
    time: "10:06",
    worldview: "agent-vs-god",
    readingScope: "natal",
  });
  const { synthesis, canonicalChart } = await synthesizeChartForReading(
    chart,
    "natal",
    "Placement summaries"
  );
  packets = buildPlacementPackets(canonicalChart, synthesis);
});
const response = () => ({
  placements: packets.map(p => ({
    name: p.name,
    paragraph:
      "A compact interpretation that connects this planet’s own calculated mansion, pada, manzil and supporting conditions to a specific drive, strength and challenge in everyday life.",
    evidenceIds: p.facts.map(f => f.id),
    layerIds: Array.from(new Set(p.facts.map(f => f.layerId))),
  })),
});
describe("Compact Chart page placement summaries", () => {
  it("preserves Sun and Moon mansion evidence, vargas and BAV in a bounded packet", () => {
    const sun = packets.find(p => p.name === "Sun")!;
    const moon = packets.find(p => p.name === "Moon")!;
    expect(sun.canon.nakshatra.name).toBe("Jyeshtha");
    expect(moon.canon.nakshatra.name).toBe("Pushya");
    expect(moon.canon.manzil.name).toBe("Al-Tarf");
    expect(moon.facts.some(f => f.layerId === "vedic-vargas-divisional")).toBe(
      true
    );
    expect(
      moon.facts.some(
        f =>
          f.layerId === "vedic-dasha-and-ashtakavarga" &&
          JSON.stringify(f.value).includes("Moon BAV total")
      )
    ).toBe(true);
    expect(JSON.stringify(packets).length).toBeLessThan(100_000);
  });
  it("requires every displayed planet, including the Sun, and rejects duplicates", () => {
    expect(
      validatePlacementSummaries(response(), packets).placements.length
    ).toBe(chart.movingBodies.length);
    const missingSun = response();
    missingSun.placements = missingSun.placements.filter(p => p.name !== "Sun");
    expect(() => validatePlacementSummaries(missingSun, packets)).toThrow(
      "INCOMPLETE"
    );
    const duplicate = response();
    duplicate.placements[0] = duplicate.placements[1];
    expect(() => validatePlacementSummaries(duplicate, packets)).toThrow(
      "INCOMPLETE"
    );
  });
  it("rejects sign-only summaries and invented evidence", () => {
    const shallow = response();
    shallow.placements[0].layerIds = [
      "western-planets-and-signs",
      "elemental-decans",
    ];
    expect(() => validatePlacementSummaries(shallow, packets)).toThrow(
      "SHALLOW"
    );
    const invented = response();
    invented.placements[0].evidenceIds.push("invented-shadbala");
    expect(() => validatePlacementSummaries(invented, packets)).toThrow(
      "UNGROUNDED"
    );
  });
  it("requests concise paragraphs using the actual Master Interpreter and compact Canon, not the life-story context", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: { role: "assistant", content: JSON.stringify(response()) },
          index: 0,
          finish_reason: "stop",
        },
      ],
      id: "test",
      created: 0,
      model: "test",
    });
    const result = await buildChartPageReading(chart, "natal");
    expect(result.placements[0].name).toBe("Sun");
    const call = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(call.max_tokens).toBe(4500);
    expect(call.timeoutMs).toBe(180000);
    expect(call.messages[0].content).toContain(
      "THE ABSOLUTE — INTERPRETATION ENGINE"
    );
    expect(call.messages[0].content).toContain("70–110 words");
    expect(String(call.messages[1].content).length).toBeLessThan(101000);
    expect(call.messages[1].content).not.toContain("UNIFIED MASTER SYNTHESIS");
    await buildChartPageReading(chart, "natal");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
});
