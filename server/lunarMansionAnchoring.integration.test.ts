import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { agentHouseFor } from "./astrologyCore";
import { retrieveChartCanonDossier, canonDossierToEvidenceItems } from "./astrologyKnowledge/canon/retriever";
import { CHINESE_MANSIONS, DEFAULT_CHINESE_MANSIONS, chineseMansionAtRa } from "./astrologyKnowledge/canon/chineseMansions28";

const input = {
  location: "Las Vegas, Nevada, USA", latitude: 36.1699, longitude: -115.1398,
  timezone: "America/Los_Angeles", date: "1999-01-17", time: "01:00",
  worldview: "agent" as const, readingScope: "natal" as const,
};
describe("12 Gates mansion anchoring — full astronomy to interpreter", () => {
  it("uses 28 anchored, unequal J2000 Chinese right-ascension intervals", () => {
    expect(CHINESE_MANSIONS).toHaveLength(28);
    expect(DEFAULT_CHINESE_MANSIONS.boundaries).toHaveLength(28);
    expect(DEFAULT_CHINESE_MANSIONS.boundaries.reduce((sum,b)=>sum+b.widthDegrees,0)).toBeCloseTo(360,6);
    expect(new Set(CHINESE_MANSIONS.map(m=>m.determinativeStar)).size).toBe(28);
    for(const b of DEFAULT_CHINESE_MANSIONS.boundaries) {
      expect(chineseMansionAtRa(b.startRightAscensionDegrees, DEFAULT_CHINESE_MANSIONS).mansion.index).toBe(b.mansion.index);
      expect(b.widthDegrees).toBeGreaterThan(0);
    }
  });
  it("assigns all available planets and nodes from J2000 RA and preserves their houses", async () => {
    const chart = await calculateChart(input);
    const dossier = retrieveChartCanonDossier(chart);
    const bodies = [...chart.movingBodies, chart.northNode, chart.southNode];
    for (const body of bodies) {
      expect(Number.isFinite(body.j2000RaDegrees), body.name).toBe(true);
      expect(body.house, body.name).toBe(agentHouseFor(body.longitude, chart.ascendant!.longitude));
      const record = dossier.placements.find(p=>p.body===body.name);
      expect(record?.chineseMansion, body.name).toBeDefined();
      expect(record?.chineseMansion?.index).toBe(chineseMansionAtRa(body.j2000RaDegrees!,DEFAULT_CHINESE_MANSIONS).mansion.index);
      expect(record?.manzilRecord, body.name).toBeDefined();
      expect(record?.nakshatraRecord, body.name).toBeDefined();
    }
    const evidence = canonDossierToEvidenceItems(dossier);
    expect(evidence.some(e=>e.statement.includes("Chinese Xiu:") && !e.statement.includes("Chinese Xiu: unavailable"))).toBe(true);
  });
  it("does not mix ecliptic longitude with stellar right ascension", async () => {
    const chart=await calculateChart(input);
    const sun=chart.movingBodies.find(p=>p.name==="Sun")!;
    expect(sun.j2000RaDegrees).toBeDefined();
    expect(sun.j2000RaDegrees).toBeGreaterThanOrEqual(0);
    expect(sun.j2000RaDegrees).toBeLessThan(360);
  });
});
