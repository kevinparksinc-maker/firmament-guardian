/** Sunrise-anchored Ascendant model.
 * A sunrise time and calibrated fixed-frame solar longitude MUST be supplied.
 * This is a user-defined angular model, not an independently validated physical horizon solver.
 */
export const ROTATION_DEGREES_PER_DAY = 360;
const norm = (v: number) => ((v % 360) + 360) % 360;
export interface SunriseAnchor {
  sunriseUtc: Date;
  chartUtc: Date;
  sunriseSunLongitude: number;
}
export function calculateSunriseAscendant(anchor: SunriseAnchor) {
  const sunrise = anchor.sunriseUtc.getTime();
  const chart = anchor.chartUtc.getTime();
  if (![sunrise, chart, anchor.sunriseSunLongitude].every(Number.isFinite)) throw new Error("Invalid sunrise anchor");
  const elapsedDays = (chart - sunrise) / 86400000;
  const rotation = elapsedDays * ROTATION_DEGREES_PER_DAY;
  const ascendant = norm(anchor.sunriseSunLongitude + rotation);
  return {
    ascendant,
    descendant: norm(ascendant + 180),
    equalHouseCusps: Array.from({length:12}, (_, i) => norm(ascendant + i * 30)),
    elapsedRotationDegrees: rotation,
    method: "sunrise-anchored" as const,
  };
}

/** Astronomical sunrise crossing search.
 * altitudeAtUtc must compute apparent solar altitude from the ephemeris,
 * observer latitude/longitude and UTC; it must not return zodiac longitude.
 * Finds the most recent upward horizon crossing before the chart moment.
 */
export function findPreviousSunrise(
  chartUtc: Date,
  altitudeAtUtc: (utcMilliseconds: number) => number,
  apparentHorizonDegrees = -0.833,
): Date {
  const end = chartUtc.getTime();
  if (!Number.isFinite(end)) throw new Error("Invalid chart UTC");
  const step = 300000;
  const start = end - 48 * 3600000;
  let previousTime = start;
  let previous = altitudeAtUtc(start) - apparentHorizonDegrees;
  let crossing: number | undefined;
  for (let t = start + step; t <= end; t += step) {
    const current = altitudeAtUtc(t) - apparentHorizonDegrees;
    if (!Number.isFinite(previous) || !Number.isFinite(current)) throw new Error("Invalid solar altitude");
    if (previous <= 0 && current > 0) {
      let lo = previousTime, hi = t;
      for (let n = 0; n < 30; n++) {
        const mid = (lo + hi) / 2;
        if (altitudeAtUtc(mid) > apparentHorizonDegrees) hi = mid;
        else lo = mid;
      }
      crossing = hi;
    }
    previous = current;
    previousTime = t;
  }
  if (crossing === undefined) throw new Error("No sunrise in preceding 48 hours; polar conditions or missing ephemeris");
  return new Date(crossing);
}
