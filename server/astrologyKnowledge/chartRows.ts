import type { ChartResult, ChartRow } from "../astronomy";

export function chartRows(chart: ChartResult) {
  return [
    ...chart.movingBodies,
    chart.ascendant,
    chart.northNode,
    chart.southNode,
  ].filter((row): row is ChartRow => Boolean(row));
}
