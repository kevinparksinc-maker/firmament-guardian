import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AbsoluteTheme,
  ElementBalanceCard,
  EnergyStatusCard,
  MansionCard,
  ReadingSection,
} from "./AbsoluteUI";

describe("AbsoluteUI presentation primitives", () => {
  it("scopes tokens around an Energy card and renders caller-supplied status unchanged", () => {
    const html = renderToStaticMarkup(
      createElement(
        AbsoluteTheme,
        null,
        createElement(
          EnergyStatusCard,
          {
            eyebrow: "Live Planetary Transits",
            title: "Daily Cosmic Energy Read",
            statusLabel: "Balanced Synthesis",
            windowLabel: "3 Active Planetary Contacts",
            nextShiftLabel: "Transit Moon trine natal Venus (orb 0.42°)",
          },
          createElement("p", null, "Existing display content"),
        ),
      ),
    );

    expect(html).toContain('class="the-absolute-theme"');
    expect(html).toContain("Balanced Synthesis");
    expect(html).toContain("3 Active Planetary Contacts");
    expect(html).toContain("Transit Moon trine natal Venus (orb 0.42°)");
    expect(html).toContain("Existing display content");
  });

  it("exposes the parent-provided element value as-is with accessible numeric text", () => {
    const html = renderToStaticMarkup(
      createElement(ElementBalanceCard, {
        elements: [{ name: "Water", value: 57, label: "57%" }],
      }),
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="57"');
    expect(html).toContain('aria-valuetext="57% (57%)"');
    expect(html).toContain("width:57%");
  });

  it("does not infer an unoccupied mansion from a missing occupant list", () => {
    const html = renderToStaticMarkup(
      createElement(MansionCard, {
        tradition: "Vedic",
        mansionName: "Ashwini",
      }),
    );

    expect(html).toContain("Occupancy not specified");
    expect(html).not.toContain("Unoccupied");
  });

  it("supports an initially expanded native evidence disclosure", () => {
    const html = renderToStaticMarkup(
      createElement(ReadingSection, {
        heading: "Interpretation",
        summary: "The supplied summary remains unchanged.",
        paragraphs: ["Supplied paragraph."],
        evidence: "Existing evidence text.",
        expanded: true,
      }),
    );

    expect(html).toContain("<details open=\"\">");
    expect(html).toContain("Existing evidence text.");
  });
});
