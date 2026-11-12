import { localDateTime } from "../../shared/transitTime";
import { detectAllYogas } from "../genesisBackup/vedicYogaDetector";
import { buildDivisionalCharts } from "../astrologyKnowledge/vedic/divisionalCharts";
import { registeredMethodLedger } from "./registry";
import { createMasterChartDataBus } from "./chartDataBus";
import { buildPlanetaryLordshipConnections } from "../astrologyKnowledge/vedic/planetaryLordshipConnections";
import { calculateVedicStrength, STRENGTH_VERSION } from "../astrologyKnowledge/vedic/strength";
import { SUMERIAN_CELESTIAL_ASSOCIATIONS, SUMERIAN_CELESTIAL_SOURCE_ID, ENLIL_HISTORICAL_NOTE } from "../astrologyKnowledge/canon/sumerianCelestial";
import crypto from "crypto";
import {
  calculateChart,
  type ChartResult,
} from "../astronomy";
import {
  formatLongitude,
  normalizeLongitude,
  ZODIAC_SIGNS,
} from "../../shared/hybrid";
import {
  calculateChartHermeticLots,
} from "../astrologyKnowledge/canon/fixedStarsAndLots";
import { getNakshatraCanonByLongitude } from "../astrologyKnowledge/canon/nakshatras27";
import { getManzilCanonByLongitude } from "../astrologyKnowledge/canon/manazil28";
import {
  CHINESE_MANSIONS,
  CHINESE_MANSION_HISTORICAL_SOURCE,
} from "../astrologyKnowledge/canon/chineseMansions28";
import { getDecanCanonByLongitude } from "../astrologyKnowledge/canon/decans36";
import {
  resolveVedicTimingAndAshtakavarga,
} from "../astrologyKnowledge/vedic/timingAndAshtakavarga";
import { seferYetzirahEvidence } from "../astrologyKnowledge/canon/seferYetzirah";
import { runGenesisPatternPipeline } from "../genesisBackup/adapter";
import type {
  LayerRecord,
  MasterChartInput,
  UnifiedMasterChartSnapshot,
} from "./types";

function computeSnapshotId(input: MasterChartInput, version: string): string {
  const content = JSON.stringify({
    location: input.location,
    lat: input.latitude,
    lon: input.longitude,
    tz: input.timezone,
    d: input.date,
    t: input.time,
    td: input.transitDate ?? "",
    tt: input.transitTime ?? "",
    instantUtc: input.instantUtc,
    transitInstantUtc: input.transitInstantUtc,
    m: input.mode ?? "natal",
    worldview: input.worldview,
    birthTimeKnown: input.birthTimeKnown,
    chartRole: input.chartRole,
    elevation: input.elevation,
    transitLocation: input.transitLocation,
    transitLatitude: input.transitLatitude,
    transitLongitude: input.transitLongitude,
    transitTimezone: input.transitTimezone,
    v: version,
  });
  return "umc-" + crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** Uses the same foundation and removes transit inputs for a natal-only reading. */
export function getMasterNatalChart(input: MasterChartInput) {
  return buildUnifiedMasterChart({ ...input, mode: "natal" });
}

function getSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

export async function buildUnifiedMasterChart(
  input: MasterChartInput
): Promise<UnifiedMasterChartSnapshot> {
  const mode = input.mode ?? "natal";
  const engineVersion = "firmament-master-2026.1";
  const createdAtUtc = new Date().toISOString();

  // 1. Calculate authoritative base celestial state using established astronomy engine
  const chart: ChartResult = await calculateChart({
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    date: input.date,
    time: input.time,
    transitDate: input.transitDate,
    transitTime: input.transitTime,
    instantUtc: input.instantUtc,
    transitInstantUtc: input.transitInstantUtc,
    transitLocation: input.transitLocation,
    transitLatitude: input.transitLatitude,
    transitLongitude: input.transitLongitude,
    transitTimezone: input.transitTimezone,
    birthTimeKnown: input.birthTimeKnown,
    chartRole: input.chartRole,
    elevation: input.elevation,
    readingScope: mode,
    worldview: input.worldview ?? "agent-vs-god",
  });

  const snapshotId = computeSnapshotId({ ...input, instantUtc: chart.utc, transitInstantUtc: mode === "natal" ? undefined : chart.transitDate }, engineVersion);
  const chartData = createMasterChartDataBus(chart);
  const basePlanets = chartData.planets;
  const frameworkPlacements = [...basePlanets, chart.northNode, chart.southNode,
    ...[chart.ascendant, chart.descendant, chart.midheaven].filter(row => row !== null)];
  const baseHouses = chartData.houses.map((cusp, idx) => ({
    house: idx + 1,
    sign: getSign(cusp),
    cusp,
    degreeDisplay: formatLongitude(cusp),
  }));

  const ascendant = chartData.ascendant;

  // 2. Build God View (fixed Aries 1 - Pisces 12 cosmic frame) and Agent View (geocentric equal house from Ascendant)
  const godPlacements = basePlanets.map(p => {
    const norm = normalizeLongitude(p.longitude);
    const godHouse = Math.floor(norm / 30) + 1;
    return {
      body: p.name,
      longitude: p.longitude,
      display: p.display,
      godHouse,
      sign: getSign(p.longitude),
    };
  });

  const agentPlacements = (ascendant ? basePlanets : []).map(p => {
    return {
      body: p.name,
      longitude: p.longitude,
      display: p.display,
      agentHouse: p.agentHouse ?? p.house,
      sign: getSign(p.longitude),
    };
  });

  const frameRelationships = basePlanets
    .filter(p => p.frameRelationship)
    .map(p => ({
      body: p.name,
      longitude: p.longitude,
      display: p.display,
      godHouse: p.godHouse ?? (Math.floor(normalizeLongitude(p.longitude) / 30) + 1),
      agentHouse: p.agentHouse ?? p.house,
      relationship: `${p.frameRelationship!.type}: ${p.frameRelationship!.translation}`,
    }));

  // 3. Assemble the registered method layers.
  const layers: Record<string, LayerRecord> = {};

  // Layer 1: Western Planets & Signs
  layers["western-planets-and-signs"] = {
    id: "western-planets-and-signs",
    tradition: "hellenistic",
    technique: "planetary-longitudes-and-signs",
    name: "Western Classical Longitudes & Signs",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["swiss-ephemeris-base"],
    calculationVersion: engineVersion,
    evidenceIds: basePlanets.map(p => `planet-${p.name.toLowerCase()}`),
    sourceIds: ["ptolemy-tetrabiblos-1"],
    results: basePlanets.map(p => ({
      name: p.name,
      longitude: p.longitude,
      display: p.display,
      sign: getSign(p.longitude),
      retrograde: p.retrograde,
      speed: p.speed,
    })),
  };

  // Sumerian historical celestial associations, not an invented natal algorithm.
  const sumerianResults = basePlanets
    .filter(p => Object.prototype.hasOwnProperty.call(SUMERIAN_CELESTIAL_ASSOCIATIONS, p.name))
    .map(p => ({
      body: p.name,
      display: p.display,
      longitude: p.longitude,
      sign: getSign(p.longitude),
      house: p.agentHouse ?? p.house,
      association: SUMERIAN_CELESTIAL_ASSOCIATIONS[p.name as keyof typeof SUMERIAN_CELESTIAL_ASSOCIATIONS],
    }));
  layers["sumerian-celestial-foundations"] = {
    id: "sumerian-celestial-foundations",
    tradition: "sumerian",
    technique: "attested-sun-moon-venus-symbolic-associations",
    name: "Sumerian Celestial Foundations",
    status: sumerianResults.length === 3 ? "computed-with-result" : "failed",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: sumerianResults.map(p => `sumerian-${p.body.toLowerCase()}`),
    sourceIds: [SUMERIAN_CELESTIAL_SOURCE_ID],
    results: sumerianResults,
    notes: `Historical correspondences with an explicitly modern interpretive lens; not a recovered horoscope algorithm. ${ENLIL_HISTORICAL_NOTE}`,
    ...(sumerianResults.length !== 3 ? { errorCode: "SUMERIAN_MISSING_CALCULATED_BODY" } : {}),
  };

  // Layer 2: Western Houses & Angles
  layers["western-houses-and-angles"] = {
    id: "western-houses-and-angles",
    tradition: "hellenistic",
    technique: "equal-houses-and-cardinal-angles",
    name: "12 Equal Houses & Horizon Angles",
    status: ascendant ? "computed-with-result" : "not-applicable",
    frame: "agent",
    prerequisites: ["topocentric-ascendant"],
    calculationVersion: engineVersion,
    evidenceIds: [
      "angle-ascendant",
      "angle-descendant",
      ...chart.houses.map((_, i) => `house-${i + 1}`),
    ],
    sourceIds: ["hellenistic-equal-houses"],
    results: {
      ascendant,
      descendant: chart.descendant,
      houses: baseHouses,
    },
  };

  // Layer 3: Western Aspects & Orbs
  const majorAspects = chart.movingBodies.flatMap(p1 =>
    chart.movingBodies
      .filter(p2 => p1.name < p2.name)
      .map(p2 => {
        const diff = Math.abs(normalizeLongitude(p1.longitude) - normalizeLongitude(p2.longitude));
        const angle = diff > 180 ? 360 - diff : diff;
        const aspectDefs = [
          { name: "Conjunction", deg: 0, maxOrb: 8 },
          { name: "Sextile", deg: 60, maxOrb: 5 },
          { name: "Square", deg: 90, maxOrb: 7 },
          { name: "Trine", deg: 120, maxOrb: 7 },
          { name: "Opposition", deg: 180, maxOrb: 8 },
        ];
        for (const def of aspectDefs) {
          const orb = Math.abs(angle - def.deg);
          if (orb <= def.maxOrb) {
            return {
              body1: p1.name,
              body2: p2.name,
              aspect: def.name,
              angle: Math.round(angle * 100) / 100,
              orb: Math.round(orb * 100) / 100,
              nature: def.name === "Square" || def.name === "Opposition" ? "friction" : "harmony",
            };
          }
        }
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
  );

  layers["western-aspects-and-orbs"] = {
    id: "western-aspects-and-orbs",
    tradition: "hellenistic",
    technique: "ptolemaic-aspects",
    name: "Ptolemaic Aspects & Orbs",
    status: majorAspects.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: majorAspects.map(a => `aspect-${a.body1}-${a.aspect}-${a.body2}`.toLowerCase()),
    sourceIds: ["ptolemy-aspect-orbs"],
    results: majorAspects,
  };

  // Layer 4: Western Essential Dignities
  const rulershipMap: Record<string, string> = {
    Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
    Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
    Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
  };
  const exaltationMap: Record<string, string> = {
    Aries: "Sun", Taurus: "Moon", Cancer: "Jupiter", Virgo: "Mercury",
    Capricorn: "Mars", Pisces: "Venus",
  };
  const dignities = basePlanets.map(p => {
    const sign = getSign(p.longitude);
    const isDomicile = rulershipMap[sign] === p.name;
    const isExalted = exaltationMap[sign] === p.name;
    let status = "Peregrine";
    if (isDomicile) status = "Domicile (Ruler)";
    else if (isExalted) status = "Exaltation";
    return {
      body: p.name,
      sign,
      dignity: status,
      rulerOfSign: rulershipMap[sign],
    };
  });

  layers["western-essential-dignities"] = {
    id: "western-essential-dignities",
    tradition: "hellenistic",
    technique: "essential-dignities",
    name: "Essential Dignities & Sign Rulerships",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: dignities.map(d => `dignity-${d.body.toLowerCase().replaceAll(" ", "-")}`),
    sourceIds: ["dorotheus-carmen-astrologicum"],
    results: dignities,
  };

  // Layer 5: Fixed Stars & Royal Watchers
  const royalStarContacts = chart.frozenStars.map(fs => ({
    name: fs.name,
    fixedLongitude: fs.longitude,
    display: fs.display,
    contacts: basePlanets
      .map(p => {
        const diff = Math.abs(normalizeLongitude(p.longitude) - normalizeLongitude(fs.longitude));
        const orb = diff > 180 ? 360 - diff : diff;
        return {
          body: p.name,
          orb: Math.round(orb * 100) / 100,
          isConjunction: orb <= 3.5,
        };
      })
      .filter(c => c.isConjunction),
  }));

  layers["fixed-stars-royal-watchers"] = {
    id: "fixed-stars-royal-watchers",
    tradition: "babylonian",
    technique: "fixed-stars-and-royal-watchers",
    name: "Polaris & Royal Star Fixed Frames",
    status: "computed-with-result",
    frame: "god",
    prerequisites: ["firmament-fixed-frame"],
    calculationVersion: engineVersion,
    evidenceIds: royalStarContacts.map(s => `star-${s.name.toLowerCase()}`),
    sourceIds: ["ptolemy-fixed-stars", "babylonian-mul-apin"],
    results: royalStarContacts,
  };

  // Layer 6: Arabic & Hermetic Lots
  const sunRow = basePlanets.find(p => p.name === "Sun");
  const isDayChart = sunRow ? sunRow.house >= 7 && sunRow.house <= 12 : true;
  const lotsArray = calculateChartHermeticLots(chart, isDayChart);
  const calculatedLots = lotsArray.map(item => ({
    key: item.lot.id,
    name: item.lot.name,
    longitude: item.longitude,
    display: item.display,
    sign: item.sign,
    house: item.house,
    formula: isDayChart ? item.lot.dayFormula : item.lot.nightFormula,
  }));

  layers["arabic-hermetic-lots"] = {
    id: "arabic-hermetic-lots",
    tradition: "arabic-persian",
    technique: "hermetic-lots-arabic-parts",
    name: "Hermetic Lots (Fortune, Spirit, Eros, Necessity)",
    status: !ascendant ? "not-applicable" : calculatedLots.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "agent",
    prerequisites: ["western-houses-and-angles", "western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: calculatedLots.map(l => `lot-${l.key.toLowerCase()}`),
    sourceIds: ["paulus-alexandrinus-ch23", "al-biruni-astrology"],
    results: calculatedLots,
  };

  // Layer 7: Arabic Lunar Manazil (28 Mansions)
  const manazilResults = frameworkPlacements.map(p => {
    const canon = getManzilCanonByLongitude(p.longitude);
    return {
      body: p.name,
      longitude: p.longitude,
      manzilNumber: canon.index,
      transliteration: canon.name,
      meaning: canon.englishTranslation,
      traditionalQuality: canon.traditionalQuality,
    };
  });

  layers["arabic-lunar-manazil"] = {
    id: "arabic-lunar-manazil",
    tradition: "arabic-persian",
    technique: "28-lunar-manazil",
    name: "Arabic 28 Manazil al-Qamar",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: manazilResults.map(m => `manzil-${m.body.toLowerCase().replaceAll(" ", "-")}-${m.manzilNumber}`),
    sourceIds: ["al-sufi-book-of-fixed-stars"],
    results: manazilResults,
  };

  // Layer 8: Vedic Nakshatras & Padas (27 Lunar Mansions)
  const nakshatraResults = frameworkPlacements.map(p => {
    const canon = getNakshatraCanonByLongitude(p.longitude);
    return {
      body: p.name,
      longitude: p.longitude,
      nakshatraNumber: canon.nakshatra.index,
      name: canon.nakshatra.name,
      pada: canon.pada.pada,
      rulingDeity: canon.nakshatra.deity,
      planetaryLord: canon.nakshatra.vimshottariRuler,
      shakti: canon.nakshatra.shakti,
      purushartha: canon.nakshatra.motivationPuruSharthas,
    };
  });

  layers["vedic-nakshatras-and-padas"] = {
    id: "vedic-nakshatras-and-padas",
    tradition: "vedic",
    technique: "27-nakshatras-and-padas",
    name: "Vedic 27 Nakshatras & Padas",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: nakshatraResults.map(n => `nakshatra-${n.body.toLowerCase().replaceAll(" ", "-")}-${n.nakshatraNumber}`),
    sourceIds: ["taittiriya-samhita", "surya-siddhanta"],
    results: nakshatraResults,
  };

  // Layer 9: Complete deterministic D1/D2/D3/D9/D10 chart data.
  // Every divisional chart derives from the same natal Ascendant and planets.
  const vargaResults = ascendant ? buildDivisionalCharts({
    ascendantLongitude: ascendant.longitude,
    planets: [
      ...basePlanets.map(p => ({ name: p.name, longitude: p.longitude })),
      { name: chart.northNode.name, longitude: chart.northNode.longitude },
      { name: chart.southNode.name, longitude: chart.southNode.longitude },
    ],
    d1HouseCusps: chart.houses,
  }) : [];

  layers["vedic-vargas-divisional"] = {
    id: "vedic-vargas-divisional",
    tradition: "vedic",
    technique: "parashari-divisional-vargas",
    name: "Vedic Divisional Charts (D1, D2, D3, D9 Navamsha, D10)",
    status: ascendant ? "computed-with-result" : "not-applicable",
    notes: ascendant ? undefined : "Divisional house charts require a known Ascendant; no substitute anchor is used.",
    frame: "agent",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: vargaResults.map(v => `varga-${v.division.toLowerCase()}`),
    sourceIds: ["brihat-parashara-hora-shastra"],
    results: vargaResults,
  };

  // Layer 10: Vedic Timing & Ashtakavarga
  const timingApplicable = Boolean(ascendant && input.birthTimeKnown !== false);
  const timingResult = timingApplicable ? resolveVedicTimingAndAshtakavarga(chart) : [];
  const timingFailed = timingResult.some(item => item.category === "uncertainty");

  layers["vedic-dasha-and-ashtakavarga"] = {
    id: "vedic-dasha-and-ashtakavarga",
    tradition: "vedic",
    technique: "vimshottari-dasha-and-ashtakavarga",
    name: "Vimshottari Dasha Lords & Ashtakavarga Bindus",
    status: !timingApplicable ? "not-applicable" : timingFailed ? "failed" : timingResult.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "shared",
    prerequisites: ["vedic-nakshatras-and-padas"],
    calculationVersion: engineVersion,
    evidenceIds: timingResult.map(item => item.id),
    errorCode: timingFailed ? "VEDIC_TIMING_UNAVAILABLE_OR_INVALID" : undefined,
    sourceIds: ["brihat-parashara-dasha-system"],
    results: timingResult,
  };

  // The same numerical strength calculation feeds both independent methods.
  const strengthApplicable = Boolean(ascendant && input.birthTimeKnown !== false);
  let strength: ReturnType<typeof calculateVedicStrength> | undefined;
  let strengthError: string | undefined;
  if (strengthApplicable) {
    try { strength = calculateVedicStrength(chart); }
    catch (error) { strengthError = error instanceof Error ? error.message : String(error); }
  }
  for (const [id, name, results, evidenceIds] of [
    ["vedic-shadbala", "Shadbala · Sixfold Planetary Strength", strength?.planets, strength?.planets.map(p => `shadbala-${p.body.toLowerCase()}`)],
    ["vedic-bhava-bala", "Bhava Bala · Twelve House Strengths", strength?.houses, strength?.houses.map(h => `bhava-bala-house-${h.house}`)],
  ] as const) layers[id] = {
    id, name, tradition:"vedic", technique:id === "vedic-shadbala" ? "bphs-sixfold-shadbala" : "bphs-bhava-adhipati-dig-drishti",
    status: !strengthApplicable ? "not-applicable" : strengthError ? "failed" : "computed-with-result",
    frame:"agent", prerequisites:["western-planets-and-signs","western-houses-and-angles"],
    calculationVersion:STRENGTH_VERSION, results:results ?? [], evidenceIds:evidenceIds ?? [],
    sourceIds:["brihat-parashara-hora-shastra-26-27"],
    ...(strengthError ? {errorCode:"VEDIC_STRENGTH_FAILED"} : {}),
    notes: !strengthApplicable ? "A known local Ascendant and birth time are required for numerical strength." : strengthError ?? `BPHS formulas applied to The Absolute's supplied XYZ and Equal Houses. Selected variants: ${JSON.stringify(strength!.coordinateVariant)}. Sources: ${JSON.stringify(strength!.sources)}. Temporal inputs: ${JSON.stringify(strength!.temporal)}`,
  };

  // Lordship is relational wiring, not a second Vedic/ephemeris calculation.
  // Sign rulers follow the signs on the actual Equal House cusps; residence
  // stays exactly as assigned by the authoritative Agent chart.
  const lordshipApplicable = Boolean(ascendant && input.birthTimeKnown !== false);
  const lordshipResults = lordshipApplicable ? buildPlanetaryLordshipConnections({
    ascendantLongitude: ascendant!.longitude,
    houseCusps: chart.houses,
    placements: [
      ...basePlanets
        .filter(p => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(p.name))
        .map(p => ({ name: p.name, longitude: p.longitude, house: p.agentHouse ?? p.house })),
      { name: "Rahu", longitude: chart.northNode.longitude, house: chart.northNode.agentHouse ?? chart.northNode.house },
      { name: "Ketu", longitude: chart.southNode.longitude, house: chart.southNode.agentHouse ?? chart.southNode.house },
    ],
  }) : [];
  layers["vedic-planetary-lordship-connections"] = {
    id: "vedic-planetary-lordship-connections",
    tradition: "vedic",
    technique: "planetary-lordship-connections",
    name: "Planetary Lordship Connections",
    status: lordshipApplicable ? "computed-with-result" : "not-applicable",
    frame: "agent",
    prerequisites: ["western-planets-and-signs", "western-houses-and-angles"],
    calculationVersion: "lordship-wiring-v1",
    evidenceIds: lordshipResults.map(r => `lordship-${r.planet.toLowerCase()}`),
    sourceIds: ["brihat-parashara-hora-shastra"],
    results: lordshipResults,
    notes: lordshipApplicable
      ? "Nine planet records (including empty node rulerships), one master method; Equal House occupancy, sign-cusp rulership, no scoring or duplicate aspects."
      : "Requires valid birth time and local Equal House Ascendant.",
  };

  // Layer 11: Vedic Graha Drishti (Special Aspects)
  const drishtiAspects = basePlanets.flatMap(p => {
    const pSignIndex = Math.floor(normalizeLongitude(p.longitude) / 30);
    const aspects: Array<{ planet: string; targetSign: string; targetHouseOffset: number; type: string }> = [];
    if (p.name === "Mars") {
      aspects.push({ planet: "Mars", targetSign: ZODIAC_SIGNS[(pSignIndex + 3) % 12], targetHouseOffset: 4, type: "4th Drishti (Direct Confrontation)" });
      aspects.push({ planet: "Mars", targetSign: ZODIAC_SIGNS[(pSignIndex + 7) % 12], targetHouseOffset: 8, type: "8th Drishti (Transformation/Crisis)" });
    } else if (p.name === "Jupiter") {
      aspects.push({ planet: "Jupiter", targetSign: ZODIAC_SIGNS[(pSignIndex + 4) % 12], targetHouseOffset: 5, type: "5th Drishti (Grace/Dharma)" });
      aspects.push({ planet: "Jupiter", targetSign: ZODIAC_SIGNS[(pSignIndex + 8) % 12], targetHouseOffset: 9, type: "9th Drishti (Higher Wisdom)" });
    } else if (p.name === "Saturn") {
      aspects.push({ planet: "Saturn", targetSign: ZODIAC_SIGNS[(pSignIndex + 2) % 12], targetHouseOffset: 3, type: "3rd Drishti (Labor/Effort)" });
      aspects.push({ planet: "Saturn", targetSign: ZODIAC_SIGNS[(pSignIndex + 9) % 12], targetHouseOffset: 10, type: "10th Drishti (Authority/Responsibility)" });
    }
    return aspects;
  });

  layers["vedic-graha-drishti"] = {
    id: "vedic-graha-drishti",
    tradition: "vedic",
    technique: "graha-drishti-special-aspects",
    name: "Vedic Graha Drishti (Mars 4/8, Jupiter 5/9, Saturn 3/10)",
    status: drishtiAspects.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: drishtiAspects.map(d => `drishti-${d.planet.toLowerCase()}-${d.targetHouseOffset}`),
    sourceIds: ["parashari-drishti-canon"],
    results: drishtiAspects,
  };

  // Layer 12: Chinese Lunar Mansions (28 Xiu)
  layers["chinese-lunar-mansions-xiu"] = {
    id: "chinese-lunar-mansions-xiu",
    tradition: "chinese",
    technique: "28-xiu-four-symbols",
    name: "Chinese 28 Xiu & 4 Directional Animal Symbols",
    status: "reference-only",
    frame: "shared",
    prerequisites: [],
    calculationVersion: engineVersion,
    evidenceIds: CHINESE_MANSIONS.map(m => `xiu-${m.index}-${m.pinyin.toLowerCase()}`),
    sourceIds: [CHINESE_MANSION_HISTORICAL_SOURCE.title],
    notes: "Historical determinative equatorial star catalog preserved as reference. Individual personal chart placements are not asserted without pre-calculated unequal ancient sector boundaries.",
    results: {
      source: CHINESE_MANSION_HISTORICAL_SOURCE,
      mansionsCount: CHINESE_MANSIONS.length,
      sampleMansions: CHINESE_MANSIONS.slice(0, 7),
    },
  };

  // Layer 13: Elemental Decans (36 Faces)
  const decanResults = frameworkPlacements.map(p => {
    const canon = getDecanCanonByLongitude(p.longitude);
    return {
      body: p.name,
      longitude: p.longitude,
      decanIndex: canon.index,
      sign: canon.sign,
      elementalFamilySign: canon.elementalFamilySign,
      elementalFamilyRuler: canon.elementalFamilyRuler,
      traditionalTitle: canon.traditionalTitle,
      behavioralNuance: canon.behavioralNuance,
    };
  });

  layers["elemental-decans"] = {
    id: "elemental-decans",
    tradition: "hellenistic",
    technique: "36-elemental-family-decans",
    name: "36 Elemental Decans & Faces (10° Divisions)",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: decanResults.map(d => `decan-${d.body.toLowerCase().replaceAll(" ", "-")}-${d.decanIndex}`),
    sourceIds: ["picatrix-36-decans", "ibn-ezra-faces"],
    results: decanResults,
  };

  // Layer 14: Kabbalah & Sefer Yetzirah
  const syEvidence = seferYetzirahEvidence(chart, mode === "transit" ? "transit" : "natal");
  layers["kabbalah-sefer-yetzirah"] = {
    id: "kabbalah-sefer-yetzirah",
    tradition: "kabbalah",
    technique: "sefer-yetzirah-32-paths-and-letters",
    name: "Sefer Yetzirah 32 Paths, 7 Doubles & Contraries",
    status: syEvidence.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: syEvidence.map(e => e.id),
    sourceIds: ["sefer-yetzirah-westcott-recension"],
    results: syEvidence,
  };

  // Layer 15: Genesis Behavioral Patterns & Yogas
  let genesisResult: any = null;
  let genesisError: string | null = null;
  try {
    genesisResult = runGenesisPatternPipeline({ ...chart, readingScope: "natal", transits: [] });
  } catch (err) {
    genesisError = err instanceof Error ? err.message : String(err);
  }

  layers["genesis-behavioral-patterns"] = {
    id: "genesis-behavioral-patterns",
    tradition: "genesis",
    technique: "genesis-pattern-engine-and-yogas",
    name: "Genesis Behavioral Patterns & Vedic Yogas",
    status: genesisError ? "failed" : genesisResult?.analysis ? "computed-with-result" : "computed-no-result",
    frame: chart.agentViewAvailable ? "agent" : "god",
    prerequisites: ["western-aspects-and-orbs", "western-houses-and-angles"],
    calculationVersion: engineVersion,
    evidenceIds: ["genesis-patterns-core", "genesis-yogas"],
    sourceIds: ["genesis-symbolic-engine"],
    results: genesisResult?.analysis ? { ...genesisResult.analysis,
      yogas: chart.ascendant ? detectAllYogas(basePlanets.map(p=>({name:p.name,sign:getSign(p.longitude),house:p.agentHouse??p.house,degree:p.longitude%30}))) : [],
      yogaScope: chart.ascendant ? "Configured local Yoga conditions; strength and cancellation need separate testimony" : "No local Yoga judgment without an Ascendant",
    } : null,
    ...(genesisError ? { errorCode: "GENESIS_PIPELINE_FAILED", notes: genesisError } : {}),
  };

  // Layer 16: Transit Activation Layer (when mode is transit or combined)
  if (mode === "transit" || mode === "combined") {
    const transitAspects = (chart.transits ?? []).flatMap(tb =>
      chart.movingBodies.map(nb => {
        const diff = Math.abs(normalizeLongitude(tb.longitude) - normalizeLongitude(nb.longitude));
        const angle = diff > 180 ? 360 - diff : diff;
        const aspectDefs = [
          { name: "Conjunction", deg: 0, orbMax: 5 },
          { name: "Sextile", deg: 60, orbMax: 3.5 },
          { name: "Square", deg: 90, orbMax: 4.5 },
          { name: "Trine", deg: 120, orbMax: 4.5 },
          { name: "Opposition", deg: 180, orbMax: 5 },
        ];
        for (const def of aspectDefs) {
          const orb = Math.abs(angle - def.deg);
          if (orb <= def.orbMax) {
            return {
              transitBody: tb.name,
              natalBody: nb.name,
              aspect: def.name,
              orb: Math.round(orb * 100) / 100,
              nature: (def.name === "Square" || def.name === "Opposition" ? "friction" : "harmonic") as "friction" | "harmonic",
            };
          }
        }
        return null;
      }).filter((a): a is NonNullable<typeof a> => a !== null)
    );

    layers["transit-activation-layer"] = {
      id: "transit-activation-layer",
      tradition: "firmament",
      technique: "transit-to-natal-activation",
      name: "Active Transits & Dynamic Orbs",
      status: transitAspects.length > 0 ? "computed-with-result" : "computed-no-result",
      frame: "transit",
      prerequisites: ["western-planets-and-signs"],
      calculationVersion: engineVersion,
      evidenceIds: transitAspects.map(t => `transit-${t.transitBody}-${t.aspect}-${t.natalBody}`.toLowerCase()),
      sourceIds: ["firmament-transit-weather"],
      results: transitAspects,
    };
  } else {
    layers["transit-activation-layer"] = {
      id: "transit-activation-layer",
      tradition: "firmament",
      technique: "transit-to-natal-activation",
      name: "Active Transits & Dynamic Orbs",
      status: "not-applicable",
      frame: "transit",
      prerequisites: [],
      calculationVersion: engineVersion,
      evidenceIds: [],
      sourceIds: [],
      notes: "Mode is natal-only; transit layer is dormant until transit moment is requested.",
    };
  }

  // 4. Assemble Method Execution Ledger and Validation Summary
  const methodExecutionLedger = registeredMethodLedger(layers);
  const failedMethods = methodExecutionLedger.filter(layer => layer.status === "failed");
  const referenceMethods = methodExecutionLedger.filter(layer => layer.status === "reference-only");
  const computedWithResultCount = methodExecutionLedger.filter(
    l => l.status === "computed-with-result"
  ).length;

  const snapshot: UnifiedMasterChartSnapshot = {
    snapshotId,
    schemaVersion: "1.0.0",
    createdAtUtc,
    inputs: {
      profileIds: [input.location, input.date, input.time].filter(Boolean),
      eventInstantUtc: chart.utc,
      timezone: input.timezone,
      locationContext: {
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      mode,
      chartRole: input.chartRole ?? "natal",
    },
    frameConfig: {
      zodiacMode: "fixed-cartesian-xyz",
      firmamentAnchorVersion: "sunrise-xyz-15deg-hour-v1",
      obliquityMode: "zero-tilt-equatorial-aligned",
      precessionMode: "none-fixed-firmament",
      houseSystem: "equal-house-ascendant",
      engineVersion,
    },
    baseCelestialState: {
      julianDay: chart.julianDay,
      utc: chart.utc,
      ascendant,
      midheaven: chart.midheaven,
      descendant: chart.descendant,
      northNode: chart.northNode,
      southNode: chart.southNode,
      planets: [...basePlanets],
      houses: baseHouses,
    },
    godView: {
      description: "Fixed Aries 1 to Pisces 12 universal frame with Polaris as immovable cosmic center",
      cosmicFrame: "fixed-aries-1-to-pisces-12",
      polarisCenter: true,
      placements: godPlacements,
    },
    agentView: {
      description: "Geocentric Equal House frame anchored directly to the rising Ascendant degree",
      ascendantAnchor: ascendant?.display ?? "Unavailable: God View has no local Ascendant",
      houseSystem: "equal-house-from-ascendant",
      placements: agentPlacements,
      frameRelationships,
    },
    natal: chart,
    transit: mode === "transit" || mode === "combined"
      ? {
          transitInstantUtc: chart.transitDate ?? chart.utc,
          planets: chart.transits ?? [],
          aspectsToNatal: (layers["transit-activation-layer"].results as any) ?? [],
        }
      : undefined,
    layers,
    methodExecutionLedger,
    validation: {
      complete: failedMethods.length === 0 && referenceMethods.length === 0,
      errors: failedMethods.map(layer => layer.errorCode ?? layer.name),
      warnings: referenceMethods.map(layer => layer.notes ?? layer.name),
      totalMethods: methodExecutionLedger.length,
      computedWithResultCount,
    },
  };

  if (snapshot.transit) {
    const timezone = input.transitTimezone || input.timezone || "UTC";
    const local = localDateTime(new Date(chart.transitDate), timezone);
    const framework = await buildUnifiedMasterChart({
      location: input.transitLocation ?? input.location,
      latitude: input.transitLatitude ?? input.latitude,
      longitude: input.transitLongitude ?? input.longitude,
      timezone,
      ...local,
      instantUtc: chart.transitDate,
      worldview: input.worldview,
      chartRole: "event",
      birthTimeKnown: true,
      mode: "natal",
    });
    const eventBodies = [
      ...framework.baseCelestialState.planets,
      framework.baseCelestialState.northNode,
      framework.baseCelestialState.southNode,
    ];
    for (const transit of chart.transits) {
      const body = eventBodies.find(row => row.name === transit.name);
      if (!body || body.longitude !== transit.longitude) {
        throw new Error(`TRANSIT_FRAMEWORK_MISMATCH: ${transit.name}`);
      }
    }
    snapshot.transit.framework = framework;
  }
  return Object.freeze(snapshot);
}
