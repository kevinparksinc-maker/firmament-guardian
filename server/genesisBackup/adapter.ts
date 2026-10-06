import type { ChartResult, ChartRow } from "../astronomy";
import {
  detectAllYogas,
  runAstroReading,
  type PlanetPlacement,
  type ReadingResult,
  type YogaResult,
} from "./index";

export type GenesisAstroPipelineResult = {
  engine: "genesis-astro-engine";
  mode: "natal-only" | "transit-only" | "full";
  result: ReadingResult | null;
  error: string | null;
  yogas: YogaResult[];
  natalInput: string;
  transitInput: string;
};

function placement(row: ChartRow, kind: "natal" | "transit"): PlanetPlacement {
  const sign = row.display.split(" ")[0];
  const degree = row.longitude % 30;
  return {
    planet: row.name,
    degree,
    sign,
    house: row.house,
    rx: Boolean(row.retrograde),
    combust: false,
    cazimi: false,
    absolute: row.longitude,
    raw: `${row.name}: ${degree.toFixed(4)}° ${sign}, ${row.house} house`,
    kind,
  };
}

function asText(rows: ChartRow[], kind: "natal" | "transit") {
  return rows
    .filter(row => Number.isFinite(row.longitude))
    .map(row => {
      const item = placement(row, kind);
      return `${item.planet}: ${item.degree.toFixed(4)}° ${item.sign}, ${item.house} house${item.rx ? " Rx" : ""}`;
    })
    .join("\n");
}

export function runGenesisAstroPipeline(
  chart: ChartResult
): GenesisAstroPipelineResult {
  const natalRows = chart.movingBodies;
  const transitRows = chart.readingScope === "natal" ? [] : chart.transits;
  const natalInput = asText(natalRows, "natal");
  const transitInput = asText(transitRows, "transit");
  const reading = runAstroReading(
    natalInput,
    transitInput,
    `Firmament ${chart.worldview} / ${chart.readingScope} chart`
  );
  const yogaRows = natalRows.map(row => ({
    name: row.name,
    sign: row.display.split(" ")[0],
    house: row.house,
    degree: row.longitude % 30,
  }));
  return {
    engine: "genesis-astro-engine",
    mode: reading.mode,
    result: reading.result,
    error: reading.error,
    yogas: detectAllYogas(yogaRows),
    natalInput,
    transitInput,
  };
}
