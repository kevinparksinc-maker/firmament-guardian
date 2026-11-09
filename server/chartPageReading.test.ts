import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildPlacementPackets,
  packPlacementMiniPrompt,
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
const response = (selected = packets) => ({
  placements: selected.map(p => ({
    name: p.name,
    paragraph:
      "A compact interpretation that connects this planet’s own calculated mansion, pada, manzil and supporting conditions to a specific drive, strength and challenge in everyday life.",
    evidenceIds: p.facts.map(f => f.id),
    layerIds: Array.from(new Set(p.facts.map(f => f.layerId))),
  })),
});
describe("Compact Chart page placement summaries", () => {
  it("preserves Sun and Moon mansion evidence and vargas", () => {
    const sun = packets.find(p => p.name === "Sun")!;
    const moon = packets.find(p => p.name === "Moon")!;
    expect(sun.canon.nakshatra.name).toBe("Jyeshtha");
    expect(moon.canon.nakshatra.name).toBe("Pushya");
    expect(moon.canon.manzil.name).toBe("Al-Tarf");
    expect(moon.facts.some(f => f.layerId === "vedic-vargas-divisional")).toBe(
      true
    );
    expect(
      JSON.stringify(packPlacementMiniPrompt(packets)).length
    ).toBeLessThan(170_000);
  });
  it("keeps actual judgments for Nodes and angles, excluding failed or unrelated methods", () => {
    for (const name of [
      "Ascendant",
      "Descendant",
      "North Node",
      "South Node",
    ]) {
      const p = packets.find(p => p.name === name)!;
      expect(p.judgments.length).toBeGreaterThan(0);
      expect(
        p.judgments.some(j => j.methodId === "vedic-nakshatras-and-padas")
      ).toBe(true);
      expect(p.judgments.every(j => j.sources.length > 0)).toBe(true);
    }
    expect(
      packets
        .flatMap(p => p.judgments)
        .some(j => j.methodId.startsWith("transit:"))
    ).toBe(false);
  });
  it("keeps full local judgments while sending only classified results to AI", () => {
    const packed = packPlacementMiniPrompt(packets);
    expect(packed.placements).toHaveLength(packets.length);
    expect(JSON.stringify(packed).length).toBeLessThan(170_000);
    packets.forEach((packet, i) => {
      const sent = packed.placements[i];
      expect(sent.name).toBe(packet.name);
      expect(sent.placementEvidenceId).toBe(packet.placementEvidenceId);
      expect(sent.canonResults).toBeDefined();
      expect(sent.methods.length).toBeGreaterThan(0);
      for (const method of sent.methods) {
        expect(method.totalFindings).toBeGreaterThan(0);
        expect(method.results.length).toBeGreaterThan(0);
      }
      expect(packet.judgments.length).toBeGreaterThanOrEqual(sent.methods.length);
    });
    expect(JSON.stringify(packed)).not.toContain("methodExecutionLedger");
  });
  it("reports missing or duplicate placements instead of inventing output", () => {
    expect(validatePlacementSummaries(response(), packets).placements).toHaveLength(packets.length);
    const missing = response();
    missing.placements = missing.placements.filter(p => p.name !== "Sun");
    const result = validatePlacementSummaries(missing, packets);
    expect(result.failed.some(f => f.name === "Sun")).toBe(true);
    expect(result.placements.some(p => p.name === "Sun")).toBe(false);
  });
  it("strips invented evidence and records warnings", () => {
    const invented = response();
    invented.placements[0].evidenceIds.push("invented-shadbala");
    const result = validatePlacementSummaries(invented, packets);
    expect(result.placements[0].evidenceIds).not.toContain("invented-shadbala");
    expect(result.placements[0].warnings).toContain("Unknown evidence references removed");
    expect(result.failed).toHaveLength(0);
  });
  it("sends compact classified Canon findings while requesting concise placement prose", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify(
              response(packets.filter(p => ["Sun", "Moon"].includes(p.name)))
            ),
          },
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
    expect(call.max_tokens).toBe(2000);
    expect(call.timeoutMs).toBe(180000);
    expect(call.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
    expect(call.messages[0].content).toContain("CANON-FIRST PLANETARY SYNTHESIS");
    expect(call.messages[0].content).toContain("70–110 words");
    const delivered = JSON.parse(String(call.messages[1].content));
    expect(delivered.placements).toHaveLength(2);
    expect(delivered.placements[0].canonResults).toBeDefined();
    expect(delivered.placements[0].methods.length).toBeGreaterThan(0);
    expect(delivered.methodOutcomes).toBeUndefined();
    expect(delivered.snapshot).toBeUndefined();
    expect(delivered.canonApplications).toBeUndefined();
    expect(call.messages[0].content).toContain("story-like");
    expect(call.messages[1].content).not.toContain("UNIFIED MASTER SYNTHESIS");
    await buildChartPageReading(chart, "natal");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
  it("generates transit minis from the independent event sky, not the natal packets", async () => {
    vi.mocked(invokeLLM).mockClear();
    const eventChart = await calculateChart({
      ...chart.input,
      readingScope: "combined",
      transitLocation: "Las Vegas",
      transitLatitude: 36.1699,
      transitLongitude: -115.1398,
      transitTimezone: "America/Los_Angeles",
      transitDate: "2026-11-07",
      transitTime: "09:00",
    });
    vi.mocked(invokeLLM).mockImplementation(async request => {
      const input = JSON.parse(String(request.messages[1].content));
      expect(input.chartScope).toBe("event");
      expect(input.placements).toHaveLength(2);
      expect(input.placements[0].canonResults).toBeDefined();
      expect(JSON.stringify(input)).not.toContain("methodExecutionLedger");
      return {
        id: "event",
        created: 0,
        model: "test",
        choices: [{
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify(response(packets.filter(p => ["Sun", "Moon"].includes(p.name)))),
          },
        }],
      };
    });
    const result = await buildChartPageReading(eventChart, "transit");
    expect(result.placements.length).toBe(2);
    expect(vi.mocked(invokeLLM).mock.calls.length).toBeLessThanOrEqual(2);
  });
});
