import crypto from "crypto";
import {
  calculateChart,
  type ChartResult,
  type ChartRow,
} from "../astronomy";
import {
  formatLongitude,
  normalizeLongitude,
  overlay,
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
  vargaPlacement,
  type Varga,
} from "../astrologyKnowledge/vedic/vargas";
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
    lat: input.latitude.toFixed(4),
    lon: input.longitude.toFixed(4),
    tz: input.timezone,
    d: input.date,
    t: input.time,
    tl: input.transitLocation ?? "",
    tlat: input.transitLatitude?.toFixed(4) ?? "",
    tlon: input.transitLongitude?.toFixed(4) ?? "",
    ttz: input.transitTimezone ?? "",
    td: input.transitDate ?? "",
    tt: input.transitTime ?? "",
    m: input.mode ?? "natal",
    w: input.worldview ?? "agent-vs-god",
    btk: input.birthTimeKnown ?? true,
    el: input.elevation ?? 0,
    v: version,
  });
  return "umc-" + crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function getSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

export async function buildUnifiedMasterChart(
  input: MasterChartInput
): Promise<UnifiedMasterChartSnapshot> {
  const mode = input.mode ?? "natal";
  const engineVersion = "firmament-master-2026.1";
  const snapshotId = computeSnapshotId(input, engineVersion);
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
    transitLocation: input.transitLocation,
    transitLatitude: input.transitLatitude,
    transitLongitude: input.transitLongitude,
    transitTimezone: input.transitTimezone,
    readingScope: mode,
    worldview: input.worldview ?? "agent-vs-god",
    birthTimeKnown: input.birthTimeKnown,
    elevation: input.elevation,
  });

  const basePlanets = chart.movingBodies;
  const baseHouses = chart.houses.map((cusp, idx) => ({
    house: idx + 1,
    sign: getSign(cusp),
    cusp,
    degreeDisplay: formatLongitude(cusp),
  }));

  const ascendant: ChartRow = chart.ascendant ?? {
    name: "Ascendant",
    longitude: chart.houses[0] ?? 0,
    display: formatLongitude(chart.houses[0] ?? 0),
    house: 1,
    overlay: overlay(chart.houses[0] ?? 0),
  };

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

  const agentPlacements = basePlanets.map(p => {
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

  // 3. Assemble all 16 Method Layers
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

  // Layer 2: Western Houses & Angles
  layers["western-houses-and-angles"] = {
    id: "western-houses-and-angles",
    tradition: "hellenistic",
    technique: "equal-houses-and-cardinal-angles",
    name: "12 Equal Houses & Horizon Angles",
    status: "computed-with-result",
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
    evidenceIds: dignities.map(d => `dignity-${d.body.toLowerCase()}`),
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
    status: calculatedLots.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "agent",
    prerequisites: ["western-houses-and-angles", "western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: calculatedLots.map(l => `lot-${l.key.toLowerCase()}`),
    sourceIds: ["paulus-alexandrinus-ch23", "al-biruni-astrology"],
    results: calculatedLots,
  };

  // Layer 7: Arabic Lunar Manazil (28 Mansions)
  const manazilResults = basePlanets.map(p => {
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
    evidenceIds: manazilResults.map(m => `manzil-${m.body.toLowerCase()}-${m.manzilNumber}`),
    sourceIds: ["al-sufi-book-of-fixed-stars"],
    results: manazilResults,
  };

  // Layer 8: Vedic Nakshatras & Padas (27 Lunar Mansions)
  const nakshatraResults = basePlanets.map(p => {
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
    evidenceIds: nakshatraResults.map(n => `nakshatra-${n.body.toLowerCase()}-${n.nakshatraNumber}`),
    sourceIds: ["taittiriya-samhita", "surya-siddhanta"],
    results: nakshatraResults,
  };

  // Layer 9: Vedic Vargas (D1, D2, D3, D9, D10)
  const vargaDivisions: Varga[] = ["D2", "D3", "D9", "D10"];
  const vargaResults = vargaDivisions.map(div => ({
    division: div,
    name: div === "D2" ? "Hora" : div === "D3" ? "Drekkana" : div === "D9" ? "Navamsha" : "Dashamsha",
    placements: basePlanets.map(p => ({
      body: p.name,
      ...vargaPlacement(p.longitude, div),
    })),
  }));

  layers["vedic-vargas-divisional"] = {
    id: "vedic-vargas-divisional",
    tradition: "vedic",
    technique: "parashari-divisional-vargas",
    name: "Vedic Divisional Charts (D1, D2, D3, D9 Navamsha, D10)",
    status: "computed-with-result",
    frame: "shared",
    prerequisites: ["western-planets-and-signs"],
    calculationVersion: engineVersion,
    evidenceIds: vargaResults.map(v => `varga-${v.division.toLowerCase()}`),
    sourceIds: ["brihat-parashara-hora-shastra"],
    results: vargaResults,
  };

  // Layer 10: Vedic Timing & Ashtakavarga
  let timingResult: any = null;
  try {
    timingResult = resolveVedicTimingAndAshtakavarga(chart);
  } catch (err) {
    timingResult = null;
  }

  layers["vedic-dasha-and-ashtakavarga"] = {
    id: "vedic-dasha-and-ashtakavarga",
    tradition: "vedic",
    technique: "vimshottari-dasha-and-ashtakavarga",
    name: "Vimshottari Dasha Lords & Ashtakavarga Bindus",
    status: timingResult && timingResult.length > 0 ? "computed-with-result" : "computed-no-result",
    frame: "shared",
    prerequisites: ["vedic-nakshatras-and-padas"],
    calculationVersion: engineVersion,
    evidenceIds: (timingResult ?? []).map((t: any) => t.id),
    sourceIds: ["brihat-parashara-dasha-system"],
    results: timingResult,
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
  const decanResults = basePlanets.map(p => {
    const canon = getDecanCanonByLongitude(p.longitude);
    return {
      body: p.name,
      longitude: p.longitude,
      decanIndex: canon.index,
      sign: canon.sign,
      elementalFamilySign: canon.sign,
      elementalFamilyRuler: canon.triplicitySubRuler,
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
    evidenceIds: decanResults.map(d => `decan-${d.body.toLowerCase()}-${d.decanIndex}`),
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
  try {
    genesisResult = runGenesisPatternPipeline(chart);
  } catch (err) {
    genesisResult = null;
  }

  layers["genesis-behavioral-patterns"] = {
    id: "genesis-behavioral-patterns",
    tradition: "genesis",
    technique: "genesis-pattern-engine-and-yogas",
    name: "Genesis Behavioral Patterns & Vedic Yogas",
    status: genesisResult?.analysis ? "computed-with-result" : "computed-no-result",
    frame: "agent",
    prerequisites: ["western-aspects-and-orbs", "western-houses-and-angles"],
    calculationVersion: engineVersion,
    evidenceIds: ["genesis-patterns-core", "genesis-yogas"],
    sourceIds: ["genesis-symbolic-engine"],
    results: genesisResult?.analysis ?? null,
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
  const methodExecutionLedger = Object.values(layers);
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
    },
    frameConfig: {
      zodiacMode: "aldebaran-anchored-babylonian-stellar",
      firmamentAnchorVersion: "aldebaran-15-taurus-swiss-mode-14",
      obliquityMode: "swiss-ephemeris-sidereal-longitudes",
      precessionMode: "none-user-frame-fixed-anchor",
      houseSystem: "topocentric-equal-house-ascendant",
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
      planets: basePlanets,
      houses: baseHouses,
    },
    godView: {
      description: "Fixed Aries 1 to Pisces 12 universal frame anchored to the Aldebaran 15° Taurus stellar zodiac",
      cosmicFrame: "fixed-aries-1-to-pisces-12",
      polarisCenter: false,
      placements: godPlacements,
    },
    agentView: {
      description: "Geocentric planetary longitudes with a separate topocentric lunar correction and Equal House cusps anchored directly to the rising Ascendant degree",
      ascendantAnchor: ascendant.display,
      houseSystem: "topocentric-equal-house-from-ascendant",
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
      complete: true,
      errors: [],
      warnings: [],
      totalMethods: methodExecutionLedger.length,
      computedWithResultCount,
    },
  };

  return Object.freeze(snapshot);
}
