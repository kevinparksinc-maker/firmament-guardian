import { contributionFromEvidence, type PlacementAdapter } from "./types";

export const transits: PlacementAdapter = context => {
  if (context.chart.readingScope === "natal" || !context.chart.transits.length)
    return { method: "transits", label: "Transits to natal", status: "not-applicable", relation: "unavailable", result: [], sourceTrace: [], reason: "This chart has no transit-to-natal comparison in the current reading scope." };
  const evidence = context.packet.timingEvidence.filter(item =>
    item.sourceTrace.calculationSettings?.natalBody === context.row.name);
  return contributionFromEvidence(context, "transits", "Transits to natal", evidence, {
    reason: evidence.length ? undefined : "No placement-specific transit contact was returned.",
  });
};
