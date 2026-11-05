import { describe, expect, it, vi } from "vitest";
import {
  validateChartPageReading,
  buildChartPageReading,
} from "./chartPageReading";
import type { SynthesisResult } from "./astrologyKnowledge/synthesis/types";
import type { ChartResult } from "./astronomy";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./astrologyKnowledge/synthesis/readingBridge", () => ({
  synthesizeChartForReading: vi.fn(),
}));
import { invokeLLM } from "./_core/llm";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
const methods = [
  {
    id: "placements",
    status: "computed-with-result",
    evidenceIds: ["sun-scorpio-h11"],
  },
  {
    id: "decans",
    status: "computed-with-result",
    evidenceIds: ["sun-decan-3"],
  },
  { id: "numerology", status: "not-applicable", evidenceIds: [] },
];
const synthesis = { methodFindings: methods } as unknown as SynthesisResult;
const block = {
  what: "The Sun’s actual Scorpio placement directs identity into the eleventh house.",
  why: "Its third elemental-family decan modifies the supplied solar placement.",
  how: "The decan and eleventh house combine personal loyalty with collective aims.",
  consequence:
    "Conflicting loyalties within alliances can interrupt shared plans.",
  meaning:
    "Purpose develops through the specific alliances indicated by this chart.",
  examples: [
    "Choosing collaborators whose commitments survive a disagreement.",
  ],
  evidenceIds: ["sun-scorpio-h11", "sun-decan-3"],
  linkedMethodIds: ["placements", "decans"],
};
const response = () => ({
  integrated: { ...block },
  bigThree: { ...block },
  layers: methods.slice(0, 2).map(m => ({ ...block, methodId: m.id })),
});
describe("Chart page integrated reading contract", () => {
  it("retains every computed layer, without inventing a numerology calculation", () => {
    expect(
      validateChartPageReading(response(), synthesis).layers.map(
        l => l.methodId
      )
    ).toEqual(["placements", "decans"]);
  });
  it("rejects missing, duplicate, and invented layer interpretations", () => {
    for (const ids of [
      ["placements"],
      ["placements", "placements"],
      ["placements", "numerology"],
    ]) {
      expect(() =>
        validateChartPageReading(
          {
            ...response(),
            layers: ids.map(methodId => ({ ...block, methodId })),
          },
          synthesis
        )
      ).toThrow("INCOMPLETE");
    }
  });
  it("rejects invented evidence and disconnected dictionary readings", () => {
    expect(() =>
      validateChartPageReading(
        { ...response(), integrated: { ...block, evidenceIds: ["invented"] } },
        synthesis
      )
    ).toThrow("UNGROUNDED");
    expect(() =>
      validateChartPageReading(
        {
          ...response(),
          bigThree: { ...block, linkedMethodIds: ["placements"] },
        },
        synthesis
      )
    ).toThrow("DISCONNECTED");
    const value = response();
    value.layers[1].evidenceIds = ["sun-scorpio-h11"];
    expect(() => validateChartPageReading(value, synthesis)).toThrow(
      "lacks its own"
    );
  });
  it("passes the complete Canon-backed bridge context to the interpreter", async () => {
    vi.mocked(synthesizeChartForReading).mockResolvedValue({
      synthesis,
      context: "ALL CALCULATED LAYERS AND MATCHED CANON",
      canonicalChart: {} as ChartResult,
    });
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
    const result = await buildChartPageReading({} as ChartResult, "natal");
    expect(result.reading.layers).toHaveLength(2);
    expect(vi.mocked(invokeLLM).mock.calls[0][0].messages[1].content).toBe(
      "ALL CALCULATED LAYERS AND MATCHED CANON"
    );
    vi.mocked(invokeLLM).mockRejectedValueOnce(
      new Error("Provider unavailable")
    );
    await expect(
      buildChartPageReading({} as ChartResult, "natal")
    ).rejects.toThrow("Provider unavailable");
  });
});
