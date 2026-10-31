import { describe, expect, it } from "vitest";
import sweph from "sweph";
import { calculateChart, parseLocalToUtc } from "./astronomy";
import { SPICA_JPL_DE441_DALLAS_1986 } from "./spica-jpl-de441-dallas-1986.fixture";
import {
  calculateSpicaFixedAngles,
  calculateSpicaFixedGeometricBenchmarkPosition,
  calculateSpicaFixedPlanetPosition,
  icrsJ2000ToSpicaFixed,
  SPICA_ANCHOR,
  SPICA_FRAME_CALC_FLAGS,
  SPICA_FRAME_EPOCH,
  SPICA_FRAME_GEOMETRIC_BENCHMARK_FLAGS,
  SPICA_FRAME_ID,
  SPICA_FRAME_OBLIQUITY_ARCSEC,
  SPICA_FRAME_PLANE,
  SPICA_FRAME_ROTATION_DEG,
} from "./spica-fixed-frame";

const JD_UT = 2_446_755.1708333334;
function signedAngularDifference(a: number, b: number) {
  return ((a - b + 540) % 360) - 180;
}

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

describe("isolated Spica-fixed reference frame", () => {
  it("declares a fixed J2000 ICRF ecliptic plane and a catalogued HIP 65474 anchor", () => {
    expect(SPICA_FRAME_ID).toBe("spica-fixed");
    expect(SPICA_FRAME_EPOCH).toBe("J2000.0");
    expect(SPICA_FRAME_PLANE).toContain("fixed at J2000.0");
    expect(SPICA_FRAME_OBLIQUITY_ARCSEC).toBe(84_381.448);
    expect(SPICA_ANCHOR.catalogId).toBe("HIP 65474");
    expect(SPICA_ANCHOR.rightAscensionDeg).toBeCloseTo(201.298247375, 9);
    expect(SPICA_ANCHOR.declinationDeg).toBeCloseTo(-11.1613194722, 9);
  });

  it("places Spica at Libra 0° once while retaining its nonzero ecliptic latitude", () => {
    const result = icrsJ2000ToSpicaFixed(SPICA_ANCHOR);
    expect(result.frameId).toBe(SPICA_FRAME_ID);
    expect(result.longitudeDeg).toBeCloseTo(180, 12);
    expect(result.latitudeDeg).toBeCloseTo(-2.05448865, 7);
    expect(SPICA_FRAME_ROTATION_DEG).toBeCloseTo(336.1586421917, 9);
  });

  it("does not request Swiss sidereal mode or reuse the Aldebaran ayanamsha", () => {
    const C = (sweph as any).constants;
    expect(SPICA_FRAME_CALC_FLAGS & C.SEFLG_SIDEREAL).toBe(0);
    expect(SPICA_FRAME_GEOMETRIC_BENCHMARK_FLAGS & C.SEFLG_SIDEREAL).toBe(0);
    const apparent = calculateSpicaFixedPlanetPosition(JD_UT, C.SE_SUN);
    const geometric = calculateSpicaFixedGeometricBenchmarkPosition(JD_UT, C.SE_SUN);
    expect(apparent.frameId).toBe("spica-fixed");
    expect(geometric.frameId).toBe("spica-fixed");
    expect(Math.abs(signedAngularDifference(apparent.longitudeDeg, geometric.longitudeDeg))).toBeLessThan(0.02);
  });

  it("reproduces the archived JPL DE441 geocentric vectors in the same Spica frame", () => {
    expect(SPICA_JPL_DE441_DALLAS_1986.request).toMatchObject({
      center: "500@399",
      tlist: String(JD_UT),
      timeType: "UT",
      referencePlane: "ECLIPTIC",
      referenceSystem: "ICRF",
      vectorCorrection: "NONE",
      outputUnits: "AU-D",
    });
    expect(SPICA_JPL_DE441_DALLAS_1986.response).toMatchObject({
      ephemeris: "DE441",
      centerBody: "Earth (399)",
      outputType: "GEOMETRIC cartesian states",
      referenceFrame: "Ecliptic of J2000.0",
      fixtureTimeUtc: "1986-11-20T16:06:00.000Z",
    });
    for (const body of SPICA_JPL_DE441_DALLAS_1986.bodies) {
      const [x, y] = body.vectorAu;
      const transformedJplLongitude = normalizeLongitude(
        Math.atan2(y, x) * 180 / Math.PI + SPICA_JPL_DE441_DALLAS_1986.spicaFixedTransform.rotationDeg,
      );
      expect(transformedJplLongitude, `${body.name} fixture longitude`).toBeCloseTo(body.longitudeDeg, 8);
      const local = calculateSpicaFixedGeometricBenchmarkPosition(JD_UT, body.swissPlanetId);
      expect(local.frameId, body.name).toBe("spica-fixed");
      const differenceArcmin = signedAngularDifference(local.longitudeDeg, transformedJplLongitude) * 60;
      expect(Math.abs(differenceArcmin), `${body.name} differs by ${differenceArcmin} arcmin`).toBeLessThan(0.03);
    }
  });

  it("converts the Dallas local birth time to the specified UTC instant", () => {
    expect(parseLocalToUtc("1986-11-20", "10:06", "America/Chicago").toISOString())
      .toBe("1986-11-20T16:06:00.000Z");
  });

  it("returns antipodal angles and twelve equal 30° Spica-frame cusps for Dallas", () => {
    const result = calculateSpicaFixedAngles(JD_UT, -96.797);
    expect(result.ascendant.longitudeDeg).toBeCloseTo(272.313553962, 8);
    expect(result.descendant.longitudeDeg).toBeCloseTo(92.313553962, 8);
    expect(result.midheaven.longitudeDeg).toBeCloseTo(178.637763200, 8);
    expect(result.houseCusps).toHaveLength(12);
    expect(result.houseCusps[0]).toBeCloseTo(result.ascendant.longitudeDeg, 10);
    for (let index = 1; index < 12; index += 1) {
      expect(signedAngularDifference(result.houseCusps[index], result.houseCusps[index - 1])).toBeCloseTo(30, 8);
    }
    expect(Math.abs(signedAngularDifference(result.descendant.longitudeDeg, result.ascendant.longitudeDeg))).toBeCloseTo(180, 8);
    expect(result.diagnostics.julianDayTt).toBeGreaterThan(result.diagnostics.julianDayUt);
  });

  it("leaves the active chart engine on the Aldebaran mode-14 baseline", async () => {
    const chart = await calculateChart({
      location: "Dallas, Texas, USA",
      latitude: 32.7767,
      longitude: -96.797,
      timezone: "America/Chicago",
      date: "1986-11-20",
      time: "10:06",
      worldview: "agent",
      readingScope: "natal",
      birthTimeKnown: true,
    });
    expect(chart.referenceFrame).toBe("firmament-aldebaran-15-taurus");
    expect(chart.ascendant?.longitude).toBeCloseTo(269.503707188, 8);
    expect(chart.movingBodies.find((body) => body.name === "Sun")?.longitude).toBeCloseTo(213.463743323, 8);
  });
});
