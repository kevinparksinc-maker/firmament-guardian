import { describe, it, expect } from "vitest";
import { buildPlanetaryLordshipConnections } from "./planetaryLordshipConnections";

const names = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
function chart(asc: number, overrides: Record<string,number> = {}) {
  const longitudes: Record<string,number> = {
    Sun: 125, Moon: 95, Mars: 305, Mercury: 165, Jupiter: 245,
    Venus: 185, Saturn: 275, Rahu: 65, Ketu: 245, ...overrides,
  };
  return {
    ascendantLongitude: asc,
    houseCusps: Array.from({length:12},(_,i)=>(asc+i*30)%360),
    placements: names.map(name => ({
      name,
      longitude: longitudes[name],
      house: Math.floor(((longitudes[name]-asc+360)%360)/30)+1,
    })),
  };
}

describe("structural planetary lordship connections", () => {
  it("uses the existing Equal House occupancy and emits exactly nine planet records", () => {
    const result = buildPlanetaryLordshipConnections(chart(270));
    expect(result).toHaveLength(9);
    const mars = result.find(p => p.planet === "Mars")!;
    expect(mars.occupiedHouse).toBe(2);
    expect(mars.ruledHouses).toEqual([4,11]);
    expect(mars.connections).toEqual([
      { fromHouse: 4, toHouse: 2, type: "carry" },
      { fromHouse: 11, toHouse: 2, type: "carry" },
    ]);
    expect(result.filter(p => ["Rahu","Ketu"].includes(p.planet))
      .every(p => p.connections.length===0 && p.ruledHouses.length===0)).toBe(true);
  });

  it("recognizes own-house placement without generating a self-loop", () => {
    const result = buildPlanetaryLordshipConnections(chart(0, { Mars: 5 }));
    const mars = result.find(p => p.planet === "Mars")!;
    expect(mars.selfPlacedFor).toEqual([1]);
    expect(mars.connections).toEqual([{fromHouse:8,toHouse:1,type:"carry"}]);
  });

  it("detects symmetric Venus/Mars sign exchange without substituting sign houses for Equal House occupancy", () => {
    const result = buildPlanetaryLordshipConnections(chart(0, {Venus:215, Mars:35}));
    const mars = result.find(p => p.planet === "Mars")!;
    const venus = result.find(p => p.planet === "Venus")!;
    expect(mars.exchangeWith?.partnerPlanet).toBe("Venus");
    expect(venus.exchangeWith?.partnerPlanet).toBe("Mars");
    expect(mars.occupiedHouse).toBe(2);
    expect(venus.occupiedHouse).toBe(8);
  });

  it("preserves Equal House occupancy when a planet's sign differs from the house cusp sign", () => {
    const result = buildPlanetaryLordshipConnections(chart(20, {Mars:35}));
    const mars = result.find(p => p.planet === "Mars")!;
    expect(mars.occupiedHouse).toBe(1);
    expect(mars.ruledHouses).toEqual([1,8]);
    expect(mars.selfPlacedFor).toEqual([1]);
    expect(mars.connections).toEqual([{fromHouse:8,toHouse:1,type:"carry"}]);
  });

  it("does not invent scores, aspects, or dasha values", () => {
    const result = buildPlanetaryLordshipConnections(chart(270));
    expect(JSON.stringify(result)).not.toMatch(/weight|strengthScore|drishti|dasha|ayanamsa/i);
    for (const row of result)
      expect(row.connections.length).toBe(row.ruledHouses.length - row.selfPlacedFor.length);
  });
});
