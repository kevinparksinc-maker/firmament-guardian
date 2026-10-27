/** The Absolute: Aldebaran-referenced, two-dimensional Firmament map geometry.
 * This is a custom chart-coordinate convention, not a physical ephemeris or
 * an astronomical zero-obliquity horizon solver.
 */
export const FIRMAMENT_FRAME = "firmament-aldebaran-15-taurus" as const;
export const ALDEBARAN_ANCHOR = 45;
export const ZERO_OBLIQUITY_MODEL = 0;
export const normalize = (angle: number): number => {
  if (!Number.isFinite(angle)) throw new RangeError("Longitude must be finite");
  return ((angle % 360) + 360) % 360;
};
export function aldebaranDelta(rawAldebaranLongitude: number): number {
  return normalize(ALDEBARAN_ANCHOR - rawAldebaranLongitude);
}
/** For TROPICAL raw longitudes only. Never apply to Swiss sidereal mode 14 output. */
export function anchorRawLongitude(rawTropicalLongitude: number, delta: number): number {
  return normalize(rawTropicalLongitude + delta);
}
export function projectToDome(longitude: number, radius: number) {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError("Radius must be nonnegative");
  const bearing = normalize(longitude);
  const radians = bearing * Math.PI / 180;
  return { bearing, x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}
export function equalHouseCuspsOnDome(ascendant: number): number[] {
  return Array.from({ length: 12 }, (_, index) => normalize(ascendant + index * 30));
}
export function equalHouseOnDome(longitude: number, ascendant: number): number {
  return 1 + Math.floor(normalize(longitude - ascendant) / 30);
}
export function arabicLots(ascendant: number, sun: number, moon: number) {
  return {
    fortune: normalize(ascendant + moon - sun),
    spirit: normalize(ascendant + sun - moon),
  };
}
export type DomeInput = {
  /** Canonical Aldebaran-anchored longitudes, already in mode 14. */
  planetLongitudes: Record<string, number>;
  /** Horizon point must be supplied by the Agent View calculation. */
  ascendant: number;
};
export function calculateDomeFramework(
  input: DomeInput,
  trackRadii: Record<string, number> = {
    Sun: 50, Moon: 40, Mercury: 45, Venus: 48, Mars: 55, Jupiter: 65, Saturn: 75,
  },
) {
  const positions: Record<string, ReturnType<typeof projectToDome>> = {};
  for (const [name, longitude] of Object.entries(input.planetLongitudes)) {
    positions[name] = projectToDome(longitude, trackRadii[name] ?? 60);
  }
  const sun = input.planetLongitudes.Sun;
  const moon = input.planetLongitudes.Moon;
  if (sun === undefined || moon === undefined) throw new Error("Sun and Moon required for Arabic Lots");
  const lots = arabicLots(input.ascendant, sun, moon);
  positions.Lot_Of_Fortune = projectToDome(lots.fortune, 90);
  positions.Lot_Of_Spirit = projectToDome(lots.spirit, 90);
  return { referenceFrame: FIRMAMENT_FRAME, positions, lots, houseCusps: equalHouseCuspsOnDome(input.ascendant) };
}
