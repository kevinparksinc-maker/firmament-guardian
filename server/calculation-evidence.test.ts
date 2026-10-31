import { describe, expect, it } from "vitest";
import sweph from "sweph";
import { calculateChart, type ChartInput } from "./astronomy";

const FIXTURE_INPUT: ChartInput = {
  location: "Dallas, Texas, USA",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
  transitLocation: "Dallas, Texas, USA",
  transitLatitude: 32.7767,
  transitLongitude: -96.797,
  transitTimezone: "America/Chicago",
  transitDate: "1986-11-20",
  transitTime: "10:06",
  worldview: "agent",
  readingScope: "combined",
  birthTimeKnown: true,
};

describe("chart calculation evidence envelope", () => {
  it("exposes the actual engine result with canonical inputs and honest unverified status", async () => {
    const chart = await calculateChart(FIXTURE_INPUT);
    const evidence = chart.calculationEvidence;
    const sun = evidence.items.find((item) => item.objectId === "natal:Sun");
    const sourceSun = chart.movingBodies.find((body) => body.name === "Sun");
    expect(evidence.schemaVersion).toBe("calculation-evidence/v1");
    expect(evidence.timestampUtc).toBe("1986-11-20T16:06:00.000Z");
    expect(evidence.canonicalInputs.natal.utcIso).toBe(chart.utc);
    expect(evidence.canonicalInputs.natal.julianDay).toBe(chart.julianDay);
    expect(evidence.canonicalInputs.natal.latitudeDeg).toBe(32.7767);
    expect(evidence.canonicalInputs.natal.longitudeDeg).toBe(-96.797);
    expect(evidence.canonicalInputs.natal.elevationM).toBe(FIXTURE_INPUT.elevation ?? 0);
    expect(evidence.canonicalInputs.natal.timeSource).toBe("explicit-local-date-time");
    expect(evidence.canonicalInputs.transit?.utcIso).toBe(chart.transitDate);
    expect(evidence.canonicalInputs.calculationMode).toMatchObject({
      worldview: "agent",
      readingScope: "combined",
      natalHouseFrame: "natal-location-equal-house",
      transitHouseFrame: chart.transitHouseFrame,
      siderealModeId: 14,
      majorAspectOrbDegrees: 5,
      observerElevationPolicy: expect.any(String),
    });
    expect(evidence.frame.id).toBe(chart.referenceFrame);
    expect(evidence.engine.version).toBe(String((sweph as any).version()));
    expect(evidence.engine.wrapper).toMatch(/^sweph@/);
    expect(evidence.engine.flags).toBe(4 | 256 | 65_536);
    expect(evidence.reproducibilityId).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.reproducibilityNote).toContain("not a signature");
    expect(evidence.privacy).toEqual({ visibility: "private-only", containsPreciseBirthOrLocationData: true, shareSafe: false });
    expect(sun?.resultLongitudeDeg).toBe(sourceSun?.longitude);
    expect(sun?.rawResultLongitudeDeg).toBe(sourceSun?.longitude);
    expect(sun?.displayValue).toBe(sourceSun?.display);
    expect(sun?.frameId).toBe(chart.referenceFrame);
    expect(sun?.validation.status).toBe("unverified");
    expect(sun?.steps[0]).toMatchObject({
      name: "Raw Swiss sidereal ecliptic longitude",
      operands: { julianDayUT: chart.julianDay, planetId: 0, flags: 4 | 256 | 65_536, siderealModeId: 14 },
      result: sourceSun?.longitude,
    });
    expect(sun?.steps[1]).toMatchObject({
      name: "Application normalization and frame handling",
      formula: expect.stringContaining("no additional application-level frame transform"),
      result: sourceSun?.longitude,
    });
  });

  it("records angle and equal-house operands from the values returned to the chart", async () => {
    const chart = await calculateChart(FIXTURE_INPUT);
    const angle = chart.calculationEvidence.items.find((item) => item.objectId === "natal:Ascendant");
    const angleTrace = angle?.steps.find((step) => step.name === "Canonical local sidereal angle");
    const angleResult = angle?.steps.find((step) => step.name === "Ascendant longitude");
    const cusp = chart.calculationEvidence.items.find((item) => item.objectId === "natal:house-cusp-1");
    expect(angleTrace?.formula).toContain("greenwichApparentSiderealTimeHours * 15");
    expect(angleTrace?.operands).toHaveProperty("mode14AyanamshaDeg");
    expect(angleResult?.result).toBe(chart.ascendant?.longitude);
    expect(angle?.resultLongitudeDeg).toBe(chart.ascendant?.longitude);
    expect(cusp?.resultLongitudeDeg).toBe(chart.houses[0]);
    expect(cusp?.steps[0].formula).toBe("normalize(ascendantLongitude + 30 * houseIndexZeroBased)");
    expect(cusp?.steps[0].operands).toMatchObject({ houseIndexZeroBased: 0, ascendantLongitudeDeg: chart.ascendant?.longitude });
  });

  it("separates topocentric Moon evidence and includes the observer coordinates", async () => {
    const chart = await calculateChart(FIXTURE_INPUT);
    const moon = chart.calculationEvidence.items.find((item) => item.objectId === "natal:Moon:topocentric");
    expect(moon?.input.observerMode).toBe("topocentric");
    expect(moon?.input.latitudeDeg).toBe(FIXTURE_INPUT.latitude);
    expect(moon?.input.longitudeDeg).toBe(FIXTURE_INPUT.longitude);
    expect(moon?.input.elevationM).toBe(FIXTURE_INPUT.elevation ?? 0);
    expect(moon?.resultLongitudeDeg).toBe(chart.movingBodies.find((body) => body.name === "Moon")?.topocentricLongitude);
    expect(moon?.rawResultLongitudeDeg).toBe(moon?.resultLongitudeDeg);
    expect(moon?.steps[0].formula).toContain("sweph.set_topo");
    expect(moon?.engine.flags).toBe(4 | 256 | 32_768 | 65_536);
  });

  it("is JSON-serializable and deterministic for identical canonical inputs and engine configuration", async () => {
    const first = await calculateChart(FIXTURE_INPUT);
    const second = await calculateChart(FIXTURE_INPUT);
    const serialized = JSON.stringify(first.calculationEvidence);
    expect(JSON.parse(serialized)).toEqual(first.calculationEvidence);
    expect(second.calculationEvidence.reproducibilityId).toBe(first.calculationEvidence.reproducibilityId);
    expect(second.calculationEvidence).toEqual(first.calculationEvidence);
  });

  it("includes worldview and house-frame choices in the reproducibility fingerprint", async () => {
    const agent = await calculateChart(FIXTURE_INPUT);
    const god = await calculateChart({ ...FIXTURE_INPUT, worldview: "god" });
    expect(agent.calculationEvidence.canonicalInputs.calculationMode.worldview).toBe("agent");
    expect(god.calculationEvidence.canonicalInputs.calculationMode.worldview).toBe("god");
    expect(god.calculationEvidence.canonicalInputs.calculationMode.transitHouseFrame).toBe("god-fixed");
    expect(god.calculationEvidence.reproducibilityId).not.toBe(agent.calculationEvidence.reproducibilityId);
  });

  it("records an automatic transit instant explicitly for natal-only requests", async () => {
    const chart = await calculateChart({ ...FIXTURE_INPUT, readingScope: "natal" });
    const transitInput = chart.calculationEvidence.canonicalInputs.transit;
    expect(transitInput?.timeSource).toBe("automatic-current-time");
    expect(transitInput?.utcIso).toBe(chart.transitDate);
    expect(transitInput?.localDate).toBeUndefined();
    expect(transitInput?.latitudeDeg).toBeUndefined();
    expect(chart.calculationEvidence.reproducibilityNote).toContain("automatically generated current transit instant");
  });
});
