import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type { ChartResult, ChartRow } from "../../astronomy";
import type { EvidenceItem, SourceTrace } from "../types";
import { getDecanCanonByLongitude } from "./decans36";
import {
  detectHoraryAndTraditionalMechanisms,
  evaluatePlacementDignityAndCondition,
} from "./dignitiesAndHorary";
import {
  calculateChartHermeticLots,
  findFixedStarContactsForLongitude,
} from "./fixedStarsAndLots";
import { HOUSE_CANON_RECORDS, synthesizePlanetInHouse } from "./housesAndFrames";
import { getManzilCanonByLongitude } from "./manazil28";
import { getNakshatraCanonByLongitude } from "./nakshatras27";
import {
  PLANET_CANON_RECORDS,
  SIGN_CANON_RECORDS,
  synthesizePlanetInSign,
} from "./planetsAndSigns";
import type { ChartCanonDossier, RetrievedPlacementDossier } from "./types";

export function retrievePlacementDossier(
  row: ChartRow,
  chart: ChartResult,
  isDayChart: boolean
): RetrievedPlacementDossier {
  const lon = normalizeLongitude(row.longitude);
  const sign = ZODIAC_SIGNS[Math.floor(lon / 30)];
  const planetDoctrine = PLANET_CANON_RECORDS[row.name];
  const signDoctrine = SIGN_CANON_RECORDS[sign];
  const houseDoctrine = HOUSE_CANON_RECORDS[row.house];

  const planetInSignSynthesis = synthesizePlanetInSign(row.name, sign);
  const { houseSynthesis: planetInHouseSynthesis, godToAgentNote } =
    synthesizePlanetInHouse(row.name, row.house, row.godHouse, row.agentHouse);

  const dignityAndCondition = evaluatePlacementDignityAndCondition(
    row,
    chart,
    isDayChart
  );
  const decanRecord = getDecanCanonByLongitude(lon);
  const manzilRecord = getManzilCanonByLongitude(lon);
  const { nakshatra: nakshatraRecord, pada: activePada } =
    getNakshatraCanonByLongitude(lon);
  const fixedStarContacts = findFixedStarContactsForLongitude(lon);

  return {
    body: row.name,
    display: row.display,
    longitude: lon,
    sign,
    displayedHouse: row.house,
    godHouse: row.godHouse,
    agentHouse: row.agentHouse,
    planetDoctrine,
    signDoctrine,
    planetInSignSynthesis,
    houseDoctrine,
    planetInHouseSynthesis,
    godToAgentNote,
    dignityAndCondition,
    decanRecord,
    manzilRecord,
    nakshatraRecord,
    activePada,
    fixedStarContacts,
  };
}

export function retrieveChartCanonDossier(
  chart: ChartResult
): ChartCanonDossier {
  const sunRow = chart.movingBodies.find(b => b.name === "Sun");
  const isDayChart = sunRow ? sunRow.house >= 7 && sunRow.house <= 12 : true;
  const sect: ChartCanonDossier["sect"] = !chart.agentViewAvailable
    ? "god-view-unsected"
    : isDayChart
      ? "day"
      : "night";

  const sectExplanation =
    sect === "god-view-unsected"
      ? "God View only (birth time or local horizon unavailable): classical Day/Night sect is noted conditionally; planetary sign, decan, manzil, nakshatra, and God House placements remain exact."
      : isDayChart
        ? `Diurnal (Day) Chart [FACT: Sun in House ${sunRow?.house} above the horizon]: Sun, Jupiter, and Saturn are the diurnal sect team (Jupiter is the primary benefic; Saturn is the more constructive malefic; Mars is contrary to sect).`
        : `Nocturnal (Night) Chart [FACT: Sun in House ${sunRow?.house} below the horizon]: Moon, Venus, and Mars are the nocturnal sect team (Venus is the primary benefic; Mars is the more constructive malefic; Saturn is contrary to sect).`;

  const rows: ChartRow[] = [
    ...chart.movingBodies,
    chart.ascendant,
    chart.midheaven,
    chart.northNode,
    chart.southNode,
  ].filter(
    (r): r is ChartRow => Boolean(r) && Number.isFinite(r!.longitude)
  );

  const placements = rows.map(row =>
    retrievePlacementDossier(row, chart, isDayChart)
  );
  const detectedMechanisms = detectHoraryAndTraditionalMechanisms(
    chart,
    isDayChart
  );
  const arabicLotsSummary = calculateChartHermeticLots(chart, isDayChart);

  const lines: string[] = [
    "=== LOCAL FIRMAMENT CANON & TRADITIONAL DOCTRINE DOSSIER (DETERMINISTICALLY RETRIEVED) ===",
    `[SECT DOCTRINE] ${sectExplanation}`,
    "",
    "--- RETRIEVED PLACEMENT DOCTRINE (PLANET + SIGN + HOUSE + DIGNITIES + DECAN + MANZIL + NAKSHATRA) ---",
  ];

  for (const p of placements) {
    lines.push(
      `• ${p.body} at ${p.display} (House ${p.displayedHouse}${p.godHouse != null && p.agentHouse != null ? ` | God House ${p.godHouse} → Agent House ${p.agentHouse}` : ""})`
    );
    lines.push(`  - [Sign & Dignity] ${p.planetInSignSynthesis}`);
    lines.push(`  - [Condition & Bounds] ${p.dignityAndCondition.conditionSummary} | ${p.dignityAndCondition.sectAlignment}`);
    lines.push(`  - [House Doctrine] ${p.planetInHouseSynthesis}`);
    if (p.godToAgentNote) {
      lines.push(`  - [God→Agent Frame Translation] ${p.godToAgentNote}`);
    }
    if (p.decanRecord) {
      lines.push(
        `  - [Decan ${p.decanRecord.index}/36: ${p.decanRecord.label} — "${p.decanRecord.traditionalTitle}"] Chaldean Face: ${p.decanRecord.chaldeanFaceRuler} | Triplicity Sub-ruler: ${p.decanRecord.triplicitySubRuler}. ${p.decanRecord.behavioralNuance}`
      );
    }
    if (p.manzilRecord) {
      lines.push(
        `  - [Arabic Manzil ${p.manzilRecord.index}/28: ${p.manzilRecord.name} ("${p.manzilRecord.englishTranslation}" · ${p.manzilRecord.traditionalQuality})] ${p.manzilRecord.natalAndPsychologicalMeaning}`
      );
    }
    if (p.nakshatraRecord && p.activePada) {
      lines.push(
        `  - [Vedic Nakshatra ${p.nakshatraRecord.index}/27: ${p.nakshatraRecord.name} Pada ${p.activePada.pada} (Navamsha ${p.activePada.navamshaSign} / ${p.activePada.navamshaRuler})] Deity: ${p.nakshatraRecord.deity} | Ruler: ${p.nakshatraRecord.vimshottariRuler} | Shakti: ${p.nakshatraRecord.shakti}. ${p.nakshatraRecord.psychologicalPattern}`
      );
    }
    if (p.fixedStarContacts.length > 0) {
      for (const fc of p.fixedStarContacts) {
        lines.push(
          `  - [Fixed Star Contact: ${fc.star.name}${fc.star.isRoyalStar ? ` (Royal Star · Watcher of the ${fc.star.watcherDirection})` : ""} at ${fc.orbDeg}° orb] Nature: ${fc.star.ptolemaicPlanetaryNature}. Gift: ${fc.star.giftWhenIntegrated} Test/Nemesis: ${fc.star.nemesisOrTest}`
        );
      }
    }
  }

  if (detectedMechanisms.length > 0) {
    lines.push(
      "",
      "--- DETECTED TRADITIONAL & HORARY MECHANISMS (RECEPTIONS, TRANSLATION/COLLECTION OF LIGHT, APPLICATION/IMPEDIMENTS) ---"
    );
    for (const m of detectedMechanisms) {
      lines.push(
        `• [${m.mechanismId.toUpperCase()} · ${m.epistemicCategory}] ${m.title}: ${m.statement} (Source: ${m.sourceTitle})`
      );
    }
  }

  if (arabicLotsSummary.length > 0) {
    lines.push("", "--- HERMETIC & ARABIC LOTS (CALCULATED BY SECT) ---");
    for (const l of arabicLotsSummary) {
      lines.push(
        `• ${l.lot.name} at ${l.display} (House ${l.house}): ${l.houseInterpretation} [Formula: ${isDayChart ? l.lot.dayFormula : l.lot.nightFormula}]`
      );
    }
  }

  return {
    sect,
    sectExplanation,
    placements,
    detectedMechanisms,
    arabicLotsSummary,
    formattedSummaryForInterpreter: lines.join("\n"),
  };
}

export function canonDossierToEvidenceItems(
  dossier: ChartCanonDossier
): EvidenceItem[] {
  const now = new Date().toISOString();
  const makeTrace = (
    tradition: EvidenceItem["tradition"],
    technique: string,
    sourceTitle: string,
    ruleId: string
  ): SourceTrace => ({
    sourceId: "firmament-canon-knowledge",
    tradition,
    technique,
    sourceTitle,
    retrievedAt: now,
    ruleId,
    confidence: "high",
  });

  const items: EvidenceItem[] = [];

  for (const p of dossier.placements) {
    items.push({
      id: `canon-placement-${p.body.toLowerCase().replace(/\s+/g, "-")}`,
      tradition: "firmament",
      category: "deterministic-rule",
      technique: "canon-placement-dossier",
      subject: p.body,
      statement: `[FIRMAMENT CANON + TRADITION] ${p.planetInSignSynthesis} ${p.planetInHouseSynthesis} (${p.dignityAndCondition.conditionSummary}). Decan: ${p.decanRecord?.label} ("${p.decanRecord?.traditionalTitle}"). Manzil: ${p.manzilRecord?.name} (${p.manzilRecord?.englishTranslation}). Nakshatra: ${p.nakshatraRecord?.name} Pada ${p.activePada?.pada} (${p.nakshatraRecord?.deity}).`,
      concepts: [
        p.body.toLowerCase(),
        p.sign.toLowerCase(),
        `house-${p.displayedHouse}`,
        "canon-dossier",
      ],
      polarity:
        p.dignityAndCondition.essentialDignities.length > 0
          ? "supportive"
          : p.dignityAndCondition.essentialDebilities.some(d =>
                d.includes("Detriment") || d.includes("Fall")
              )
            ? "pressured"
            : "mixed",
      strength: 0.9,
      ruleId: "firmament-canon-dossier",
      sourceId: "firmament-canon-knowledge",
      sourceTrace: makeTrace(
        "firmament",
        "canon-placement-dossier",
        "Firmament Structured Traditional Knowledge Canon",
        "firmament-canon-dossier"
      ),
    });
  }

  for (const m of dossier.detectedMechanisms) {
    items.push({
      id: `canon-mechanism-${m.mechanismId}-${m.involvedBodies.join("-").toLowerCase()}`,
      tradition: "arabic",
      category: "deterministic-rule",
      technique: m.mechanismId,
      subject: m.involvedBodies.join("-"),
      statement: `[${m.epistemicCategory}] ${m.title}: ${m.statement}`,
      concepts: [
        m.mechanismId,
        ...m.involvedBodies.map(b => b.toLowerCase()),
        "traditional-mechanism",
      ],
      polarity: [
        "mutual-reception",
        "unilateral-reception",
        "translation-of-light",
        "collection-of-light",
        "cazimi",
      ].includes(m.mechanismId)
        ? "supportive"
        : ["prohibition", "refranation", "frustration", "combustion", "besiegement"].includes(
              m.mechanismId
            )
          ? "pressured"
          : "mixed",
      strength: 0.85,
      ruleId: "firmament-traditional-mechanisms",
      sourceId: "firmament-canon-knowledge",
      sourceTrace: makeTrace(
        "arabic",
        m.mechanismId,
        m.sourceTitle,
        "firmament-traditional-mechanisms"
      ),
    });
  }

  return items;
}
