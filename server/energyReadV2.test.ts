import { describe, expect, it } from "vitest";
import { calculateEnergyRead, energyOrbIntensity, energySeparation, ENERGY_ASPECTS, ENERGY_WEIGHTS, type EnergyBody } from "./energyReadV2";

const names = Object.keys(ENERGY_WEIGHTS);
const bodies = (offset = 0): EnergyBody[] => names.map((name, index) => ({ name, longitude: (index * 31 + offset) % 360, godHouse: 1 + Math.floor(((index * 31 + offset) % 360) / 30) }));
const isolated = (n: string, t: string, angle: number, orb = 0) => {
  const natal = bodies(), transits = bodies(17);
  natal.forEach((p, i) => { p.longitude = i * 0.001; });
  transits.forEach((p, i) => { p.longitude = 200 + i * 0.001; });
  natal.find(p => p.name === n)!.longitude = 0;
  transits.find(p => p.name === t)!.longitude = angle + orb;
  return calculateEnergyRead(natal, transits).contacts.find(c => c.natal === n && c.transit === t);
};

describe("Energy Read V2 scoring", () => {
  it("defines exactly eight approved aspects and ten planets", () => {
    expect(ENERGY_ASPECTS).toHaveLength(8);
    expect(names).toHaveLength(10);
    expect(ENERGY_ASPECTS.filter(a => a.kind === "harmony")).toHaveLength(4);
    expect(ENERGY_ASPECTS.filter(a => a.kind === "friction")).toHaveLength(4);
  });
  it("uses correct orb boundaries and rejects out of range", () => {
    expect([0, 1, 2, 3, 4, 5].map(energyOrbIntensity)).toEqual([5, 5, 4, 3, 2, 1]);
    expect(energyOrbIntensity(0.01)).toBe(5);
    expect(energyOrbIntensity(1.01)).toBe(4);
    expect(() => energyOrbIntensity(5.01)).toThrow();
  });
  it("wraps angular distance across Aries", () => expect(energySeparation(359, 1)).toBe(2));
  it.each(ENERGY_ASPECTS)("scores $name correctly", aspect => {
    const c = isolated("Sun", "Moon", aspect.angle);
    expect(c?.aspect).toBe(aspect.name);
    expect(c?.polarity).toBe(aspect.kind);
    expect(c?.score).toBe(5 + 5 + aspect.weight + 5);
  });
  it("scores documented Saturn/Moon and Neptune/Mercury fixtures", () => {
    expect(isolated("Saturn", "Moon", 180, 3.19)?.score).toBe(17);
    expect(isolated("Neptune", "Mercury", 45, 0.21)?.score).toBe(15);
  });
  it("counts no contact when outside five degrees", () => {
    expect(isolated("Sun", "Moon", 120, 5.001)).toBeUndefined();
  });
  it("rejects invalid coordinates and duplicate planets", () => {
    const natal = bodies(), transits = bodies(7);
    natal[0].longitude = Number.NaN;
    expect(() => calculateEnergyRead(natal, transits)).toThrow();
    natal[0].longitude = 0;
    natal[1].name = natal[0].name;
    expect(() => calculateEnergyRead(natal, transits)).toThrow();
  });
  it("reports no-contacts without fabricating 50/50", () => {
    const natal = bodies();
    const transits = bodies(11.123);
    // The totals must always match the ledger, regardless of the number of contacts.
    const result = calculateEnergyRead(natal, transits);
    expect(result.total).toBe(result.harmony + result.friction);
    expect(result.contacts.length).toBe(result.harmonyCount + result.frictionCount);
    if (result.total === 0) {
      expect(result.status).toBe("no-contacts");
      expect(result.harmonyPercent).toBeNull();
      expect(result.frictionPercent).toBeNull();
    } else {
      expect(result.harmonyPercent! + result.frictionPercent!).toBeCloseTo(100);
    }
  });
  it("does not let houses alter the score", () => {
    const natal = bodies(), transits = bodies(4);
    const a = calculateEnergyRead(natal, transits);
    const b = calculateEnergyRead(natal.map(p => ({ ...p, agentHouse: 12, godHouse: 12 })), transits.map(p => ({ ...p, agentHouse: 2, godHouse: 2 })));
    expect(a.total).toBe(b.total);
    expect(a.contacts.map(c => c.score)).toEqual(b.contacts.map(c => c.score));
  });
});
