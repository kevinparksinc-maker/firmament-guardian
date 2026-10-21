import { describe, expect, it } from "vitest";
import { calculateChart } from "./astronomy";
import { retrieveChartCanonDossier, canonDossierToEvidenceItems } from "./astrologyKnowledge/canon/retriever";
import { chineseMansionAtRa, DEFAULT_CHINESE_MANSIONS } from "./astrologyKnowledge/canon/chineseMansions28";

describe("12 Gates lunar mansion stellar integration", () => {
  it("assigns J2000 Chinese mansions to all planets and lunar nodes without altering ecliptic positions", async () => {
    const chart = await calculateChart({location:"Las Vegas",latitude:36.1699,longitude:-115.1398,timezone:"America/Los_Angeles",date:"1999-01-17",time:"01:00",worldview:"agent",readingScope:"natal"});
    const dossier = retrieveChartCanonDossier(chart);
    const rows = [...chart.movingBodies,chart.northNode,chart.southNode];
    expect(rows).toHaveLength(12);
    for (const body of rows) {
      expect(Number.isFinite(body.j2000RaDegrees)).toBe(true);
      const record = dossier.placements.find(p=>p.body===body.name);
      expect(record?.chineseMansion?.index).toBe(chineseMansionAtRa(body.j2000RaDegrees!,DEFAULT_CHINESE_MANSIONS).mansion.index);
      expect(record?.longitude).toBeCloseTo(body.longitude,6);
      expect(record?.displayedHouse).toBe(body.house);
    }
    expect(canonDossierToEvidenceItems(dossier).some(e=>e.statement.includes("Chinese Xiu:"))).toBe(true);
  });
  it("keeps the lunar mansion reference frame separate from tropical longitude",()=>{
    const xiu = chineseMansionAtRa(201.29833333333332, DEFAULT_CHINESE_MANSIONS);
    expect(xiu.mansion.hanzi).toBe("角");
    expect(DEFAULT_CHINESE_MANSIONS.boundaries).toHaveLength(28);
  });
});
