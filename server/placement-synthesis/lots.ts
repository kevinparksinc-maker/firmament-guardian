import { contributionFromEvidence, type PlacementAdapter } from "./types";

export const lots: PlacementAdapter = context => {
  const body = context.body.toLowerCase();
  const records = context.packet.arabicEvidence.filter(item => item.technique === "lots");
  const gap = records.find(item => item.category === "uncertainty");
  if (gap) return {
    method: "lots", label: "Lots: Fortune, Spirit, Eros and Necessity", status: "incomplete",
    relation: "unavailable", result: [], sourceTrace: [], reason: gap.statement,
  };
  const related = records.filter(item => item.category !== "uncertainty" &&
    (item.subject.toLowerCase() === body || item.concepts.includes(body)));
  return contributionFromEvidence(context, "lots", "Lots: Fortune, Spirit, Eros and Necessity", related, {
    reason: "Relevance follows formula participation or a calculated aspect to the Lot.",
  });
};
