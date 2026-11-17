import { contributionFromEvidence, type PlacementAdapter } from "./types";

export const kabbalah: PlacementAdapter = context => {
  const evidence = context.packet.canonEvidence.filter(item => item.sourceId === "sefer-yetzirah-canon");
  const placement = evidence.filter(item => item.subject.toLowerCase() === context.body.toLowerCase());
  const framework = evidence.filter(item => [
    "sefer-yetzirah-framework",
    "sefer-yetzirah-mothers",
    "sefer-yetzirah-contraries",
    "four-worlds",
  ].includes(item.technique));
  return contributionFromEvidence(context, "kabbalah", "Sefer Yetzirah / Kabbalah / Four Worlds",
    placement.length ? [...placement, ...framework] : []);
};
