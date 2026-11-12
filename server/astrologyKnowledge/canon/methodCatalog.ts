import { MASTER_METHOD_IDS } from "../../masterChart/registry";
import type { LayerRecord } from "../../masterChart/types";
import { HOUSE_CANON_RECORDS } from "./housesAndFrames";
import { PLANET_CANON_RECORDS, SIGN_CANON_RECORDS } from "./planetsAndSigns";
import {
  SUMERIAN_CELESTIAL_ASSOCIATIONS,
  SUMERIAN_CELESTIAL_SOURCE_TITLE,
} from "./sumerianCelestial";

type MethodId = (typeof MASTER_METHOD_IDS)[number];
type MethodReference = {
  meanings: readonly string[];
  rules: readonly string[];
  calculations: readonly string[];
};

const canon = "server/astrologyKnowledge/canon/";
const calculation = "server/astrologyKnowledge/calculations/";
const vedic = "server/astrologyKnowledge/vedic/";
const builder = "server/masterChart/builder.ts";
const western = canon + "westernRelationalAndTiming.ts";
const dignity = canon + "dignitiesAndHorary.ts";
const houses = canon + "housesAndFrames.ts";
const planets = canon + "planetsAndSigns.ts";
const starsAndLots = canon + "fixedStarsAndLots.ts";
const jyotish = canon + "vedicJyotishCanon.ts";
const synthesisRules = "server/astrologyKnowledge/synthesis/methodRules.ts";

const references = (
  meanings: readonly string[],
  rules: readonly string[],
  calculations: readonly string[]
): MethodReference => ({ meanings, rules, calculations });

export const CANON_METHOD_REFERENCES = {
  "western-planets-and-signs": references(
    [planets, canon + "planetInHouseInterpretations.ts"],
    ["shared/hybrid.ts"],
    ["server/astronomy.ts#calculateChart"]
  ),
  "sumerian-celestial-foundations": references(
    [canon + "sumerianCelestial.ts"],
    [synthesisRules],
    [builder]
  ),
  "western-houses-and-angles": references(
    [houses, canon + "jyotishHouseGroups.ts"],
    ["server/astrologyCore.ts", houses],
    [
      "server/astronomy.ts#sunriseAnchoredAngles",
      "server/astrologyCore.ts#equalHouseCusps",
    ]
  ),
  "western-aspects-and-orbs": references(
    [western],
    [synthesisRules, "shared/chartRules.ts"],
    [builder, "server/astronomy.ts#aspectBetween"]
  ),
  "western-essential-dignities": references(
    [planets, dignity],
    [dignity],
    [builder, calculation + "dignitiesAndHorary.ts"]
  ),
  "fixed-stars-royal-watchers": references(
    [starsAndLots, canon + "historicalStarCatalog.ts"],
    [starsAndLots],
    [builder, calculation + "fixedStarContacts.ts"]
  ),
  "arabic-hermetic-lots": references(
    [starsAndLots],
    [starsAndLots],
    [calculation + "hermeticLots.ts#calculateChartHermeticLots"]
  ),
  "arabic-lunar-manazil": references(
    [canon + "manazil28.ts"],
    ["shared/hybrid.ts"],
    [calculation + "manazil28.ts", builder]
  ),
  "vedic-nakshatras-and-padas": references(
    [canon + "nakshatras27.ts"],
    ["shared/hybrid.ts"],
    [calculation + "nakshatras27.ts", builder]
  ),
  "vedic-vargas-divisional": references(
    [jyotish],
    [vedic + "vargas.ts"],
    [vedic + "vargas.ts#vargaPlacement", vedic + "divisionalCharts.ts"]
  ),
  "vedic-dasha-and-ashtakavarga": references(
    [jyotish, canon + "nakshatras27.ts"],
    [vedic + "timingAndAshtakavarga.ts"],
    [vedic + "timingAndAshtakavarga.ts#resolveVedicTimingAndAshtakavarga"]
  ),
  "vedic-planetary-lordship-connections": references(
    [houses, planets, canon + "planetInHouseInterpretations.ts"],
    [vedic + "planetaryLordshipConnections.ts"],
    [
      vedic +
        "planetaryLordshipConnections.ts#buildPlanetaryLordshipConnections",
    ]
  ),
  "vedic-graha-drishti": references(
    [jyotish],
    [vedic + "index.ts", synthesisRules],
    [builder, vedic + "index.ts"]
  ),
  "vedic-shadbala": references(
    [jyotish, planets],
    [vedic + "strength.ts"],
    [vedic + "strength.ts#calculateVedicStrength"]
  ),
  "vedic-bhava-bala": references(
    [houses, jyotish],
    [vedic + "strength.ts"],
    [vedic + "strength.ts#calculateVedicStrength"]
  ),
  "chinese-lunar-mansions-xiu": references(
    [canon + "chineseMansions28.ts"],
    [canon + "chineseMansions28.ts"],
    [builder]
  ),
  "elemental-decans": references(
    [canon + "decans36.ts"],
    ["shared/hybrid.ts"],
    [calculation + "decans36.ts", builder]
  ),
  "kabbalah-sefer-yetzirah": references(
    [canon + "seferYetzirah.ts"],
    [canon + "seferYetzirah.ts"],
    [calculation + "seferYetzirah.ts#seferYetzirahEvidence"]
  ),
  "genesis-behavioral-patterns": references(
    ["server/astrologyKnowledge/behavioral/catalog.ts", jyotish],
    [
      "server/genesisBackup/vedicYogaDetector.ts",
      "server/astrologyKnowledge/behavioral/engine.ts",
    ],
    ["server/genesisBackup/adapter.ts#runGenesisPatternPipeline"]
  ),
  "transit-activation-layer": references(
    [western],
    ["shared/chartRules.ts", synthesisRules],
    [builder, "server/energyReadV2.ts#calculateEnergyRead"]
  ),
} satisfies Record<MethodId, MethodReference>;

export function canonReferencesForLayer(
  layerId: string
): MethodReference | undefined {
  const id = layerId.replace(/^transit:/, "");
  return Object.hasOwn(CANON_METHOD_REFERENCES, id)
    ? CANON_METHOD_REFERENCES[id as MethodId]
    : undefined;
}

export function bindCanonMethod(layer: LayerRecord) {
  const references = canonReferencesForLayer(layer.id);
  if (!references) throw new Error(`CANON_METHOD_UNREGISTERED: ${layer.id}`);
  return {
    methodId: layer.id,
    references,
    output: {
      frame: layer.frame,
      status: layer.status,
      calculationVersion: layer.calculationVersion,
      evidenceIds: layer.evidenceIds,
      sourceIds: layer.sourceIds,
    },
  };
}

/** Serializable doctrine projection for consumers that run their own calculations. */
export function exportSportsCanon() {
  return {
    schemaVersion: 1,
    source: "kevinparksinc-maker/firmament-guardian",
    methods: MASTER_METHOD_IDS.map(id => ({
      id,
      ...CANON_METHOD_REFERENCES[id],
    })),
    meanings: {
      planets: Object.fromEntries(
        Object.values(PLANET_CANON_RECORDS).map(record => [
          record.name,
          {
            terms: record.coreMeanings,
            source: record.firmamentCanonNote.provenance,
          },
        ])
      ),
      signs: Object.fromEntries(
        Object.values(SIGN_CANON_RECORDS).map(record => [
          record.name,
          { terms: record.traditionalQualities, source: record.provenance },
        ])
      ),
      houses: Object.fromEntries(
        Object.values(HOUSE_CANON_RECORDS).map(record => [
          record.house,
          {
            title: record.traditionalTitle,
            topics: record.coreTopics,
            source: record.agentViewDefinition.provenance,
          },
        ])
      ),
      sumerian: {
        source: SUMERIAN_CELESTIAL_SOURCE_TITLE,
        correspondences: SUMERIAN_CELESTIAL_ASSOCIATIONS,
      },
    },
  };
}
