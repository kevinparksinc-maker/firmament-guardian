import { contributionFromEvidence, type PlacementAdapter } from "./types";

export const fixedStars: PlacementAdapter = context => {
  const body = context.body.toLowerCase();
  const evidence = [...context.packet.fixedStarEvidence, ...context.packet.canonEvidence]
    .filter(item => item.subject.toLowerCase() === body &&
      (item.technique === "fixed-stars" || item.technique.startsWith("fixed-star-")));
  return contributionFromEvidence(context, "fixedStars", "Fixed stars", evidence, {
    reason: "Fixed stars amplify the character of each calculated contact. Squares and oppositions intensify pressure, trines and sextiles intensify support, and conjunctions intensify the joined expression.",
  });
};
