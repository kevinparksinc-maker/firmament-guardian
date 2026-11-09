import { formatLongitude, normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type { ChartResult } from "../../astronomy";
import { LOT_CANON_RECORDS } from "../canon/fixedStarsAndLots";
import { HOUSE_CANON_RECORDS } from "./housesAndFrames";
import type { LotCanonRecord } from "../canon/types";

/** Execute Hermetic Lot formulas outside the Canon reference library. */
export function calculateChartHermeticLots(
  chart: ChartResult,
  isDayChart: boolean
): Array<{
  lot: LotCanonRecord;
  longitude: number;
  display: string;
  sign: string;
  house: number;
  houseInterpretation: string;
}> {
  if (!chart.ascendant || !Number.isFinite(chart.ascendant.longitude)) {
    return [];
  }
  const asc = normalizeLongitude(chart.ascendant.longitude);
  const bodyLon = (name: string) => {
    const found = chart.movingBodies.find(b => b.name === name);
    return found && Number.isFinite(found.longitude)
      ? normalizeLongitude(found.longitude)
      : undefined;
  };

  const sun = bodyLon("Sun");
  const moon = bodyLon("Moon");
  if (sun == null || moon == null) return [];

  const fortune = isDayChart
    ? normalizeLongitude(asc + moon - sun)
    : normalizeLongitude(asc + sun - moon);
  const spirit = isDayChart
    ? normalizeLongitude(asc + sun - moon)
    : normalizeLongitude(asc + moon - sun);

  const venus = bodyLon("Venus");
  const mercury = bodyLon("Mercury");
  const mars = bodyLon("Mars");
  const jupiter = bodyLon("Jupiter");
  const saturn = bodyLon("Saturn");

  const computed: Array<[string, number | undefined]> = [
    ["fortune", fortune],
    ["spirit", spirit],
    [
      "eros",
      venus != null
        ? isDayChart
          ? normalizeLongitude(asc + venus - spirit)
          : normalizeLongitude(asc + spirit - venus)
        : undefined,
    ],
    [
      "necessity",
      mercury != null
        ? isDayChart
          ? normalizeLongitude(asc + fortune - mercury)
          : normalizeLongitude(asc + mercury - fortune)
        : undefined,
    ],
    [
      "courage",
      mars != null
        ? isDayChart
          ? normalizeLongitude(asc + fortune - mars)
          : normalizeLongitude(asc + mars - fortune)
        : undefined,
    ],
    [
      "victory",
      jupiter != null
        ? isDayChart
          ? normalizeLongitude(asc + jupiter - spirit)
          : normalizeLongitude(asc + spirit - jupiter)
        : undefined,
    ],
    [
      "nemesis",
      saturn != null
        ? isDayChart
          ? normalizeLongitude(asc + fortune - saturn)
          : normalizeLongitude(asc + saturn - fortune)
        : undefined,
    ],
  ];

  const houseForLon = (lon: number) => {
    if (chart.agentViewAvailable && chart.ascendant) {
      return (Math.floor(normalizeLongitude(lon - asc) / 30) % 12) + 1;
    }
    return (Math.floor(normalizeLongitude(lon) / 30) % 12) + 1;
  };

  return computed
    .filter((entry): entry is [string, number] => entry[1] != null)
    .map(([id, longitude]) => {
      const lot = LOT_CANON_RECORDS[id];
      const sign = ZODIAC_SIGNS[Math.floor(longitude / 30)];
      const house = houseForLon(longitude);
      const houseRec = HOUSE_CANON_RECORDS[house];
      const houseInterpretation = houseRec
        ? `${lot.name} falls in ${sign} in House ${house} (${houseRec.traditionalTitle}), anchoring ${lot.psychologicalMeaning.toLowerCase()} within ${houseRec.coreTopics[0].toLowerCase()}.`
        : `${lot.name} falls in ${sign} in House ${house}.`;
      return {
        lot,
        longitude: Number(longitude.toFixed(4)),
        display: formatLongitude(longitude),
        sign,
        house,
        houseInterpretation,
      };
    });
}
