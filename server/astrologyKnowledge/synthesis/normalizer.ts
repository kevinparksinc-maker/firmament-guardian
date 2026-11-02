import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import type { UnifiedMasterChartSnapshot } from "../../masterChart/types";
import type { InterpretedProposition } from "./types";

function getSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

export function extractPropositionsFromSnapshot(
  snapshot: UnifiedMasterChartSnapshot
): InterpretedProposition[] {
  const propositions: InterpretedProposition[] = [];
  const planets = snapshot.baseCelestialState.planets;
  const asc = snapshot.baseCelestialState.ascendant;
  const sun = planets.find(p => p.name === "Sun");
  const moon = planets.find(p => p.name === "Moon");
  const mars = planets.find(p => p.name === "Mars");
  const jupiter = planets.find(p => p.name === "Jupiter");
  const saturn = planets.find(p => p.name === "Saturn");
  const venus = planets.find(p => p.name === "Venus");

  // 1. Core Identity & Life Direction (Ascendant & Sun)
  if (asc) {
    const ascSign = getSign(asc.longitude);
    propositions.push({
      id: "prop-asc-foundation",
      themeTitle: `Rising Embodiment in ${ascSign}`,
      plainLanguageMeaning: `The personal horizon establishes an orientation rooted in ${ascSign}. Life is approached through the qualities of ${ascSign}, shaping direct engagement with circumstances, instinctual self-preservation, and physical presence.`,
      domain: "identity",
      causalMechanism: `Ascendant degree at ${asc.display}`,
      valence: "supportive",
      strength: "dominant",
      tradition: "Hellenistic",
      frame: "agent",
      supportingEvidenceIds: ["angle-ascendant", "house-1"],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["hellenistic-equal-houses"],
    });
  }

  if (sun) {
    const sunSign = getSign(sun.longitude);
    propositions.push({
      id: "prop-sun-core-purpose",
      themeTitle: `Solar Vitality & Conscious Center in ${sunSign}`,
      plainLanguageMeaning: `The core vitality and driving purpose are focused in ${sunSign} in the ${sun.house}th house. This demands deliberate self-respect, creative contribution, and integrity of action in the domains of that life sector.`,
      domain: "purpose_work",
      causalMechanism: `Sun at ${sun.display} (House ${sun.house})`,
      valence: "supportive",
      strength: "dominant",
      tradition: "Western Classical",
      frame: "agent",
      supportingEvidenceIds: [`planet-sun`, `house-${sun.house}`],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["ptolemy-tetrabiblos-1"],
    });
  }

  // 2. Emotional Instincts & Inner Equilibrium (Moon)
  if (moon) {
    const moonSign = getSign(moon.longitude);
    const moonNakshatra = (snapshot.layers["vedic-nakshatras-and-padas"]?.results as any[])?.find(
      (n: any) => n.body === "Moon"
    );
    const moonManzil = (snapshot.layers["arabic-lunar-manazil"]?.results as any[])?.find(
      (m: any) => m.body === "Moon"
    );

    propositions.push({
      id: "prop-moon-instinctive-mind",
      themeTitle: `Lunar Receptivity & Psychological Rhythm in ${moonSign}`,
      plainLanguageMeaning: `The emotional grounding and instinctual mind operate through ${moonSign} in House ${moon.house}${
        moonNakshatra ? `, governed by the Vedic asterism ${moonNakshatra.name} (pada ${moonNakshatra.pada}) with shakti of '${moonNakshatra.shakti}'` : ""
      }${
        moonManzil ? ` and the Arabic Manzil ${moonManzil.transliteration} (${moonManzil.meaning})` : ""
      }. This governs security needs, emotional digestion, and subconscious patterns.`,
      domain: "identity",
      causalMechanism: `Moon at ${moon.display} (House ${moon.house})`,
      valence: "neutral",
      strength: "dominant",
      tradition: "Vedic & Arabic Synthesis",
      frame: "shared",
      supportingEvidenceIds: [
        `planet-moon`,
        `house-${moon.house}`,
        ...(moonNakshatra ? [`nakshatra-moon-${moonNakshatra.nakshatraNumber}`] : []),
        ...(moonManzil ? [`manzil-moon-${moonManzil.manzilNumber}`] : []),
      ],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["surya-siddhanta", "al-sufi-book-of-fixed-stars"],
    });
  }

  // 3. Drive, Agency & Courage (Mars & Lot of Courage)
  if (mars) {
    const marsSign = getSign(mars.longitude);
    const drishti = (snapshot.layers["vedic-graha-drishti"]?.results as any[])?.filter(
      (d: any) => d.planet === "Mars"
    );
    propositions.push({
      id: "prop-mars-executive-drive",
      themeTitle: `Executive Force & Direct Action through Mars in ${marsSign}`,
      plainLanguageMeaning: `Active willpower and boundary assertion operate through Mars in ${marsSign} (House ${mars.house})${
        drishti && drishti.length > 0 ? `, casting forceful special drishti aspects toward ${drishti.map((d: any) => `${d.targetSign} (${d.type})`).join(" and ")}` : ""
      }. This provides the fortitude to confront resistance, defend boundaries, and execute hard decisions.`,
      domain: "autonomy_power",
      causalMechanism: `Mars at ${mars.display} in ${marsSign} (House ${mars.house})`,
      valence: "transformative",
      strength: "strong",
      tradition: "Hellenistic & Vedic Graha Drishti",
      frame: "shared",
      supportingEvidenceIds: [
        `planet-mars`,
        `house-${mars.house}`,
        ...(drishti ?? []).map((d: any) => `drishti-mars-${d.targetHouseOffset}`),
      ],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["dorotheus-carmen-astrologicum", "parashari-drishti-canon"],
    });
  }

  // 4. Structure, Time & Non-Negotiable Limits (Saturn & Lot of Nemesis)
  if (saturn) {
    const saturnSign = getSign(saturn.longitude);
    const lots = (snapshot.layers["arabic-hermetic-lots"]?.results as any[])?.find(
      (l: any) => l.name?.includes("Nemesis") || l.key?.includes("Nemesis")
    );
    propositions.push({
      id: "prop-saturn-sober-discipline",
      themeTitle: `Saturnian Reality, Accountability & Long-Term Mastery in ${saturnSign}`,
      plainLanguageMeaning: `Saturn positioned in ${saturnSign} (House ${saturn.house}) marks the sector where patience, uncompromising accountability, and slow craftsmanship are required. Short-term shortcuts are penalized; structured discipline builds enduring security${
        lots ? `. Reinforced by the Hermetic Lot of Nemesis in House ${lots.house} (${lots.display})` : ""
      }.`,
      domain: "choices_obstacles",
      causalMechanism: `Saturn at ${saturn.display} (House ${saturn.house})`,
      valence: "challenging",
      strength: "strong",
      tradition: "Hellenistic & Hermetic Lots",
      frame: "shared",
      supportingEvidenceIds: [
        `planet-saturn`,
        `house-${saturn.house}`,
        ...(lots ? [`lot-nemesis`] : []),
      ],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["paulus-alexandrinus-ch23", "ptolemy-tetrabiblos-1"],
    });
  }

  // 5. Expansion, Wisdom & Vocation (Jupiter & Lot of Spirit)
  if (jupiter) {
    const jupiterSign = getSign(jupiter.longitude);
    const lotSpirit = (snapshot.layers["arabic-hermetic-lots"]?.results as any[])?.find(
      (l: any) => l.name?.includes("Spirit") || l.key?.includes("Spirit")
    );
    const d9 = (snapshot.layers["vedic-vargas-divisional"]?.results as any[])?.find(
      (v: any) => v.division === "D9"
    )?.placements?.find((p: any) => p.body === "Jupiter");

    propositions.push({
      id: "prop-jupiter-expansion-wisdom",
      themeTitle: `Dharmic Growth, Higher Wisdom & Purposeful Enterprise in ${jupiterSign}`,
      plainLanguageMeaning: `Jupiter in ${jupiterSign} (House ${jupiter.house}) acts as the anchor for philosophical trust, mentorship, and generative optimism${
        d9 ? `, mapped in the D9 Navamsha to ${d9.sign}` : ""
      }${
        lotSpirit ? `, working alongside the Lot of Spirit at ${lotSpirit.display} (House ${lotSpirit.house}) to govern conscious vocation and intentional life building` : ""
      }.`,
      domain: "purpose_work",
      causalMechanism: `Jupiter at ${jupiter.display} (House ${jupiter.house})`,
      valence: "supportive",
      strength: "strong",
      tradition: "Vedic Parashari & Arabic Lots",
      frame: "shared",
      supportingEvidenceIds: [
        `planet-jupiter`,
        `house-${jupiter.house}`,
        ...(d9 ? [`varga-d9`] : []),
        ...(lotSpirit ? [`lot-spirit`] : []),
      ],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["brihat-parashara-hora-shastra", "paulus-alexandrinus-ch23"],
    });
  }

  // 6. Material Resources & Tangible Wealth (Lot of Fortune & 2nd House)
  const lotFortune = (snapshot.layers["arabic-hermetic-lots"]?.results as any[])?.find(
    (l: any) => l.name?.includes("Fortune") || l.key?.includes("Fortune")
  );
  if (lotFortune) {
    propositions.push({
      id: "prop-lot-fortune-material-body",
      themeTitle: `Material Circumstances, Fortune & Resource Flow in ${lotFortune.sign}`,
      plainLanguageMeaning: `The Hermetic Lot of Fortune at ${lotFortune.display} in House ${lotFortune.house} governs physical wellbeing, concrete assets, and what arrives through environmental providence rather than pure conscious initiative. It grounds high ideals in material sustainability.`,
      domain: "resources_wealth",
      causalMechanism: `Lot of Fortune (${lotFortune.formula ?? "Asc + Moon - Sun"}) at ${lotFortune.display}`,
      valence: "supportive",
      strength: "strong",
      tradition: "Hermetic & Arabic Canon",
      frame: "agent",
      supportingEvidenceIds: [`lot-fortune`, `house-${lotFortune.house}`],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["paulus-alexandrinus-ch23"],
    });
  }

  // 7. Relationship Magnetism & Mutual Alliances (Venus & Lot of Eros)
  if (venus) {
    const venusSign = getSign(venus.longitude);
    const lotEros = (snapshot.layers["arabic-hermetic-lots"]?.results as any[])?.find(
      (l: any) => l.name?.includes("Eros") || l.key?.includes("Eros")
    );
    const d9Venus = (snapshot.layers["vedic-vargas-divisional"]?.results as any[])?.find(
      (v: any) => v.division === "D9"
    )?.placements?.find((p: any) => p.body === "Venus");

    propositions.push({
      id: "prop-venus-relational-alliances",
      themeTitle: `Relational Harmony, Heart Desires & Aesthetic Discernment in ${venusSign}`,
      plainLanguageMeaning: `Venus in ${venusSign} (House ${venus.house}) governs social bonding, relational reciprocity, and aesthetic value${
        d9Venus ? `, anchored in the D9 Navamsha in ${d9Venus.sign}` : ""
      }${
        lotEros ? `, reinforced by the Lot of Eros in House ${lotEros.house} (${lotEros.display}) which describes voluntary magnetism and what the heart actively seeks` : ""
      }.`,
      domain: "relationships",
      causalMechanism: `Venus at ${venus.display} in ${venusSign} (House ${venus.house})`,
      valence: "supportive",
      strength: "moderate",
      tradition: "Hellenistic & Vedic Navamsha",
      frame: "shared",
      supportingEvidenceIds: [
        `planet-venus`,
        `house-${venus.house}`,
        ...(lotEros ? [`lot-eros`] : []),
        ...(d9Venus ? [`varga-d9`] : []),
      ],
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["dorotheus-carmen-astrologicum", "brihat-parashara-hora-shastra"],
    });
  }

  // 8. Fixed Star Contacts & Royal Watcher Prominence
  const royalStarsLayer = snapshot.layers["fixed-stars-royal-watchers"]?.results as any[];
  if (royalStarsLayer) {
    for (const star of royalStarsLayer) {
      if (star.contacts && star.contacts.length > 0) {
        for (const contact of star.contacts) {
          propositions.push({
            id: `prop-star-contact-${star.name.toLowerCase()}-${contact.body.toLowerCase()}`,
            themeTitle: `Royal Watcher Convergence: ${star.name} with ${contact.body}`,
            plainLanguageMeaning: `${contact.body} forms an exact contact (orb ${contact.orb}°) with the ancient Royal Star ${star.name} at fixed ${star.display}. This elevates the placement to archetypal public prominence, requiring total ethical integrity: great elevation accompanied by the test of humility.`,
            domain: "autonomy_power",
            causalMechanism: `Conjunction within ${contact.orb}° of ${star.name}`,
            valence: "transformative",
            strength: "dominant",
            tradition: "Babylonian & Persian Royal Watchers",
            frame: "god",
            supportingEvidenceIds: [`star-${star.name.toLowerCase()}`, `planet-${contact.body.toLowerCase()}`],
            opposingEvidenceIds: [],
            sourceDoctrineIds: ["ptolemy-fixed-stars", "babylonian-mul-apin"],
          });
        }
      }
    }
  }

  // 9. Sefer Yetzirah & Kabbalistic Pathways
  const syList = snapshot.layers["kabbalah-sefer-yetzirah"]?.results as any[];
  if (syList && syList.length > 0) {
    propositions.push({
      id: "prop-kabbalah-sefer-yetzirah-gates",
      themeTitle: `Cosmological Architecture: Sefer Yetzirah 7 Double Letters & Contrary Pairs`,
      plainLanguageMeaning: `The classical 7 planets operate as living gates through the Sefer Yetzirah double letters, holding dynamic contrary pairs (wisdom/folly, wealth/poverty, peace/war, beauty/disrepute, power/servitude). The native is called to consciously elevate the constructive pole through intentional choices.`,
      domain: "choices_obstacles",
      causalMechanism: "Sefer Yetzirah 32 Paths and Double Letter Correspondences",
      valence: "neutral",
      strength: "moderate",
      tradition: "Kabbalah & Sefer Yetzirah",
      frame: "shared",
      supportingEvidenceIds: syList.map(e => e.id).slice(0, 5),
      opposingEvidenceIds: [],
      sourceDoctrineIds: ["sefer-yetzirah-westcott-recension"],
    });
  }

  // 10. Active Transit Layer (if present)
  if (snapshot.transit?.aspectsToNatal && snapshot.transit.aspectsToNatal.length > 0) {
    for (const t of snapshot.transit.aspectsToNatal.slice(0, 4)) {
      propositions.push({
        id: `prop-transit-${t.transitBody.toLowerCase()}-${t.aspect.toLowerCase()}-${t.natalBody.toLowerCase()}`,
        themeTitle: `Active Transit Activation: ${t.transitBody} ${t.aspect} Natal ${t.natalBody}`,
        plainLanguageMeaning: `Currently active transit of ${t.transitBody} forms an exact ${t.aspect} (orb ${t.orb}°) to natal ${t.natalBody}. This produces ${t.nature === "friction" ? "constructive developmental friction and urgency" : "harmonious flow and opened pathways"} in the involved life domains.`,
        domain: "timing",
        causalMechanism: `Transit ${t.transitBody} ${t.aspect} Natal ${t.natalBody} (orb ${t.orb}°)`,
        valence: t.nature === "friction" ? "challenging" : "supportive",
        strength: t.orb < 1.5 ? "dominant" : "strong",
        tradition: "Firmament Transit Timing",
        frame: "transit",
        supportingEvidenceIds: [`transit-${t.transitBody}-${t.aspect}-${t.natalBody}`.toLowerCase()],
        opposingEvidenceIds: [],
        sourceDoctrineIds: ["firmament-transit-weather"],
      });
    }
  }

  // Exhaustive calculated-method extraction. One proposition per recorded result.
  // Preserve the complete result, not a short preview or only the first few items.
  // Reference-only and unimplemented methods are never promoted to chart findings.
  const domains: Record<string, InterpretedProposition["domain"]> = {
    "western-planets-and-signs": "identity",
    "western-houses-and-angles": "identity",
    "western-aspects-and-orbs": "choices_obstacles",
    "western-essential-dignities": "identity",
    "fixed-stars-royal-watchers": "autonomy_power",
    "arabic-hermetic-lots": "resources_wealth",
    "arabic-lunar-manazil": "identity",
    "vedic-nakshatras-and-padas": "identity",
    "vedic-vargas-divisional": "purpose_work",
    "vedic-dasha-and-ashtakavarga": "timing",
    "vedic-graha-drishti": "autonomy_power",
    "elemental-decans": "identity",
    "kabbalah-sefer-yetzirah": "choices_obstacles",
    "genesis-behavioral-patterns": "choices_obstacles",
    "transit-activation-layer": "timing",
  };
  for (const layer of snapshot.methodExecutionLedger) {
    if (layer.status !== "computed-with-result") continue;
    const findings = Array.isArray(layer.results) ? layer.results : layer.results == null ? [] : [layer.results];
    // Some evidence IDs represent groups, while others identify individual findings.
    // Always retain the full results and trace the entire layer's evidence IDs.
    findings.forEach((finding, index) => {
      const evidenceId = layer.evidenceIds[index] ?? layer.evidenceIds[0] ?? layer.id;
      const nature = typeof finding === "object" && finding !== null
        ? (finding as Record<string, unknown>).nature
        : undefined;
      const valence: InterpretedProposition["valence"] =
        nature === "friction" ? "challenging" :
        nature === "harmony" || nature === "harmonic" ? "supportive" : "neutral";
      propositions.push({
        id: `prop-method-${layer.id}-${index}`,
        themeTitle: `${layer.name} — finding ${index + 1}`,
        plainLanguageMeaning: `${layer.name}: ${JSON.stringify(finding)}`,
        domain: domains[layer.id] ?? "identity",
        causalMechanism: `${layer.technique}; ${layer.frame}; ${layer.calculationVersion}`,
        valence,
        strength: "moderate",
        tradition: layer.tradition,
        frame: layer.frame === "transit" ? "transit" : layer.frame === "god" ? "god" : layer.frame === "agent" ? "agent" : "shared",
        supportingEvidenceIds: [evidenceId],
        opposingEvidenceIds: [],
        sourceDoctrineIds: layer.sourceIds,
      });
    });
    // Record any evidence identifiers without a one-to-one finding.
    const alreadyLinked = new Set(propositions.flatMap(p => p.supportingEvidenceIds));
    const unlinked = layer.evidenceIds.filter(id => !alreadyLinked.has(id));
    if (unlinked.length) {
      propositions.push({
        id: `prop-method-${layer.id}-remaining`,
        themeTitle: `${layer.name} — additional evidence references`,
        plainLanguageMeaning: `Recorded method evidence references: ${unlinked.join(", ")}`,
        domain: domains[layer.id] ?? "identity",
        causalMechanism: layer.technique,
        valence: "neutral",
        strength: "subtle",
        tradition: layer.tradition,
        frame: layer.frame === "transit" ? "transit" : layer.frame === "god" ? "god" : layer.frame === "agent" ? "agent" : "shared",
        supportingEvidenceIds: unlinked,
        opposingEvidenceIds: [],
        sourceDoctrineIds: layer.sourceIds,
      });
    }
  }

  return propositions;
}
