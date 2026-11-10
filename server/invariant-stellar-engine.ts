/** Fixed-plane stellar longitude geometry for in-app calibration and validation.
 * No date-dependent ayanamsha, sidereal flag, or precession adjustment is applied here.
 * Inputs MUST be direction vectors in one consistent inertial Cartesian frame.
 * Do not pass tropical-of-date longitude or unverified Swiss Ephemeris vectors.
 */
export type Vector3 = Readonly<{ x: number; y: number; z: number }>;
export type StellarCalibration = Readonly<{
  planeNormal: Vector3;
  referenceDirection: Vector3;
  aldebaranDirection: Vector3;
  provenance: string;
}>;
const dot = (a: Vector3, b: Vector3) => a.x*b.x+a.y*b.y+a.z*b.z;
const scale = (v: Vector3, s: number): Vector3 => ({x:v.x*s,y:v.y*s,z:v.z*s});
const minus = (a: Vector3,b: Vector3): Vector3 => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const cross = (a: Vector3,b: Vector3): Vector3 => ({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const unit = (v: Vector3): Vector3 => {
  const n=Math.hypot(v.x,v.y,v.z);
  if(!Number.isFinite(n)||n<1e-12) throw new Error("Degenerate or non-finite calibration vector");
  return scale(v,1/n);
};
export const normalizeDegrees = (n: number) => {
  if(!Number.isFinite(n)) throw new Error("Non-finite longitude");
  return ((n%360)+360)%360;
};
export class InvariantStellarEngine {
  private readonly x: Vector3;
  private readonly y: Vector3;
  readonly rotationDegrees: number;
  readonly provenance: string;
  constructor(calibration: StellarCalibration) {
    if(!calibration.provenance.trim()) throw new Error("Calibration provenance required");
    const normal=unit(calibration.planeNormal);
    const project=(v: Vector3)=>minus(v,scale(normal,dot(v,normal)));
    this.x=unit(project(calibration.referenceDirection));
    this.y=unit(cross(normal,this.x));
    const aldebaran=unit(project(calibration.aldebaranDirection));
    const raw=Math.atan2(dot(aldebaran,this.y),dot(aldebaran,this.x))*180/Math.PI;
    this.rotationDegrees=normalizeDegrees(45-raw);
    this.provenance=calibration.provenance;
    if(Math.abs(this.longitude(calibration.aldebaranDirection)-45)>1e-9)
      throw new Error("Aldebaran anchor validation failed");
  }
  longitude(direction: Vector3): number {
    const v=unit(direction);
    const inPlane=Math.hypot(dot(v,this.x),dot(v,this.y));
    if(inPlane<1e-12) throw new Error("Direction lies on plane normal; longitude undefined");
    return normalizeDegrees(Math.atan2(dot(v,this.y),dot(v,this.x))*180/Math.PI+this.rotationDegrees);
  }
  equalHouses(ascendant: number): number[] {
    return Array.from({length:12},(_,i)=>normalizeDegrees(ascendant+i*30));
  }
}
