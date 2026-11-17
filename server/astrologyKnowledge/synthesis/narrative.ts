import { runInterpretation, interpretationText } from "./interpretationPipeline";
import { FULL_SYNTHESIS_STYLE, SYNTHESIS_LAYERS_AND_EXAMPLES } from "../../master-interpreter";
import type { SynthesisResult } from "./types";
import { buildPlanetPersonaMatrix, type PlanetPersonaTrait } from "../../../shared/planetPersonaMatrix";
import {
  extractRequestedActors,
  mapRequestedPlacementsToCanonicalMeaning,
  type CanonicalPlacementMapping,
} from "../../../shared/masterPlanetPersonaConfig";
import { retrieveChartCanonDossier } from "../canon/retriever";
import {
  buildNamedChartConfigurations,
  getHousesRuledByPlanet,
} from "./deepDeterministicStory";

export interface MasterNarrative {
  answer: string;
  sections: Array<{ id: string; title: string; text: string; findingIds: string[] }>;
  methodContributions: Array<{ methodId: string; sectionIds: string[]; findingIds: string[]; contribution: string }>;
  methodsReviewed: string[];
}

function cleanProse(text: string): string {
  return text
    .replace(/\bcosmic\b/gi, "real-world")
    .replace(/\bsacred mirror\b/gi, "direct mirror")
    .replace(/\bsacred\b/gi, "core")
    .replace(/\benduring bastion\b/gi, "steady anchor")
    .replace(/\bbastion\b/gi, "anchor")
    .replace(/\bdeep underworld\b/gi, "behind-the-scenes reality")
    .replace(/\bunderworld\b/gi, "unspoken undercurrents")
    .replace(/\bpsychological alchemy\b/gi, "deep personal change")
    .replace(/\balchemy\b/gi, "reinvention")
    .replace(/\balchemist\b/gi, "builder")
    .replace(/\btapestry\b/gi, "pattern")
    .replace(/\bancestral crucible\b/gi, "familiar comfort zone")
    .replace(/\bevolutionary compass\b/gi, "growth direction")
    .replace(/\bevolutionary frontier\b/gi, "next growth stage")
    .replace(/\bsymphony\b/gi, "connected system");
}

function balanceBoldPerLine(text: string): string {
  return text
    .split("\n")
    .map(line => {
      const matches = line.match(/\*\*/g);
      if (matches && matches.length % 2 === 1) {
        // Strip unmatched trailing/dangling ** so bold never bleeds across blocks
        const lastIdx = line.lastIndexOf("**");
        return line.slice(0, lastIdx) + line.slice(lastIdx + 2);
      }
      return line;
    })
    .join("\n");
}

export function scrubLeaks(text: string): string {
  if (!text) return "";
  let out = cleanProse(text)
    // Remove boilerplate blocks & generic canned closing advice
    .replace(/Read their specific mechanisms together:[\s\S]*?determine its emphasis\.?/gi, "")
    .replace(/The relative strength and evidence of each finding determine its emphasis\.?/gi, "")
    .replace(/Use this awareness practically: lean on your direct honesty[\s\S]*?effort pays off\.?/gi, "")
    .replace(/\bChart weighting marks[^.\n]*\.?/gi, "")
    .replace(/\bYour vitality rises when[^.\n]*\.?/gi, "")
    .replace(/\bAt its best,\s*this gives you\b/gi, "Constructively, this produces")
    .replace(/\bUnder stress,\s*watch the trap(?:\s+of)?\b/gi, "Under strain, the defensive cost is")
    .replace(/\bWatch out for the trap of\b/gi, "The defensive cost here is")
    .replace(/\bThis could suggest\b/gi, "This points directly to")
    .replace(/\bYou might possibly\b/gi, "You")
    .replace(/\bPerhaps you tend to\b/gi, "You often")
    .replace(/\bVenus-toned\b/gi, "measured")
    .replace(/\bdiagnostic intellect\b/gi, "sharp practical judgment")
    .replace(/\bemotional regulation(?:\s+patterns?)?\b/gi, "self-control under stress")
    .replace(/\bprotective strategies(?:\s+behind reactions)?\b/gi, "self-protective habits")
    .replace(/\battachment wounds?\b/gi, "old trust hurts")
    .replace(/\bcoping mechanisms?\b/gi, "day-to-day habits")
    .replace(/\bdefense mechanisms?\b/gi, "defensive habits")
    .replace(/\bpsychological crucible\b/gi, "hard test of power and control")
    .replace(/\bpsychological rebirth\b/gi, "deep personal renewal")
    .replace(/\bpsychological safety\b/gi, "real trust")
    .replace(/\bsomatic gut-instincts\b/gi, "gut instincts")
    .replace(/\bsomatic\b/gi, "physical")
    // Neutralize raw God-to-Agent mechanical routing strings if echoed verbatim
    .replace(/(?:in\s+)?God House\s+\d+(?:\s*\([^)]*\))?\s+is routed through Agent House\s+(\d+)/gi, "operating through House $1")
    .replace(/\bis routed through Agent House\s+(\d+)\b/gi, "operating through House $1")
    // Remove ISO UTC timestamps & evaluation stamps
    .replace(/;?\s*evaluated\s+\d{4}-\d{2}-\d{2}T[\d:.]+Z?/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "")
    // Remove internal calculation module labels & flow telemetry
    .replace(/\s*·\s*(?:Western Classical Longitudes & Signs|Ptolemaic Aspects & Orbs|Vedic Divisional Charts[^)\n]*|Essential Dignities & Sign Rulerships|Ashtakavarga)\b/gi, "")
    .replace(/;?\s*configured flow\s*-?\d+/gi, "")
    .replace(/,?\s*half major weight/gi, "")
    .replace(/\((?:D\d+: 30° sign[^)]*|[^)]*source\s+\d+\.\d+°[^)]*)\)/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:virupas|rupas)\b/gi, "")
    .replace(/\(\s*(?:\d+°\d+[′']?|\s*)\s*\)/g, "")
    .replace(/\s*\(\s*\d+(?:\.\d+)?°\s*orb\s*\)/gi, "")
    .replace(/\b\d+\.\d{3,}°/g, match => `${Number(match.slice(0, -1)).toFixed(1)}°`)
    .replace(/\baura of [a-z]+\s+flavor:\s*decan\s+\d+\s*\([^)]*\)\s*[—–-]?\s*/gi, "")
    // Translate internal jargon if echoed
    .replace(/\bcollection-of-light\b/gi, "bridging support")
    .replace(/\btranslation-of-light\b/gi, "momentum carried between planets")
    .replace(/\bmutual-reception\b/gi, "mutual support")
    .replace(/\bchart-relative comparison\b/gi, "relative chart balance")
    // Convert inline bullet runs into proper line items
    .replace(/([^\n])\s+•\s+/g, "$1\n- ")
    .replace(/^•\s+/gm, "- ")
    // Collapse excess horizontal spaces while preserving newlines
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  out = balanceBoldPerLine(out);
  return out;
}

export function scrubNonHoraryAstrologyJargon(text: string): string {
  if (!text) return "";
  return scrubLeaks(text)
    .replace(/^>\s*\*\*Chart Factors:\*\*[^\n]*\n*/gim, "")
    .replace(/\b(?:God|Agent)\s+House\s+\d+\b/gi, "")
    .replace(/\bHouse\s+(?:1[0-2]|[1-9])\b/gi, "")
    .replace(/\b(?:1[0-2]|[1-9])(?:st|nd|rd|th)\s+House\b/gi, "")
    .replace(/\bH(?:1[0-2]|[1-9])\b/g, "")
    .replace(
      /\b(?:Ascendant|Descendant|Midheaven|Nakshatras?|Manazil|Manzil|Navamsha|Shadbala|Bhava Bala|Vimshottari|Mahadasha|Antardasha|Pratyantardasha|Firdaria|Chaldean face|Egyptian bounds?|Almuten(?:\s+Figuris)?|Lot of (?:Fortune|Spirit|Eros|Necessity|Courage|Victory|Nemesis)|Hermetic Lots?|North Node|South Node|True Node|Rahu|Ketu|Atmakaraka|Darakaraka|D9|Pada\s*[1-4])\b/gi,
      ""
    )
    .replace(/\b(?:Aries|Taurus|Gemini|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/g, "")
    .replace(/\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(?:in|conjunct|trine|square|opposite|sextile|semisextile|quincunx)\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?°/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generate(synthesis: SynthesisResult, question: string, supplementalEvidence: string) {
  const canonicalChart = synthesis.sourceSnapshot.natal;
  let personaMatrix: PlanetPersonaTrait[] = [];
  let personaMatrixMarkdown = "";
  let canonicalMappings: CanonicalPlacementMapping[] = [];

  const requestedActors = extractRequestedActors(question);

  if (canonicalChart) {
    try {
      personaMatrix = buildPlanetPersonaMatrix(canonicalChart);
      canonicalMappings = mapRequestedPlacementsToCanonicalMeaning(canonicalChart, requestedActors);
      const dossier = retrieveChartCanonDossier(canonicalChart);
      const ruledMap = getHousesRuledByPlanet(canonicalChart);

      const ruledSummary = Array.from(ruledMap.entries())
        .map(([planet, houses]) => `- ${planet} rules House${houses.length > 1 ? "s" : ""} ${houses.join(", ")}`)
        .join("\n");

      const lotsSummary = dossier.arabicLotsSummary
        .map(l => `- ${l.lot.name}: ${l.sign}, House ${l.house} (${l.lot.psychologicalMeaning})`)
        .join("\n");

      const relationalSummary = (dossier.relationalChains ?? [])
        .map(rc => `- House ${rc.house} (${rc.houseTopic}) → ${rc.ruler} in ${rc.rulerSign} (House ${rc.rulerHouse}): ${rc.inherentDignityVsDelivery}`)
        .join("\n");

      const mechanismSummary = dossier.detectedMechanisms
        .map(m => `- ${m.title}: ${m.statement}`)
        .join("\n");

      const dispositorSummary = (dossier.dispositorChains ?? [])
        .map(d => `- ${d.planet} in ${d.sign} → host ${d.domicileLord} (${d.receptionWithLord.replace(/-/g, " ")}; chain: ${d.chainToFinalDispositor.join(" → ")})`)
        .join("\n");

      const yogasSummary = (dossier.vedicJyotishSystem?.detectedYogas ?? [])
        .map(y => `- ${y.name} (${y.status}): ${y.humanRealitySynthesis}`)
        .join("\n");

      const charaSummary = dossier.vedicJyotishSystem?.charaKarakas
        ?.map(k => `${k.karaka}: ${k.planet}`)
        .join(" | ");

      const placementByBody = new Map(dossier.placements.map(pl => [pl.body, pl]));
      const traitByBody = new Map(personaMatrix.map(p => [p.planet, p]));
      const preDetectedConfigs = buildNamedChartConfigurations(personaMatrix, ruledMap);

      personaMatrixMarkdown = "--- PLANET PERSONA CANON MATRIX (ALL CALCULATED LAYERS) ---\n" +
        "| Planet | Sign & Deg | Agent & God Frame | Chaldean Face, Triplicity & Bounds | Nakshatra, Pada & D9 | Manzil | Dignity, Sect & Capacity | Aspects |\n" +
        "|---|---|---|---|---|---|---|---|\n" +
        personaMatrix.map(p => {
          const ruled = ruledMap.get(p.planet) ?? [];
          const ruledLabel = ruled.length ? ` (Rules H${ruled.join(", H")})` : "";
          const pl = placementByBody.get(p.planet);
          const godFrameLabel = pl?.godHouse && pl.godHouse !== p.house ? ` [God H${pl.godHouse} archetype]` : "";
          const subLayersLabel = `Chaldean Face: ${p.chaldeanFaceRuler}; Triplicity Sub-ruler: ${p.decanSubRuler}; ${p.boundsEgyptian}`;
          const nakDetail = pl?.nakshatraRecord ? `${p.nakshatraName} P${p.nakshatraPada} (${p.nakshatraDeity}; ${pl.nakshatraRecord.shakti})` : `${p.nakshatraName} P${p.nakshatraPada} (${p.nakshatraDeity})`;
          return `| ${p.planet} | ${p.formattedPosition} | Agent H${p.house}${ruledLabel}${godFrameLabel}: ${p.houseArena.slice(0, 36)} | ${subLayersLabel} | ${nakDetail} / D9 ${p.navamshaD9} | ${p.manzilName} | ${p.sovereigntyTier} / ${p.shadbalaStatus} (${p.houseSupportTier}) | ${p.activeAspects.slice(0, 3).join("; ") || "Solo"} |`;
        }).join("\n") + "\n\n" +
        (preDetectedConfigs.length ? `--- PRE-DETECTED MULTI-PLANET CONFIGURATIONS ---\n${preDetectedConfigs.join("\n")}\n\n` : "") +
        (ruledSummary ? `--- HOUSE RULERSHIP CHAINS ---\n${ruledSummary}\n\n` : "") +
        (dispositorSummary ? `--- DISPOSITOR CHAINS & HOST HOSPITALITY ---\n${dispositorSummary}\n\n` : "") +
        (relationalSummary ? `--- KEY RELATIONAL CHAINS ---\n${relationalSummary}\n\n` : "") +
        (lotsSummary ? `--- HERMETIC & ARABIC LOTS ---\n${lotsSummary}\n\n` : "") +
        (mechanismSummary ? `--- DETECTED TRADITIONAL MECHANISMS ---\n${mechanismSummary}\n\n` : "") +
        (dossier.arabicPersianSystem?.almutenFiguris ? `--- ALMUTEN FIGURIS & FIRDARIA ---\nAlmuten Winner: ${dossier.arabicPersianSystem.almutenFiguris.winnerPlanet}. ${dossier.arabicPersianSystem.firdariaSystem.explanation}\n\n` : "") +
        (yogasSummary || charaSummary ? `--- VEDIC YOGAS & CHARA KARAKAS ---\n${charaSummary ? `Karakas: ${charaSummary}\n` : ""}${yogasSummary}\n\n` : "") +
        "--- PRE-NARRATIVE CANONICAL MAPPINGS (MANDATORY REQUESTED ACTORS) ---\n" +
        canonicalMappings.map(m => {
          const trait = traitByBody.get(m.actor) ?? personaMatrix.find(p => p.planet.replace(/\s+/g, "").toLowerCase() === m.actor.replace(/\s+/g, "").toLowerCase());
          const subLayerLine = trait
            ? `Chaldean Face: ${trait.chaldeanFaceRuler}; Triplicity Sub-ruler: ${trait.decanSubRuler}; ${m.boundsEgyptian}`
            : m.boundsEgyptian;
          return (
            `[ACTOR: ${m.actor} (${m.symbol}) in ${m.sign}, House ${m.house}]\n` +
            `- Life Arena: ${m.houseArena}\n` +
            `- Sub-Sign Layers (Keep Strictly Distinct): ${subLayerLine}\n` +
            `- Nakshatra & Manzil: ${m.nakshatraName} Pada ${m.nakshatraPada} (${m.nakshatraDeity}; ${m.nakshatraShakti}); ${m.manzilName}\n` +
            `- Dignity & Chart Weight: ${m.sovereigntyTier}; ${m.shadbalaStatus}; House support: ${m.houseSupportTier}\n` +
            `- Real-World Meaning: ${m.realWorldTranslation.coreTheme}\n` +
            `- Behavioral Guide: ${m.realWorldTranslation.conversationalProse}`
          );
        }).join("\n\n") + "\n\n";
    } catch {
      // The full calculated dossier is still included if this display matrix is unavailable.
    }
  }

  const response = await runInterpretation("MASTER_READING", synthesis, {
      max_tokens: 8192,
      timeoutMs: 35_000,
      messages: [
        {
          role: "system",
          content: FULL_SYNTHESIS_STYLE + `\n\n${SYNTHESIS_LAYERS_AND_EXAMPLES}\n\nSILENT SYNTHESIS GUARDRAILS:
- Read the entire supplied chart JSON silently. Do not recalculate placements, fill in missing data, or invent chart evidence. If a field is missing or marked "not_calculated", continue with the available evidence.
- Do not repeat the same placement in more than one section, and weave converging findings into one insight instead of echoing parallel lines.
- Return only the reading: short, bold section titles specific to this reader and topic; flowing paragraphs with varied length, rhythm, and openings; zero boilerplate openings, stock transitions, generic encouragement, or recap endings.
- Keep all astrology terminology out of the reader-facing text, including the titles. Never name planets, zodiac signs, houses, degrees, aspects, lunar mansions or stations, bounds, faces, or Lots. Keep citations and technical metadata in the Evidence tab. Use no bullet-point lists of traits. End with a sentence that belongs to this reader and this chart.`
        },
        {
          role: "user",
          content: `${personaMatrixMarkdown}${supplementalEvidence ? supplementalEvidence + "\n\n" : ""}REQUESTED TOPIC / INQUIRY: "${question}"\n\nWrite an intimate, candid, second-person portrait answering this inquiry directly using the structured chart data silently. Start with the strongest active pattern, give natural gifts the same weight as difficult patterns, make room for ordinary-life scenes across family, friendships, intimate partnerships, work, and creative interests (or follow the focused topic while pulling in related areas), use short bold section titles specific to this reader and topic, write in flowing paragraphs with no bullet-point lists of traits, and keep all astrology terminology out of both the titles and body prose. End with a single sentence that belongs to this reader and this chart.`
        },
      ],
    });

  const text = scrubNonHoraryAstrologyJargon(interpretationText(response));
  if (text.length < 80)
    throw new Error("MASTER_READING_INCOMPLETE: The provider did not return a full reading.");

  // Parse short bold standalone titles (**Title**) or legacy markdown headings (### Title)
  const rawSections = text
    .split(/(?=^(?:#{2,3}\s+[^\n]+|\*\*[^*\n]{2,120}\*\*)\s*$)/gm)
    .filter(s => s.trim().length > 0);
  const generatedSections = rawSections.map((chunk, index) => {
    const headingMatch = chunk.match(/^(?:#{2,3}\s+(?:Chapter [IVXLCDM]+:\s*)?([^\n]+)|\*\*([^*\n]{2,120})\*\*)\s*$/m);
    const title = (headingMatch?.[1] || headingMatch?.[2] || `Section ${index + 1}`).trim();
    const cleanText = scrubNonHoraryAstrologyJargon(
      chunk
        .replace(/^(?:#{2,3}\s+[^\n]+|\*\*[^*\n]{2,120}\*\*)\s*\n*/m, "")
        .replace(/^---\n+/m, "")
    );
    return {
      id: `section-${index + 1}`,
      title,
      text: cleanText || scrubNonHoraryAstrologyJargon(chunk),
      findingIds: [],
    };
  });
  const firstCleanParagraph =
    scrubNonHoraryAstrologyJargon(
      text
        .replace(/^#{1,6}\s+[^\n]+\n*/gm, "")
        .replace(/^\*\*[^*\n]{2,120}\*\*\n*/gm, "")
        .replace(/^>\s+\*\*Chart Factors:\*\*[^\n]+\n*/gm, "")
        .split(/\n\n+/)
        .map(p => p.trim())
        .find(p => p.length >= 60 && !p.startsWith("---")) ?? text
    );

  const narrative: MasterNarrative = {
    answer: text,
    sections: generatedSections.length ? generatedSections : [{ id: "complete-reading", title: "Your Complete Reading", text, findingIds: [] }],
    methodContributions: synthesis.methodOutcomes.map(outcome => ({
      methodId: outcome.methodId,
      sectionIds: generatedSections.map(s => s.id),
      findingIds: outcome.evidenceIds,
      contribution: outcome.contribution,
    })),
    methodsReviewed: synthesis.sourceSnapshot.methodExecutionLedger.map(l => l.name),
  };

  return {
    ...synthesis,
    calculatedNarrative: synthesis.integratedNarrative,
    dominantConclusion: firstCleanParagraph,
    integratedNarrative: [text],
    narrative,
    narrativeAudit: {
      passed: true,
      interpretedMethodIds: narrative.methodContributions.map(c => c.methodId),
      citedFindingIds: Array.from(new Set(narrative.sections.flatMap(s => s.findingIds))),
      validation: "direct-ai-prose" as const,
      inputCoverage: "complete-calculated-outcomes" as const,
      deliveredMethodIds: synthesis.sourceSnapshot.methodExecutionLedger.map(layer => layer.id),
      deliveredOutcomeIds: synthesis.methodOutcomes.map(outcome => outcome.methodId),
    },
  };
}

export async function narrateMasterSynthesis(synthesis: SynthesisResult, question: string, supplementalEvidence = "") {
  return generate(synthesis, question, supplementalEvidence);
}

