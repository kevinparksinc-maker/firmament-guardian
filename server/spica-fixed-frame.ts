import sweph from "sweph";

/** Experimental comparison frame. This module is deliberately not wired into calculateChart(). */
export const SPICA_FRAME_ID = "spica-fixed" as const;
export const SPICA_FRAME_EPOCH = "J2000.0" as const;
export const SPICA_FRAME_PLANE = "IAU 1976/1980 ecliptic fixed at J2000.0, referred to ICRF" as const;
export const SPICA_FRAME_OBLIQUITY_ARCSEC = 84_381.448;
export const SPICA_FRAME_OBLIQUITY_DEG = SPICA_FRAME_OBLIQUITY_ARCSEC / 3_600;

/** SIMBAD ICRS coordinates at epoch J2000; identifier HIP 65474 / alpha Virginis. */
export const SPICA_ANCHOR = {
  catalogId: "HIP 65474",
  name: "Spica (alpha Virginis)",
  rightAscensionDeg: (13 + 25 / 60 + 11.57937 / 3_600) * 15,
  declinationDeg: -(11 + 9 / 60 + 40.7501 / 3_600),
  properMotionRaCosDecMasPerYear: -42.35,
  properMotionDecMasPerYear: -30.67,
  catalogEpoch: "J2000.0",
  sourceUrl: "https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Spica",
} as const;

const sw = sweph as any;
const C = sw.constants;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export type EquatorialCoordinates = { rightAscensionDeg: number; declinationDeg: number };
export type EclipticCoordinates = { longitudeDeg: number; latitudeDeg: number };
export type SpicaFixedCoordinates = EclipticCoordinates & { frameId: typeof SPICA_FRAME_ID };

export function normalizeDegrees(degrees: number) {
  if (!Number.isFinite(degrees)) throw new RangeError("Angle must be finite.");
  return ((degrees % 360) + 360) % 360;
}

function validateEquatorial(coordinates: EquatorialCoordinates) {
  if (!Number.isFinite(coordinates.rightAscensionDeg) || !Number.isFinite(coordinates.declinationDeg)) {
    throw new RangeError("Equatorial coordinates must be finite.");
  }
  if (coordinates.declinationDeg < -90 || coordinates.declinationDeg > 90) {
    throw new RangeError("Declination must be between -90° and 90°.");
  }
}

/** Rotate an ICRS/J2000 equatorial unit vector into the fixed IAU 1976/1980 J2000 ecliptic plane. */
export function icrsJ2000ToEclipticJ2000(coordinates: EquatorialCoordinates): EclipticCoordinates {
  validateEquatorial(coordinates);
  const alpha = coordinates.rightAscensionDeg * RAD;
  const delta = coordinates.declinationDeg * RAD;
  const epsilon = SPICA_FRAME_OBLIQUITY_DEG * RAD;
  const x = Math.cos(delta) * Math.cos(alpha);
  const y = Math.cos(delta) * Math.sin(alpha);
  const z = Math.sin(delta);
  const eclipticY = y * Math.cos(epsilon) + z * Math.sin(epsilon);
  const eclipticZ = -y * Math.sin(epsilon) + z * Math.cos(epsilon);
  return {
    longitudeDeg: normalizeDegrees(Math.atan2(eclipticY, x) * DEG),
    latitudeDeg: Math.atan2(eclipticZ, Math.hypot(x, eclipticY)) * DEG,
  };
}

/** Star longitude is fixed at 180°; the ecliptic pole and J2000 plane remain explicitly defined above. */
export const SPICA_ANCHOR_ECLIPTIC_J2000 = icrsJ2000ToEclipticJ2000(SPICA_ANCHOR);
export const SPICA_FRAME_ROTATION_DEG = normalizeDegrees(180 - SPICA_ANCHOR_ECLIPTIC_J2000.longitudeDeg);

export function eclipticJ2000ToSpicaFixed(coordinates: EclipticCoordinates): SpicaFixedCoordinates {
  if (!Number.isFinite(coordinates.longitudeDeg) || !Number.isFinite(coordinates.latitudeDeg)) {
    throw new RangeError("Ecliptic coordinates must be finite.");
  }
  if (coordinates.latitudeDeg < -90 || coordinates.latitudeDeg > 90) {
    throw new RangeError("Ecliptic latitude must be between -90° and 90°.");
  }
  return {
    frameId: SPICA_FRAME_ID,
    longitudeDeg: normalizeDegrees(coordinates.longitudeDeg + SPICA_FRAME_ROTATION_DEG),
    latitudeDeg: coordinates.latitudeDeg,
  };
}

export function icrsJ2000ToSpicaFixed(coordinates: EquatorialCoordinates): SpicaFixedCoordinates {
  return eclipticJ2000ToSpicaFixed(icrsJ2000ToEclipticJ2000(coordinates));
}

/** Apparent-position flags for the isolated chart-frame adapter; intentionally excludes SEFLG_SIDEREAL. */
export const SPICA_FRAME_CALC_FLAGS =
  C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_J2000 | C.SEFLG_ICRS | C.SEFLG_EQUATORIAL;

/** Geometric-only benchmark flags matched to JPL Horizons VEC_CORR=NONE. */
export const SPICA_FRAME_GEOMETRIC_BENCHMARK_FLAGS =
  C.SEFLG_MOSEPH | C.SEFLG_TRUEPOS | C.SEFLG_NOABERR | C.SEFLG_NOGDEFL |
  C.SEFLG_J2000 | C.SEFLG_ICRS | C.SEFLG_EQUATORIAL;

/**
 * Precess a mean equatorial coordinate from date to J2000 using the IAU 1976
 * precession angles. This is used only by the experimental zero-tilt angle
 * adapter; production angle calculations remain in astronomy.ts unchanged.
 */
export function meanEquatorialDateToJ2000(
  coordinates: EquatorialCoordinates,
  julianDayTt: number,
): EquatorialCoordinates {
  validateEquatorial(coordinates);
  if (!Number.isFinite(julianDayTt)) throw new RangeError("Julian day TT must be finite.");
  const t = (julianDayTt - 2_451_545) / 36_525;
  const arcsecToRad = RAD / 3_600;
  const zeta = (2_306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * arcsecToRad;
  const z = (2_306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * arcsecToRad;
  const theta = (2_004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * arcsecToRad;

  const alpha = coordinates.rightAscensionDeg * RAD;
  const delta = coordinates.declinationDeg * RAD;
  const alphaMinusZ = alpha - z;
  const a = Math.cos(delta) * Math.sin(alphaMinusZ);
  const b = Math.cos(theta) * Math.cos(delta) * Math.cos(alphaMinusZ) + Math.sin(theta) * Math.sin(delta);
  const c = -Math.sin(theta) * Math.cos(delta) * Math.cos(alphaMinusZ) + Math.cos(theta) * Math.sin(delta);
  return {
    rightAscensionDeg: normalizeDegrees((Math.atan2(a, b) - zeta) * DEG),
    declinationDeg: Math.asin(Math.max(-1, Math.min(1, c))) * DEG,
  };
}

function readData(result: any, message: string): number[] {
  const data = result?.data ?? result;
  if (result?.error || !data || !Number.isFinite(Number(data[0])) || !Number.isFinite(Number(data[1]))) {
    throw new Error(result?.error || message);
  }
  return Array.from(data as ArrayLike<number>, Number);
}

/**
 * Recalculate one apparent geocentric body directly in J2000/ICRS coordinates.
 * No sidereal flag, sidereal-mode mutation, or Aldebaran ayanamsha is involved.
 */
export function calculateSpicaFixedPlanetPosition(julianDayUt: number, planetId: number): SpicaFixedCoordinates {
  if (!Number.isFinite(julianDayUt) || !Number.isFinite(planetId)) {
    throw new RangeError("Julian day and planet identifier must be finite.");
  }
  const result = sw.calc_ut(julianDayUt, planetId, SPICA_FRAME_CALC_FLAGS);
  const data = readData(result, "Swiss Ephemeris failed to calculate a J2000/ICRS position.");
  return icrsJ2000ToSpicaFixed({ rightAscensionDeg: data[0], declinationDeg: data[1] });
}

/** Independent-engine audit helper: Swiss geometric output in the same frame used for JPL comparison. */
export function calculateSpicaFixedGeometricBenchmarkPosition(julianDayUt: number, planetId: number): SpicaFixedCoordinates {
  if (!Number.isFinite(julianDayUt) || !Number.isFinite(planetId)) {
    throw new RangeError("Julian day and planet identifier must be finite.");
  }
  const result = sw.calc_ut(julianDayUt, planetId, SPICA_FRAME_GEOMETRIC_BENCHMARK_FLAGS);
  const data = readData(result, "Swiss Ephemeris failed to calculate a geometric J2000/ICRS position.");
  return icrsJ2000ToSpicaFixed({ rightAscensionDeg: data[0], declinationDeg: data[1] });
}

export type SpicaFixedAngles = {
  ascendant: SpicaFixedCoordinates;
  descendant: SpicaFixedCoordinates;
  midheaven: SpicaFixedCoordinates;
  houseCusps: number[];
  diagnostics: {
    julianDayUt: number;
    julianDayTt: number;
    greenwichApparentSiderealTimeDeg: number;
    equationOfEquinoxesDeg: number;
    localMeanSiderealTimeDeg: number;
    meanObliquityDeg: number;
  };
};

/**
 * Compare the app's experimental zero-tilt angle convention in the fixed
 * Spica frame. The point on the mean date equator is precessed to J2000,
 * rotated into the fixed ecliptic plane, then given the Spica-defined origin.
 */
export function calculateSpicaFixedAngles(julianDayUt: number, observerLongitudeDeg: number): SpicaFixedAngles {
  if (!Number.isFinite(julianDayUt) || !Number.isFinite(observerLongitudeDeg)) {
    throw new RangeError("Julian day and observer longitude must be finite.");
  }
  const nutation = readData(
    sw.calc_ut(julianDayUt, C.SE_ECL_NUT, C.SEFLG_MOSEPH),
    "Swiss Ephemeris failed to calculate date obliquity and nutation.",
  );
  const meanObliquityDeg = nutation[1];
  const equationOfEquinoxesDeg = nutation[2] * Math.cos(meanObliquityDeg * RAD);
  const greenwichApparentSiderealTimeDeg = normalizeDegrees(Number(sw.sidtime(julianDayUt)) * 15);
  const localMeanSiderealTimeDeg = normalizeDegrees(
    greenwichApparentSiderealTimeDeg - equationOfEquinoxesDeg + observerLongitudeDeg,
  );
  const deltaTDays = typeof sw.deltat === "function" ? Number(sw.deltat(julianDayUt)) : 0;
  if (!Number.isFinite(deltaTDays)) throw new Error("Swiss Ephemeris returned an invalid Delta-T value.");
  const julianDayTt = julianDayUt + deltaTDays;
  const equatorialDateToSpica = (rightAscensionDeg: number): SpicaFixedCoordinates => {
    const j2000 = meanEquatorialDateToJ2000({ rightAscensionDeg, declinationDeg: 0 }, julianDayTt);
    return icrsJ2000ToSpicaFixed(j2000);
  };
  const ascendant = equatorialDateToSpica(localMeanSiderealTimeDeg + 90);
  const descendant = equatorialDateToSpica(localMeanSiderealTimeDeg + 270);
  const midheaven = equatorialDateToSpica(localMeanSiderealTimeDeg);
  const houseCusps = Array.from({ length: 12 }, (_, index) => normalizeDegrees(ascendant.longitudeDeg + index * 30));
  return {
    ascendant,
    descendant,
    midheaven,
    houseCusps,
    diagnostics: {
      julianDayUt,
      julianDayTt,
      greenwichApparentSiderealTimeDeg,
      equationOfEquinoxesDeg,
      localMeanSiderealTimeDeg,
      meanObliquityDeg,
    },
  };
}
