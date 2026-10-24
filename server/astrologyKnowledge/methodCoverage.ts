import type { AstrologyEvidencePacket, EvidenceItem } from "./types";

/** Every reading uses this same auditable method-family ledger.
 * A method family is evaluated before prioritizing the user's question.
 * Absence of evidence never means permission to invent a result.
 */
export const UNIVERSAL_METHOD_FAMILIES = [
  ["western","Western planets, signs, houses, rulerships and relationships"],
  ["genesisAstro","Genesis Astro Engine"],
  ["genesisPattern","Genesis Pattern Engine and Yogas"],
  ["behavior","Seven-channel Human Behavioral Intelligence"],
  ["lifeEvents","Life Event and Sequence Intelligence"],
  ["canon","Firmament traditional Western, Vedic, Arabic and stellar canon"],
  ["kabbalah","Sefer Yetzirah letter correspondences and Four Worlds"],
  ["vedic","Vedic divisions, Dasha, Ashtakavarga and Jyotish methods"],
  ["arabic","Arabic and Persian astrological methods"],
  ["lunar","Lunar mansions, Nakshatras and Manazil"],
  ["fixedStars","Fixed-star contacts"],
  ["timing","Timing, activation and transits"],
] as const;
export type UniversalMethodFamily = (typeof UNIVERSAL_METHOD_FAMILIES)[number][0];
export type MethodCoverageEntry = {
  id: UniversalMethodFamily;
  name: string;
  status: "evidence-supplied" | "no-result-supplied";
  count: number;
  techniques: string[];
  evidenceIds: string[];
};
export const UNIVERSAL_READING_CONTRACT = `UNIVERSAL ALL-METHOD READING CONTRACT:
PIPELINE ORDER IS MANDATORY: (1) READ the fully calculated chart — every supplied body, degree, sign, house, node, ruler and aspect; (2) RUN/RETRIEVE the available deterministic method results through the evidence-packet and Canon Dossier engine, rather than asking the language model to hallucinate method calculations; (3) INVENTORY every method family's status and actual returned evidence; (4) COMPARE methods, territories, correspondences, convergences and conflicts, including fixed-star territory, Kabbalah / Sefer Yetzirah, Four Worlds, traditional Western, Vedic/Jyotish, Arabic/Persian, lunar systems, Lots, decans, and Genesis; (5) SYNTHESIZE the complete evidence into grounded plain-language life situations and a coherent answer. Do not begin narrative generation until the supplied results have been reviewed. Each method's individual findings must remain traceable; naming a method without actual output is not method execution. Preserve source traditions and never merge incompatible historical variants into a fabricated consensus. The interpreter must not silently replace missing computations with persuasive prose. If a desired method is not wired into the engine, explicitly identify it as missing and do not claim full coverage.
Read the complete evidence packet and method ledger BEFORE selecting themes. Never silently skip a family of methods. For EVERY family, evaluate supplied findings and explicitly distinguish supported, conflicting, contextual, absent and not-applicable evidence. Incorporate every material result into the reading or its full evidence appendix, not just the Sun/Moon or one or two planets. Cite actual body, longitude, house, method and its source trace wherever available. Examine all twelve houses and every supplied celestial body. Preserve separate God/Agent and natal/transit frames. Compare Western, Genesis, Vedic, Arabic/Persian, lunar, fixed stars, behavioral, Kabbalah/Sefer Yetzirah and Four Worlds; do not conflate incompatible historical traditions or coordinate systems. Evaluate all available results even when they do not change the conclusion. Never invent a Dasha, Ashtakavarga, Varga, aspect, star contact or house when prerequisites or evidence are absent. In horary, preserve traditional significators, receptions, perfection and Moon testimony as primary; other layers contribute rather than overrule. Make the reading detailed, personally meaningful, traceable and falsifiable without diagnosing a person or claiming spiritual certainty. A narrative cannot literally narrate every low-signal evidence row without becoming unreadable: provide exhaustive evidence in its technical annex and interpret all relevant results visibly.`;

export function methodCoverage(packet: AstrologyEvidencePacket): MethodCoverageEntry[] {
  const families: Record<UniversalMethodFamily, EvidenceItem[]> = {
    western: packet.westernEvidence,
    genesisAstro: packet.genesisAstroEvidence,
    genesisPattern: packet.patternEvidence,
    behavior: packet.behavioralEvidence,
    lifeEvents: packet.lifeEventEvidence,
    canon: packet.canonEvidence.filter(x => !["sefer-yetzirah-doubles","sefer-yetzirah-simples","sefer-yetzirah-framework","sefer-yetzirah-mothers","four-worlds"].includes(x.technique)),
    kabbalah: packet.canonEvidence.filter(x => x.technique.startsWith("sefer-yetzirah") || x.technique === "four-worlds"),
    vedic: packet.vedicEvidence,
    arabic: packet.arabicEvidence,
    lunar: packet.lunarEvidence,
    fixedStars: packet.fixedStarEvidence,
    timing: packet.timingEvidence,
  };
  return UNIVERSAL_METHOD_FAMILIES.map(([id, name]) => {
    const entries = families[id];
    return {id,name,status:entries.length?"evidence-supplied":"no-result-supplied",count:entries.length,techniques:Array.from(new Set(entries.map(x=>x.technique))).sort(),evidenceIds:entries.map(x=>x.id)};
  });
}
export function formatUniversalMethodCoverage(packet: AstrologyEvidencePacket): string {
  return [
    "UNIVERSAL METHOD EXECUTION / COVERAGE LEDGER",
    "Evidence-supplied means the source returned records; it does not mean every possible submethod ran or confirms the conclusion.",
    ...methodCoverage(packet).map(x => `- ${x.name}: ${x.status}; ${x.count} records; techniques: ${x.techniques.join(", ") || "none"}`),
    packet.incomplete.length ? "Known incomplete methods: " + packet.incomplete.join("; ") : "No incomplete registry entries reported.",
  ].join("\n");
}
