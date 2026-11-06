import type { ChartResult } from "../server/astronomy";
/** A reading belongs to one account, question, mode and calculated chart snapshot. */
export function readingCacheIdentity(chart: ChartResult, mode: "natal" | "transit" | "combined", question = "", accountId = "guest") {
  return `absolute-reading-v9-rule-judgments:${JSON.stringify({
    accountId, question: question.trim().replace(/\s+/g, " "), mode,
    input: chart.input, utc: chart.utc, transitDate: chart.transitDate,
    worldview: chart.worldview, houses: chart.houses,
    natal: chart.movingBodies.map(body=>[body.name,body.longitude,body.house]),
    transits: chart.transits.map(body=>[body.name,body.longitude,body.house]),
  })}`;
}
