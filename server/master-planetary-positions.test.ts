import {describe,expect,it} from "vitest";
import {calculatePlanetPositions,MASTER_PLANETS} from "./master-planetary-positions";

describe("master planetary positions independent of sunrise",()=>{
  it("computes ten equatorial XYZ positions without a birthplace or ascendant",()=>{
    const positions=calculatePlanetPositions(new Date("1986-11-20T16:06:00.000Z"));
    expect(positions.map(p=>p.name)).toEqual([...MASTER_PLANETS]);
    for(const p of positions){
      expect(p.frame).toBe("geocentric-equatorial-of-date");
      expect(p.ra).toBeGreaterThanOrEqual(0);
      expect(p.ra).toBeLessThan(360);
      expect(p.dec).toBeGreaterThanOrEqual(-90);
      expect(p.dec).toBeLessThanOrEqual(90);
      expect(p.distance).toBeGreaterThan(0);
      expect(Math.atan2(p.xyz.y,p.xyz.x)*180/Math.PI+360).toBeGreaterThan(0);
    }
  });
});
