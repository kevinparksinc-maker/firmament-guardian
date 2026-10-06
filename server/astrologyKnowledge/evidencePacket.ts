import type { ChartResult } from "../astronomy";
import { planKnowledge } from "./planner";
import { resolveWesternEvidence } from "./western";
import { resolveVedicEvidence } from "./vedic";
import { resolveArabicEvidence } from "./arabic";
import { resolveRelationships } from "./resolver";
import { ASTROLOGY_RULES, ASTROLOGY_SOURCES } from "./registry";
import type { AstrologyEvidencePacket, EvidenceItem } from "./types";

export function buildAstrologyEvidencePacket(
  chart: ChartResult,
  question: string,
  mode: "natal" | "transit" | "combined" = chart.readingScope
): AstrologyEvidencePacket {
  const plan = planKnowledge(question, mode);
  const westernEvidence = resolveWesternEvidence(chart, plan);
  const vedicEvidence = resolveVedicEvidence(chart, plan);
  const arabicEvidence = resolveArabicEvidence(chart, plan);
  const lunarEvidence = [...vedicEvidence, ...arabicEvidence].filter(item =>
    ["nakshatra", "manzil"].includes(item.technique)
  );
  const fixedStarEvidence: EvidenceItem[] = chart.frozenStars.flatMap(star =>
    (star.royalStarContacts ?? [])
      .filter(contact => contact.contact)
      .map(contact => ({
        id: `fixed-star-${star.name}-${contact.name}`,
        tradition: "firmament" as const,
        category: "calculated-fact" as const,
        technique: "fixed-stars",
        subject: star.name,
        statement: `${star.name} is within ${contact.distance.toFixed(2)}° of ${contact.name}.`,
        concepts: ["fixed-star", contact.name.toLowerCase()],
        polarity: "neutral" as const,
        strength: Math.max(0, 1 - contact.distance / 5),
        sourceId: "firmament-ephemeris",
        sourceTrace: {
          sourceId: "firmament-ephemeris",
          tradition: "firmament" as const,
          technique: "fixed-stars",
          sourceTitle: "Firmament local ephemeris",
          retrievedAt: new Date().toISOString(),
          confidence: "high" as const,
        },
      }))
  );
  const timingEvidence: EvidenceItem[] =
    mode === "natal"
      ? []
      : chart.transits.flatMap(transit =>
          transit.natalContacts
            .filter(contact => contact.orb <= 5)
            .map(contact => ({
              id: `timing-${transit.name}-${contact.natalName}-${contact.aspect}`,
              tradition: "firmament" as const,
              category: "calculated-fact" as const,
              technique: "transits",
              subject: transit.name,
              statement: `Transit ${transit.name} makes a ${contact.aspect} to natal ${contact.natalName} at ${contact.orb.toFixed(2)}°.`,
              concepts: [
                "transit",
                contact.aspect,
                transit.name.toLowerCase(),
                contact.natalName.toLowerCase(),
              ],
              polarity: ["square", "opposition"].includes(contact.aspect)
                ? ("pressured" as const)
                : ("supportive" as const),
              strength: Math.max(0, 1 - contact.orb / 5),
              sourceId: "firmament-ephemeris",
              sourceTrace: {
                sourceId: "firmament-ephemeris",
                tradition: "firmament" as const,
                technique: "transits",
                sourceTitle: "Firmament local ephemeris",
                retrievedAt: new Date().toISOString(),
                confidence: "high" as const,
              },
            }))
        );
  const all = [
    ...westernEvidence,
    ...vedicEvidence,
    ...arabicEvidence,
    ...timingEvidence,
    ...fixedStarEvidence,
  ];
  const resolved = resolveRelationships(all);
  const uncertainties = all.filter(item => item.category === "uncertainty");
  const incomplete = ASTROLOGY_RULES.filter(
    rule => rule.status === "incomplete"
  ).map(rule => `${rule.technique}: ${rule.statement}`);
  for (const source of ASTROLOGY_SOURCES.filter(
    source => source.status === "reference-only"
  )) {
    incomplete.push(
      `${source.name} is reference-only; no authorized runtime provider is enabled.`
    );
  }
  const sourceTrace = all.map(item => {
    const rule = item.ruleId
      ? ASTROLOGY_RULES.find(candidate => candidate.id === item.ruleId)
      : undefined;
    return {
      ...item.sourceTrace,
      provider: item.sourceTrace.provider ?? item.sourceTrace.sourceId,
      implementationStatus: rule?.status ?? "implemented",
      ...(item.sourceTrace.sourceUrl
        ? {}
        : {
            calculationSettings: {
              worldview: chart.worldview,
              readingScope: chart.readingScope,
              relationshipOrb: 5,
            },
          }),
    };
  });
  return {
    question,
    plan,
    chartFacts: {
      worldview: chart.worldview,
      readingScope: chart.readingScope,
      utc: chart.utc,
      agentViewAvailable: chart.agentViewAvailable,
      placements: [
        ...chart.movingBodies,
        chart.ascendant,
        chart.descendant,
        chart.midheaven,
        chart.northNode,
        chart.southNode,
      ]
        .filter(Boolean)
        .map(row => ({
          name: row!.name,
          longitude: row!.longitude,
          display: row!.display,
          house: row!.house,
          godHouse: row!.godHouse,
          agentHouse: row!.agentHouse,
        })),
    },
    westernEvidence,
    vedicEvidence,
    arabicEvidence,
    lunarEvidence,
    fixedStarEvidence,
    timingEvidence,
    relationships: resolved.relationships,
    convergences: resolved.convergences,
    contradictions: resolved.contradictions,
    uncertainties,
    incomplete,
    sourceTrace,
    doctrine: {
      western: {
        relationshipOrb: 5,
        houseFrame: chart.agentViewAvailable
          ? "equal-house Agent View plus fixed God View"
          : "fixed God View only",
      },
      vedic: {
        background: "fixed 0° Aries / 27 equal Nakshatras",
        sourceMode: "local rules plus reference-only Tvam trace",
      },
      arabic: {
        background: "fixed 28 Manazil",
        sourceMode: "local rules plus reference-only Canopy trace",
      },
    },
  };
}

export function formatEvidencePacket(packet: AstrologyEvidencePacket) {
  const section = (title: string, items: EvidenceItem[]) =>
    `${title}\n${items.length ? items.map(item => `- [${item.tradition}/${item.technique}] ${item.statement}`).join("\n") : "- none"}`;
  const relationEvidence = (
    item: AstrologyEvidencePacket["relationships"][number],
    technique: string
  ): EvidenceItem => ({
    id: item.id,
    tradition: "firmament",
    category: "deterministic-rule",
    technique,
    subject: item.theme,
    statement: `${item.explanation} Strength ${item.strength}.`,
    concepts: [item.theme],
    sourceId: "firmament-architecture",
    sourceTrace: {
      sourceId: "firmament-architecture",
      tradition: "firmament",
      technique,
      sourceTitle: "Firmament architecture",
      retrievedAt: new Date().toISOString(),
      confidence: "high",
    },
  });
  return [
    "ASTROLOGY EVIDENCE PACKET",
    `Question: ${packet.question}`,
    `Plan: ${packet.plan.reasons.join(" ")}`,
    section("Western evidence", packet.westernEvidence),
    section("Vedic evidence", packet.vedicEvidence),
    section("Arabic evidence", packet.arabicEvidence),
    section("Lunar evidence", packet.lunarEvidence),
    section("Timing evidence", packet.timingEvidence),
    section(
      "Convergences",
      packet.convergences.map(item => relationEvidence(item, "convergence"))
    ),
    section(
      "Contradictions and qualifications",
      packet.contradictions.map(item => relationEvidence(item, "contradiction"))
    ),
    packet.uncertainties.length
      ? section("Explicit uncertainties", packet.uncertainties)
      : "",
    packet.incomplete.length
      ? `Incomplete or reference-only\n${packet.incomplete.map(item => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
