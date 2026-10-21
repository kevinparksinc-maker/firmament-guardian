import { describe, expect, it } from "vitest";
import { agentHouseFor, equalHouseCusps, guardianHouseAt, guardianHouseCusp } from "./astrologyCore";
import { calculateChart } from "./astronomy";

const mod=(x:number)=>((x%360)+360)%360;
describe("universal natal Ascendant-anchored equal-house rule",()=>{
  it.each(Array.from({length:12},(_,i)=>i*30))("supports all 12 Ascendant signs at %s°",asc=>{
    const cusps=equalHouseCusps(asc);
    expect(cusps).toHaveLength(12);
    for(let n=1;n<=12;n++){
      const start=mod(asc+(n-1)*30);
      expect(guardianHouseCusp(n,asc)).toBeCloseTo(start,7);
      expect(agentHouseFor(mod(start+0.001),asc)).toBe(n);
      expect(agentHouseFor(mod(start+29.999),asc)).toBe(n);
    }
    expect(agentHouseFor(mod(asc-0.001),asc)).toBe(12);
  });
  it.each([0,0.125,7.3666666667,19.999,29.999,359.999])("handles Ascendant degree offsets and zodiac wrap: %s",offset=>{
    for(let sign=0;sign<12;sign++){
      const asc=mod(sign*30+offset);
      for(let segment=0;segment<12;segment++){
        const target=mod(asc+segment*30+0.5);
        expect(guardianHouseAt(target,asc)).toBe(segment+1);
      }
    }
  });
  it("retains Scorpio 28° Sun in House 11 for Capricorn 7°22′ Ascendant",()=>{
    const asc=270+7+22/60;
    const sun=210+28+2/60;
    expect(agentHouseFor(sun,asc)).toBe(11);
    expect(guardianHouseCusp(11,asc)).toBeCloseTo(217+22/60,7);
  });
  it("calculates actual planetary houses from input birth data rather than fixed sign labels",async()=>{
    const chart=await calculateChart({location:"Dallas, Texas, USA",latitude:32.7767,longitude:-96.797,timezone:"America/Chicago",date:"1986-11-20",time:"10:06",worldview:"agent",readingScope:"natal"});
    const asc=chart.ascendant!.longitude;
    for(const row of [...chart.movingBodies,chart.northNode,chart.southNode]){
      expect(row.house,row.name).toBe(agentHouseFor(row.longitude,asc));
    }
    expect(chart.movingBodies.find(row=>row.name==="Sun")?.house).toBe(11);
  });
});
