/** Unified fixed-plane coordinate pipeline.
 * The calibration is a REQUIRED runtime input. Never substitute an invented
 * offset or interpret tropical-of-date positions as inertial vectors.
 * A single immutable calibration instance is shared by natal and transit.
 */
import { InvariantStellarEngine, type StellarCalibration, type Vector3 } from "./invariant-stellar-engine";
export type FixedChartInput = Readonly<{
  calibration: StellarCalibration;
  natal: Readonly<Record<string, Vector3>>;
  transits: Readonly<Record<string, Vector3>>;
  natalLocalHourAngleDegrees: number;
  transitLocalHourAngleDegrees: number;
}>;
export type FixedPlacement = Readonly<{
  longitude: number; sign: number; degreeInSign: number;
  godHouse: number; agentHouse: number;
  decan: number; nakshatra: number; arabicMansion: number;
}>;
const wrap=(x:number)=>((x%360)+360)%360;
const house=(longitude:number,ascendant:number)=>1+Math.floor(wrap(longitude-ascendant)/30);
const placement=(lon:number,asc:number):FixedPlacement=>({
  longitude:lon,
  sign:Math.floor(lon/30)+1,
  degreeInSign:lon%30,
  godHouse:house(lon,0),
  agentHouse:house(lon,asc),
  decan:Math.floor((lon%30)/10)+1,
  nakshatra:Math.floor(lon/(360/27))+1,
  arabicMansion:Math.floor(lon/(360/28))+1,
});
export function computeFixedChart(input:FixedChartInput) {
  const engine=new InvariantStellarEngine(input.calibration);
  // Hour angles MUST already be expressed relative to the calibrated fixed
  // plane's longitude origin; Greenwich tropical sidereal time is not valid here.
  const natalAsc=wrap(input.natalLocalHourAngleDegrees+90);
  const transitAsc=wrap(input.transitLocalHourAngleDegrees+90);
  const map=(vectors:Readonly<Record<string,Vector3>>,asc:number)=>
    Object.fromEntries(Object.entries(vectors).map(([name,v])=>[name,placement(engine.longitude(v),asc)]));
  const natal=map(input.natal,natalAsc);
  const transits=map(input.transits,transitAsc);
  const aspects=[0,60,90,120,180] as const;
  const contacts=Object.entries(transits).flatMap(([transitName,t])=>
    Object.entries(natal).flatMap(([natalName,n])=>{
      const separation=Math.min(wrap(t.longitude-n.longitude),wrap(n.longitude-t.longitude));
      const closest=aspects.map(angle=>({angle,orb:Math.abs(separation-angle)})).sort((a,b)=>a.orb-b.orb)[0];
      return closest.orb<=5?[{transitName,natalName,...closest,harmonious:[0,60,120].includes(closest.angle)}]:[];
    }));
  return {
    referenceFrame:"invariant-aldebaran-15-taurus",
    calibrationProvenance:engine.provenance,
    aldebaranLongitude:engine.longitude(input.calibration.aldebaranDirection),
    natalAscendant:natalAsc,transitAscendant:transitAsc,
    natalHouses:engine.equalHouses(natalAsc),
    transitHouses:engine.equalHouses(transitAsc),
    natal,transits,contacts,
  };
}
