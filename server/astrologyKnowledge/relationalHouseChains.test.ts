import { describe, expect, it } from "vitest";
import { calculateChart } from "../astronomy";
import { buildRelationalHouseChains } from "./canon/westernRelationalAndTiming";
import { retrieveChartCanonDossier, canonDossierToEvidenceItems } from "./canon/retriever";

const input = {
  date: "1986-11-20", time: "10:06", latitude: 32.7767, longitude: -96.797,
  timezone: "America/Chicago", location: "Dallas, TX",
};

describe("all twelve planetary lordship house connections", () => {
  it("calculates every house and passes each connection to synthesis evidence", () => {
    const chart = calculateChart(input);
    const chains = buildRelationalHouseChains(chart, true, []);
    expect(chains.map(c => c.house)).toEqual(Array.from({length:12}, (_,i)=>i+1));
    for (const chain of chains) {
      expect(chain.ruler).toBeTruthy();
      expect(chain.rulerHouse).toBeGreaterThanOrEqual(1);
      expect(chain.rulerHouse).toBeLessThanOrEqual(12);
      expect(chain.workedChainSummary).toBeTruthy();
    }
    const dossier = retrieveChartCanonDossier(chart);
    expect(dossier.relationalChains).toHaveLength(12);
    const evidence = canonDossierToEvidenceItems(dossier).filter(e => e.technique === "relational-house-chain");
    expect(evidence).toHaveLength(12);
  });
});
