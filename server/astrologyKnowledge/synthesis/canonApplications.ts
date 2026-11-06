import type { UnifiedMasterChartSnapshot } from "../../masterChart/types";
import type { LayerRecord } from "../../masterChart/types";
import type { EvidenceItem } from "../types";
import type { CanonRuleApplication } from "./types";

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

type RuleFallback = {
  ruleId: string;
  sourceId: string;
  sourceTitle: string;
  technique: string;
  statement: (layer: LayerRecord) => string;
};

/**
 * These are not generic prose fallbacks. They are the explicit rule contracts
 * for calculated layers whose detailed Canon evidence uses a different
 * producer/technique identifier than the Master Chart ledger.
 */
const METHOD_RULE_FALLBACKS: Record<string, RuleFallback> = {
  "western-aspects-and-orbs": {
    ruleId: "ptolemy-aspect-orbs",
    sourceId: "ptolemy-aspect-orbs",
    sourceTitle: "Ptolemaic aspect and orb rules",
    technique: "ptolemaic-aspects",
    statement: layer => "Each calculated contact is judged by its named aspect, polarity, and measured orb; contacts outside the configured orb are excluded.",
  },
  "western-essential-dignities": {
    ruleId: "western-essential-dignities",
    sourceId: "dorotheus-carmen-astrologicum",
    sourceTitle: "Dorotheus, Carmen Astrologicum — essential dignity rules",
    technique: "essential-dignities",
    statement: layer => "Each calculated planet is classified by its sign ruler and exaltation status; domicile and exaltation strengthen delivery, while peregrine condition supplies no essential dignity.",
  },
  "arabic-hermetic-lots": {
    ruleId: "arabic-hermetic-lots-sect-formula",
    sourceId: "paulus-alexandrinus-ch23",
    sourceTitle: "Paulus Alexandrinus, Chapter 23 — Hermetic Lots",
    technique: "hermetic-lots-arabic-parts",
    statement: layer => "The calculated Lots are judged from the validated day/night sect formula and their Agent View house placement; no Lot judgment is issued without a local Ascendant.",
  },
  "vedic-vargas-divisional": {
    ruleId: "vedic-varga-architecture",
    sourceId: "brihat-parashara-hora-shastra",
    sourceTitle: "Brihat Parashara Hora Shastra, Chapter 6 — Parashari Vargas",
    technique: "parashari-divisional-vargas",
    statement: layer => "Each calculated D2, D3, D9, and D10 placement is interpreted as a derivative of the authoritative natal longitude; the explicit Firmament coordinate variant is retained and no Lahiri offset is invented.",
  },
  "vedic-dasha-and-ashtakavarga": {
    ruleId: "vedic-dasha-ashtakavarga-classical",
    sourceId: "brihat-parashara-dasha-system",
    sourceTitle: "Brihat Parashara Hora Shastra — Vimshottari Dasha and Ashtakavarga",
    technique: "vimshottari-dasha-and-ashtakavarga",
    statement: layer => "Vimshottari periods and Ashtakavarga bindus are admitted only when their calculated epoch, birth-time, and checksum validations pass; failed validation withholds timing judgment.",
  },
  "vedic-graha-drishti": {
    ruleId: "parashari-graha-drishti",
    sourceId: "parashari-drishti-canon",
    sourceTitle: "Parashari Graha Drishti — universal and special aspects",
    technique: "graha-drishti-special-aspects",
    statement: layer => "The calculated seventh aspect and the recorded Mars 4/8, Jupiter 5/9, and Saturn 3/10 special aspects are judged as sign/house offsets, separate from Western aspect geometry.",
  },
  "kabbalah-sefer-yetzirah": {
    ruleId: "sefer-yetzirah-correspondences",
    sourceId: "sefer-yetzirah-canon",
    sourceTitle: "Sefer Yetzirah correspondence layer",
    technique: "sefer-yetzirah-32-paths-and-letters",
    statement: layer => "The calculated Sefer Yetzirah correspondences are judged through the recorded planetary gates, doubles, and contrary pairs; this symbolic layer qualifies rather than replaces astronomical testimony.",
  },
  "genesis-behavioral-patterns": {
    ruleId: "genesis-pattern-engine",
    sourceId: "genesis-pattern-rules",
    sourceTitle: "Genesis Pattern Engine — deterministic pattern and Yoga rules",
    technique: "genesis-pattern-engine-and-yogas",
    statement: layer => "The returned Genesis patterns and Yoga records are judged only from the validated chart relationships supplied to the engine; no personality claim is created when the engine returns no result.",
  },
  "transit-activation-layer": {
    ruleId: "firmament-transit-weather",
    sourceId: "firmament-transit-weather",
    sourceTitle: "Firmament transit-to-natal activation rules",
    technique: "transit-to-natal-activation",
    statement: layer => "Each transit contact is judged from its calculated natal target, aspect, orb, intensity, flow, and strength; transit weather does not replace the natal promise.",
  },
};

function calculatedRuleApplication(layer: LayerRecord): CanonRuleApplication | undefined {
  const rule = METHOD_RULE_FALLBACKS[layer.id];
  if (!rule || layer.status !== "computed-with-result" || layer.evidenceIds.length === 0) return undefined;
  return {
    canonEvidenceId: `canon-${layer.id}`,
    ruleId: rule.ruleId,
    sourceId: rule.sourceId,
    sourceTitle: rule.sourceTitle,
    technique: rule.technique,
    subject: layer.name,
    statement: rule.statement(layer),
    calculationEvidenceIds: layer.evidenceIds,
    confidence: "moderate",
    implementationStatus: "implemented",
  };
}

function chartEvidenceIdsForItem(
  item: EvidenceItem,
  snapshot: UnifiedMasterChartSnapshot,
): string[] {
  const evidence = new Set<string>();
  const concepts = new Set(item.concepts.map(concept => concept.toLowerCase()));

  for (const id of snapshot.methodExecutionLedger.flatMap(layer => layer.evidenceIds)) {
    if (concepts.has(id.toLowerCase())) evidence.add(id);
  }

  const bodyNames = new Set<string>();
  for (const body of [item.subject, ...item.concepts]) {
    const match = body.match(/(?:^|[-\s])(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|rahu|ketu|north[- ]node|south[- ]node|ascendant|descendant|midheaven)(?:$|[-\s])/i);
    if (match) bodyNames.add(slug(match[1]));
  }
  for (const body of Array.from(bodyNames)) {
    const id = `planet-${body}`;
    if (snapshot.methodExecutionLedger.some(layer => layer.evidenceIds.includes(id))) evidence.add(id);
  }

  const houses = new Set<string>();
  for (const value of [item.subject, ...item.concepts]) {
    const match = value.match(/(?:house[- ]|House\s+)(\d{1,2})/i);
    if (match) houses.add(`house-${match[1]}`);
  }
  for (const house of Array.from(houses)) {
    if (snapshot.methodExecutionLedger.some(layer => layer.evidenceIds.includes(house))) evidence.add(house);
  }

  // Some Canon outputs are calculated by a named method rather than a single
  // planet/house evidence ID. Preserve that calculation lineage as well.
  const techniqueHints = [item.technique, ...item.concepts].map(slug);
  for (const layer of snapshot.methodExecutionLedger) {
    if (techniqueHints.some(hint => hint && (layer.id.includes(hint) || layer.technique.includes(hint)))) {
      layer.evidenceIds.forEach(id => evidence.add(id));
    }
  }

  return Array.from(evidence);
}

export function buildCanonRuleApplications(
  snapshot: UnifiedMasterChartSnapshot,
  canonEvidence: EvidenceItem[],
): CanonRuleApplication[] {
  const applications: CanonRuleApplication[] = canonEvidence.map(item => ({
    canonEvidenceId: item.id,
    ruleId: item.ruleId ?? item.sourceTrace.ruleId ?? "unknown-canon-rule",
    sourceId: item.sourceId,
    sourceTitle: item.sourceTrace.sourceTitle,
    technique: item.technique,
    subject: item.subject,
    statement: item.statement,
    calculationEvidenceIds: chartEvidenceIdsForItem(item, snapshot),
    confidence: item.sourceTrace.confidence,
    implementationStatus: item.sourceTrace.implementationStatus,
  }));
  const covered = new Set(
    applications.flatMap(application => application.calculationEvidenceIds),
  );
  for (const layer of snapshot.methodExecutionLedger) {
    if (layer.evidenceIds.some(id => covered.has(id))) continue;
    const application = calculatedRuleApplication(layer);
    if (application) applications.push(application);
  }
  return applications;
}
