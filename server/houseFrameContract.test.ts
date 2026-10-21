import { describe, expect, it } from "vitest";
import {
  agentHouseFor, equalHouseCusps, godHouseFor, guardianHouseAt,
  guardianHouseCusp, translateHouseLabelBetweenFrameworks,
  GUARDIAN_HOUSE_SEQUENCE, SIMULATION_LAB_HOUSE_SEQUENCE,
} from "./astrologyCore";

describe("Guardian authoritative 360° forward equal-house contract", () => {
  it("declares the two intentionally distinct methods", () => {
    expect(GUARDIAN_HOUSE_SEQUENCE).toBe("forward-equal-30");
    expect(SIMULATION_LAB_HOUSE_SEQUENCE).toBe("reverse-equal-30");
  });
  it.each([0, 210, 240, 359.5])("produces exactly twelve forward 30° cusps for Ascendant %s", asc => {
    const cusps = equalHouseCusps(asc);
    expect(cusps).toHaveLength(12);
    cusps.forEach((longitude, i) => {
      expect(longitude).toBeCloseTo(guardianHouseCusp(i + 1, asc), 5);
      expect(agentHouseFor((longitude + 0.01) % 360, asc)).toBe(i + 1);
    });
  });
  it("assigns Scorpio Ascendant to Sagittarius house 2, not Lab house 12", () => {
    expect(agentHouseFor(250, 210)).toBe(2);
    expect(agentHouseFor(280, 210)).toBe(3);
    expect(agentHouseFor(190, 210)).toBe(12);
  });
  it("reconciles with Lab reverse numbering without moving planetary coordinates", () => {
    const asc = 210;
    for (let segment = 0; segment < 12; segment++) {
      const physicalLongitude = (asc + segment * 30 + 10) % 360;
      const guardianHouse = guardianHouseAt(physicalLongitude, asc);
      const expectedLabHouse = segment === 0 ? 1 : 13 - segment;
      expect(translateHouseLabelBetweenFrameworks(guardianHouse)).toBe(expectedLabHouse);
      expect(translateHouseLabelBetweenFrameworks(expectedLabHouse)).toBe(guardianHouse);
    }
  });
  it("preserves God sectors and rejects invalid house labels", () => {
    expect(godHouseFor(0)).toBe(1);
    expect(godHouseFor(359.999)).toBe(12);
    expect(() => guardianHouseCusp(13, 0)).toThrow();
    expect(() => translateHouseLabelBetweenFrameworks(0)).toThrow();
  });
});
