import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChartResult } from "./astronomy";
import { ChartStrengthOverview } from "../client/src/components/ChartStrengthOverview";

const state = vi.hoisted(() => ({
  data: undefined as any,
  error: null as Error | null,
  isLoading: false,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    vedic: {
      strength: { useQuery: () => ({ ...state, refetch: vi.fn() }) },
    },
  },
}));

const chart = {} as ChartResult;
const components = {
  sthana: 120, dig: 60, kala: 60, cheshta: 60, naisargika: 60, drik: 0,
};
const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
  .map((body, i) => ({
    body,
    rank: i + 1,
    totalVirupas: 360,
    rupas: 6,
    requiredVirupas: 360,
    adequacyRatio: 1,
    components,
    house: i + 1,
    ownedHouses: [i + 1],
  }));
const houses = Array.from({ length: 12 }, (_, i) => ({
  house: i + 1,
  rank: i + 1,
  totalVirupas: 360 - i * 10,
  sign: "Aries",
  lord: "Mars",
  lordAdequacy: 1,
  lordDeliveryHouse: 3,
  components: { lord: 360, direction: 0, aspect: 0, occupancy: 0, risingType: 0 },
}));

describe("Strength dashboard without AI provider dependency", () => {
  it("shows real-data slots for all seven planets and twelve houses from the direct endpoint", () => {
    state.data = { planets, houses };
    state.error = null;
    state.isLoading = false;
    const html = renderToStaticMarkup(
      React.createElement(ChartStrengthOverview, { chart })
    );
    expect(html).toContain("Planetary Strength");
    expect(html).toContain("Shadbala");
    expect(html).toContain("Bhava Bala");
    expect(html).toContain("Saturn");
    expect(html).toContain("House 12");
    expect(html).toContain("Open full strength calculations");
  });

  it("shows an actionable calculation error rather than fabricated scores", () => {
    state.data = undefined;
    state.error = new Error("Ascendant missing");
    const html = renderToStaticMarkup(
      React.createElement(ChartStrengthOverview, { chart })
    );
    expect(html).toContain("Ascendant missing");
    expect(html).toContain("Retry strength calculations");
    expect(html).not.toContain("House 12");
  });
});
