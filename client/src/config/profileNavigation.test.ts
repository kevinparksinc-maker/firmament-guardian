import { describe, expect, it } from "vitest";
import { PROFILE_TABS, isProfileRoute } from "./profileNavigation";
import { MAJOR_ASPECT_ORB_DEGREES } from "../../../shared/chartRules";

describe("post-profile information architecture", () => {
  it("uses exactly five unique navigable destinations", () => {
    expect(PROFILE_TABS.map(tab => tab.label)).toEqual(["Home", "Chart", "Energy", "Readings", "Explore"]);
    expect(new Set(PROFILE_TABS.map(tab => tab.href)).size).toBe(5);
    expect(new Set(PROFILE_TABS.map(tab => tab.section)).size).toBe(5);
  });

  it("keeps the specialized engines outside the primary tab routes", () => {
    for (const tab of PROFILE_TABS) expect(isProfileRoute(tab.href)).toBe(true);
    expect(isProfileRoute("/horary")).toBe(false);
    expect(isProfileRoute("/sky")).toBe(false);
    expect(isProfileRoute("/history")).toBe(false);
  });

  it("pins the core major-aspect orb contract to five degrees", () => {
    expect(MAJOR_ASPECT_ORB_DEGREES).toBe(5);
  });
});

import { PRIMARY_NAV_ITEMS, primaryDestinationForPath } from "./profileNavigation";

describe("shared mobile and desktop navigation", () => {
  it("keeps Horary one tap away within five destinations", () => {
    expect(PRIMARY_NAV_ITEMS.map(item => item.label)).toEqual(["Home", "Chart", "Energy", "Horary", "Readings"]);
    expect(new Set(PRIMARY_NAV_ITEMS.map(item => item.href)).size).toBe(5);
  });
  it.each([
    ["/reading/evidence", "/reading"], ["/life-story", "/reading"],
    ["/energy/contacts", "/energy"], ["/forecast", "/energy"],
    ["/zodiac-readings", "/horary"], ["/horary", "/horary"],
    ["/chart", "/chart"], ["/", "/"], ["/profiles", undefined], ["/sky", undefined],
  ])("highlights the parent destination for %s", (path, expected) => {
    expect(primaryDestinationForPath(path)).toBe(expected);
  });
});
