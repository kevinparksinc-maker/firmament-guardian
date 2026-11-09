import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartResult, ChartRow } from "./astronomy";

const state = vi.hoisted(() => ({ error: null as Error | null }));
vi.mock("../client/src/components/PlacementMiniReading", () => ({
  usePlacementMiniReadings: vi.fn((_chart, _layer, names, enabled) => ({
    data:
      enabled && !state.error
        ? {
            placements: names.map((name: string) => ({
              name,
              paragraph: `Personal story for ${name}`,
            })),
            dominantConclusion:
              "Question: Compact individual placement card summaries",
            methodOutcomes: [{ judgment: "REPEATED INTERNAL DICTIONARY" }],
          }
        : undefined,
    isSuccess: enabled && !state.error,
    isError: enabled && Boolean(state.error),
    error: enabled ? state.error : null,
    isFetching: false,
    refetch: vi.fn(),
  })),
  MiniReadingContent: ({ summary }: { summary: { paragraph: string } }) =>
    React.createElement("p", null, summary.paragraph),
}));
import { SystematicDeconstruction } from "../client/src/components/SystematicDeconstruction";
import { usePlacementMiniReadings } from "../client/src/components/PlacementMiniReading";

const row = (name: string) =>
  ({ name, display: "Aries 1°", longitude: 1, house: 1 }) as ChartRow;
const chart = {
  input: { date: "1986-11-20", time: "10:06" },
  utc: "1986-11-20T16:06:00Z",
  houses: [],
  movingBodies: [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
  ].map(row),
  ascendant: row("Ascendant"),
  descendant: row("Descendant"),
  northNode: row("North Node"),
  southNode: row("South Node"),
} as unknown as ChartResult;

beforeEach(() => {
  state.error = null;
  vi.clearAllMocks();
});
describe("Chart placement reading surface", () => {
  it("shows all fourteen placements and queues bounded requests without printing the internal ledger", () => {
    const html = renderToStaticMarkup(
      React.createElement(SystematicDeconstruction, { chart })
    );
    expect(html.match(/<article/g)).toHaveLength(14);
    expect(html).toContain("Personal story for Sun");
    expect(html).toContain("Pluto’s reading is queued");
    expect(html).toContain("South Node’s reading is queued");
    expect(html).not.toContain("REPEATED INTERNAL DICTIONARY");
    expect(html).not.toContain("Question: Compact");
    const calls = vi.mocked(usePlacementMiniReadings).mock.calls;
    expect(calls.flatMap(call => call[2]!)).toEqual(
      [
        ...chart.movingBodies,
        chart.ascendant,
        chart.descendant,
        chart.northNode,
        chart.southNode,
      ].map(p => p!.name)
    );
    expect(calls.every(call => call[2]!.length <= 2)).toBe(true);
    expect(calls.filter(call => call[3])).toHaveLength(1);
  });
  it("keeps a provider billing error visible and retryable instead of substituting dictionary prose", () => {
    state.error = new Error(
      "Anthropic invoke failed: 400 credit balance too low"
    );
    const html = renderToStaticMarkup(
      React.createElement(SystematicDeconstruction, { chart })
    );
    expect(html).toContain("credit balance too low");
    expect(html).toContain("Retry this reading");
    expect(html).not.toContain("Personal story");
    expect(html).not.toContain("REPEATED INTERNAL DICTIONARY");
  });
});
