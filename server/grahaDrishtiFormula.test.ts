import { describe, expect, it } from "vitest";
import { grahaDrishtiTargetHouses } from "./astrologyKnowledge/vedic";

const expected: Record<string, number[]> = { Mars:[4,7,8], Jupiter:[5,7,9], Saturn:[3,7,10] };
const wrap=(house:number)=>((house-1)%12)+1;

describe("classical Parashari graha drishti all-house verification",()=>{
  it.each(Object.entries(expected).flatMap(([planet, counts]) =>
    Array.from({length:12},(_,i)=>({planet,counts,house:i+1}))))
  ("$planet aspects correct targets from house $house", ({planet,counts,house})=>{
    const targets=grahaDrishtiTargetHouses(planet,house);
    expect(targets).toEqual(counts.map(count=>wrap(house+count-1)));
    expect(new Set(targets).size).toBe(3);
    expect(targets.every(t=>t>=1&&t<=12)).toBe(true);
  });
  it("counts the occupied house as 1, not 0",()=>{
    expect(grahaDrishtiTargetHouses("Saturn",1)).toEqual([3,7,10]);
    expect(grahaDrishtiTargetHouses("Saturn",12)).toEqual([2,6,9]);
    expect(grahaDrishtiTargetHouses("Mars",12)).toEqual([3,6,7]);
    expect(grahaDrishtiTargetHouses("Jupiter",12)).toEqual([4,6,8]);
  });
  it("rejects impossible houses and ignores planets without special aspects",()=>{
    expect(()=>grahaDrishtiTargetHouses("Saturn",0)).toThrow();
    expect(()=>grahaDrishtiTargetHouses("Mars",13)).toThrow();
    expect(grahaDrishtiTargetHouses("Venus",5)).toEqual([]);
  });
});
