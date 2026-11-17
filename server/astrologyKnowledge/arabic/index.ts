import type { ChartResult, ChartRow } from "../../astronomy";
import { overlay, MANAZIL, normalizeLongitude } from "../../../shared/hybrid";
import { calculateArabicLots } from "../../utils/arabicLots";
import { majorLongitudeContact } from "../canon/fixedStarsAndLots";
import { sourceById } from "../registry";
import type { EvidenceItem, KnowledgePlan, SourceTrace } from "../types";

const trace = (
  technique: string,
  ruleId: string,
  sourceId = "local-arabic-rules"
): SourceTrace => ({
  sourceId,
  tradition: "arabic",
  technique,
  sourceTitle: sourceById(sourceId)?.name ?? sourceId,
  sourceUrl: sourceById(sourceId)?.url,
  retrievedAt: new Date().toISOString(),
  ruleId,
  confidence: sourceId === "canopy-arabian" ? "reference-only" : "high",
});
const factTrace: SourceTrace = {
  sourceId: "firmament-ephemeris",
  tradition: "firmament",
  technique: "calculation",
  sourceTitle: "Firmament local ephemeris",
  retrievedAt: new Date().toISOString(),
  confidence: "high",
};
function rows(chart: ChartResult) {
  return [
    ...chart.movingBodies,
    chart.ascendant,
    chart.northNode,
    chart.southNode,
  ].filter((row): row is ChartRow => Boolean(row));
}
function manzil(longitude: number) {
  const index = Math.floor(normalizeLongitude(longitude) / (360 / 28));
  return {
    name: MANAZIL[index],
    start: index * (360 / 28),
    end: (index + 1) * (360 / 28),
  };
}
export function resolveArabicEvidence(
  chart: ChartResult,
  plan: KnowledgePlan
): EvidenceItem[] {
  const all = rows(chart).filter(row => Number.isFinite(row.longitude));
  const evidence: EvidenceItem[] = [];
  for (const row of all) {
    const ov = overlay(row.longitude);
    const m = manzil(row.longitude);
    if (
      row.name === "Moon" ||
      row.name === "Ascendant" ||
      plan.subjects.some(subject =>
        row.name.toLowerCase().includes(subject.toLowerCase())
      )
    )
      evidence.push({
        id: `arabic-manzil-${row.name}`,
        tradition: "arabic",
        category: "deterministic-rule",
        technique: "manzil",
        subject: row.name,
        statement: `${row.name} is in ${m.name}, bounded by ${m.start.toFixed(2)}°–${m.end.toFixed(2)}°; the same longitude overlays ${ov.decan}.`,
        concepts: ["manzil", m.name.toLowerCase(), "lunar-layer"],
        polarity: "neutral",
        strength: 0.75,
        ruleId: "arabic-manazil-28",
        sourceId: "firmament-architecture",
        sourceTrace: trace(
          "manzil",
          "arabic-manazil-28",
          "firmament-architecture"
        ),
      });
  }
  const sun = all.find(row => row.name === "Sun");
  const moon = all.find(row => row.name === "Moon");
  const ascendant = all.find(row => row.name === "Ascendant");
  if (chart.agentViewAvailable && ascendant && sun && moon) {
    const sect = sun.house >= 7 ? "day" : "night";
    evidence.push({
      id: "arabic-sect",
      tradition: "arabic",
      category: "deterministic-rule",
      technique: "sect",
      subject: "chart",
      statement: `The chart is treated as a ${sect} chart because the Sun is in house ${sun.house}; sect is preserved as an Arabic doctrine, not blended into Western dignity.`,
      concepts: ["sect", sect],
      polarity: "neutral",
      strength: 0.8,
      ruleId: "arabic-day-sect",
      sourceId: "local-arabic-rules",
      sourceTrace: trace("sect", "arabic-day-sect"),
    });
    const lots = calculateArabicLots({
      ascendant: ascendant.longitude,
      venus: all.find(row => row.name === "Venus")?.longitude,
      mercury: all.find(row => row.name === "Mercury")?.longitude,
      sun: sun.longitude,
      moon: moon.longitude,
      sect,
    });
    for (const [name, longitude] of Object.entries(lots)) {
      const m = manzil(longitude);
      const formulaBodies = [
        "Ascendant", "Sun", "Moon",
        ...(name === "eros" ? ["Venus"] : name === "necessity" ? ["Mercury"] : []),
      ];
      const angles = [chart.descendant, chart.midheaven].filter((row): row is ChartRow => Boolean(row));
      const contacts = [...all, ...angles].flatMap(row => {
        const contact = majorLongitudeContact(row.longitude, longitude, 5);
        return contact ? [{ body: row.name, ...contact }] : [];
      });
      const lot: EvidenceItem = {
        id: `arabic-lot-${name}`,
        tradition: "arabic",
        category: "deterministic-rule",
        technique: "lots",
        subject: name,
        statement: `Lot of ${name[0].toUpperCase() + name.slice(1)} calculates to ${longitude.toFixed(4)}° in ${m.name} using ${sect} sect and ${formulaBodies.join(", ")}.`,
        concepts: ["lot", name, m.name.toLowerCase(), ...formulaBodies.map(body => body.toLowerCase())],
        polarity: "neutral",
        strength: 0.85,
        ruleId: "arabic-lots",
        sourceId: "local-arabic-rules",
        sourceTrace: trace("lots", "arabic-lots"),
      };
      evidence.push(lot);
      for (const { body, aspect, orbDeg } of contacts) {
        evidence.push({
          ...lot,
          id: `${lot.id}-${body.toLowerCase()}`,
          subject: body,
          concepts: ["lot", name, aspect],
          statement: `${lot.statement} ${body} contacts this Lot by ${aspect} at ${orbDeg}° orb.`,
        });
      }
    }
  } else
    evidence.push({
      id: "arabic-lots-uncertain",
      tradition: "arabic",
      category: "uncertainty",
      technique: "lots",
      subject: "fortune-spirit",
      statement:
        "Fortune and Spirit were not calculated because a local Ascendant and both luminaries are required.",
      concepts: ["lots", "incomplete"],
      polarity: "neutral",
      strength: 0,
      ruleId: "arabic-lots",
      sourceId: "local-arabic-rules",
      sourceTrace: trace("lots", "arabic-lots"),
    });
  if (plan.includeTiming)
    evidence.push({
      id: "arabic-hours-status",
      tradition: "arabic",
      category: "uncertainty",
      technique: "planetary-hours",
      subject: "timing",
      statement:
        "Planetary hours are not calculated without local sunrise and sunset inputs.",
      concepts: ["planetary-hours", "incomplete"],
      polarity: "neutral",
      strength: 0,
      ruleId: "arabic-planetary-hours",
      sourceId: "canopy-arabian",
      sourceTrace: trace(
        "planetary-hours",
        "arabic-planetary-hours",
        "canopy-arabian"
      ),
    });
  return evidence;
}
