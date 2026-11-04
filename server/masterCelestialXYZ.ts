/** Master Celestial XYZ projection. This module does not apply tropical/sidereal offsets.
 * All inputs must share a documented origin, axes, equinox/frame, and epoch.
 * The fixed-star zero-direction must be supplied as a vector in the SAME frame.
 */
export type CelestialVector = Readonly<{ x: number; y: number; z: number }>;
export type CelestialFrame = Readonly<{
  origin: "geocentric";
  axes: "equatorial" | "ecliptic";
  reference: string;
  epoch: string;
  units: string;
}>;
export type MasterCelestialInput = Readonly<{
  body: string;
  vector: CelestialVector;
  frame: CelestialFrame;
  fixedZeroDirection: CelestialVector;
  fixedZeroFrame: CelestialFrame;
  observedAtUtc: string;
}>;
function assertVector(v: CelestialVector, label: string) {
  if (![v.x, v.y, v.z].every(Number.isFinite) || Math.hypot(v.x, v.y, v.z) === 0)
    throw new Error(label + ": expected finite nonzero XYZ vector");
}
const degrees = (r: number) => r * 180 / Math.PI;
const normalize = (a: number) => ((a % 360) + 360) % 360;
/** XY-plane angular separation from an independently established fixed-zero ray. */
export function projectMasterCelestial(input: MasterCelestialInput) {
  assertVector(input.vector, "planet");
  assertVector(input.fixedZeroDirection, "fixed zero");
  if (JSON.stringify(input.frame) !== JSON.stringify(input.fixedZeroFrame))
    throw new Error("Master Celestial: vector and anchor reference frames differ");
  if (Math.hypot(input.vector.x, input.vector.y) === 0 ||
      Math.hypot(input.fixedZeroDirection.x, input.fixedZeroDirection.y) === 0)
    throw new Error("Master Celestial: undefined XY projection");
  if (!Number.isFinite(Date.parse(input.observedAtUtc)))
    throw new Error("Master Celestial: invalid observation time");
  const rawAngle = normalize(degrees(Math.atan2(input.vector.y, input.vector.x)));
  const anchorAngle = normalize(degrees(Math.atan2(input.fixedZeroDirection.y, input.fixedZeroDirection.x)));
  return {
    body: input.body,
    observedAtUtc: input.observedAtUtc,
    frame: input.frame,
    xyz: input.vector,
    fixedZeroDirection: input.fixedZeroDirection,
    rawAngle,
    anchorAngle,
    longitude: normalize(rawAngle - anchorAngle),
    method: "master-celestial-xyz-fixed-ray-v1" as const,
  };
}
