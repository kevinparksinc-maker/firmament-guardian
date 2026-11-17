import type { HumanDomain, InterpretedProposition, SynthesizedTheme } from "./types";

/**
 * Evidence-first synthesis. Every computed proposition is retained, while
 * meaningful interactions receive explicit support, tension, and weighting.
 * These are traditional chart interpretations, not assertions of life events.
 */
const DOMAIN_TITLES: Record<HumanDomain, string> = {
  identity: "Identity, Temperament & Self-Knowledge",
  purpose_work: "Purpose, Vocation & Gifts",
  relationships: "Relationships & Alliances",
  resources_wealth: "Resources, Wealth & Material Life",
  family_home: "Family, Roots & Home",
  autonomy_power: "Will, Courage & Power",
  energy_wellbeing: "Vitality, Habits & Wellbeing",
  choices_obstacles: "Challenges, Choices & Character",
  timing: "Timing, Transits & Turning Points",
};

const STRENGTH: Record<InterpretedProposition["strength"], number> = {
  dominant: 4, strong: 3, moderate: 2, subtle: 1,
};

const unique = (items: string[]): string[] => Array.from(new Set(items));
const evidence = (items: InterpretedProposition[]): string[] =>
  unique(items.flatMap(item => item.supportingEvidenceIds));

function weight(item: InterpretedProposition): number {
  return STRENGTH[item.strength] + Math.min(item.supportingEvidenceIds.length, 5) * 0.2;
}

function describe(item: InterpretedProposition): string {
  return `[${item.tradition}; ${item.frame}; ${item.strength}; ${item.valence}] ${item.themeTitle}: ${item.plainLanguageMeaning} Traditional mechanism: ${item.causalMechanism}. Evidence: ${item.supportingEvidenceIds.join(", ") || "not identified"}.`;
}

const MAX_PER_SIDE = 2;

function plainPlacementLabel(item: InterpretedProposition): string {
  // Strip module suffixes ("· Ptolemaic Aspects & Orbs") and event prefixes
  const rawSubject = item.themeTitle
    .replace(/^Event\s*·\s*/i, "")
    .split(/\s+·\s+/)[0]
    .trim();

  // Make astronomical/vedic subjects concise and natural for general readers
  if (/^SAV\s+/i.test(rawSubject)) {
    return `${rawSubject.replace(/^SAV\s+/i, "")} sign support`;
  }
  if (/^(D\d+)\s+(.+)$/i.test(rawSubject)) {
    const [, div, body] = rawSubject.match(/^(D\d+)\s+(.+)$/i)!;
    const divLabel = div === "D9" ? "Navamsha (D9)" : div === "D10" ? "Dashamsha (D10)" : div;
    return `${body} in ${divLabel}`;
  }
  return rawSubject
    .replace(/\bconjunction\b/gi, "conjunct")
    .replace(/\bsemisextile\b/gi, "semisextile")
    .replace(/–/g, " with ");
}

function summarizeInsight(item: InterpretedProposition): string {
  const cleaned = item.plainLanguageMeaning
    .replace(/\[(?:TRADITION|MODERN_SYNTHESIS[^\]]*)[^\]]*\]\s*/gi, "")
    .replace(/\b(?:Psychological dynamic|Healthy expression|Defensive risk under pressure|Psychological field)\s*:\s*/gi, "")
    .replace(/\([^)]*(?:deg|orb|virupas|rupas|evaluated|configured flow|source)[^)]*\)/gi, "")
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177).trim()}…` : firstSentence;
}

export function clusterPropositionsIntoThemes(
  propositions: InterpretedProposition[]
): {
  themes: SynthesizedTheme[];
  tensions: Array<{ polarities: string; reconciliation: string; evidenceIds: string[] }>;
} {
  const groups = new Map<HumanDomain, InterpretedProposition[]>();
  for (const proposition of propositions) {
    const group = groups.get(proposition.domain) ?? [];
    group.push(proposition);
    groups.set(proposition.domain, group);
  }

  const order: HumanDomain[] = [
    "identity", "purpose_work", "autonomy_power", "resources_wealth",
    "relationships", "choices_obstacles", "family_home", "energy_wellbeing", "timing",
  ];

  const themes: SynthesizedTheme[] = [];
  const tensions: Array<{ polarities: string; reconciliation: string; evidenceIds: string[] }> = [];
  const citedAcrossReading = new Set<string>();

  for (const domain of order) {
    const group = groups.get(domain);
    if (!group?.length) continue;

    const ordered = [...group].sort((a, b) => weight(b) - weight(a));
    const leading = ordered[0];
    const supportive = ordered.filter(p => p.valence === "supportive");
    const difficult = ordered.filter(p => p.valence === "challenging" || p.valence === "transformative");
    const traditions = unique(ordered.map(p => p.tradition));
    const allEvidence = evidence(ordered);
    const combined = ordered.map(describe);

    // Pick at most MAX_PER_SIDE fresh placements per polarity, never citing the same placement twice across the reading
    const pickFresh = (items: InterpretedProposition[]): Array<{ item: InterpretedProposition; label: string }> => {
      const picked: Array<{ item: InterpretedProposition; label: string }> = [];
      const seenHere = new Set<string>();
      for (const item of items) {
        const label = plainPlacementLabel(item);
        const key = label.toLowerCase();
        if (seenHere.has(key) || citedAcrossReading.has(key)) continue;
        seenHere.add(key);
        citedAcrossReading.add(key);
        picked.push({ item, label });
        if (picked.length >= MAX_PER_SIDE) break;
      }
      return picked;
    };

    const fav = pickFresh(supportive);
    const chal = pickFresh(difficult);

    // Distinct techniques are presented as separate witnesses, not assumed
    // to independently validate one another simply by sharing a domain.
    const corroborationLevel: SynthesizedTheme["convergenceAssessment"]["corroborationLevel"] =
      traditions.length >= 2 ? "strong-corroboration"
      : ordered.length >= 2 ? "moderate-reinforcement" : "singular";

    // Group shared evidence once instead of repeating every pair of witnesses.
    const witnesses = new Map<string, InterpretedProposition[]>();
    for (const item of ordered) for (const id of item.supportingEvidenceIds) {
      const entries = witnesses.get(id) ?? [];
      entries.push(item);
      witnesses.set(id, entries);
    }
    const relationships = Array.from(witnesses.entries())
      .filter(([, items]) => items.length > 1)
      .map(([id, items]) => `${id} links ${unique(items.map(item => plainPlacementLabel(item))).join("; ")}. These share one calculated condition and are not independent confirmations.`);

    const opposing = supportive.length > 0 && difficult.length > 0;
    const favLabelText = fav.map(f => f.label).join(" and ");
    const chalLabelText = chal.map(c => c.label).join(" and ");

    const supportLine = fav.length
      ? `What supports you: ${summarizeInsight(fav[0].item)} (${favLabelText}).`
      : "";
    const frictionLine = chal.length
      ? `Where the friction is: ${summarizeInsight(chal[0].item)} (${chalLabelText}).`
      : "";

    const reconciliation =
      fav.length && chal.length
        ? `${supportLine} ${frictionLine}`
        : supportLine || frictionLine || summarizeInsight(leading);

    if (opposing && (fav.length > 0 || chal.length > 0)) {
      const polarityHeading =
        fav.length && chal.length
          ? `${DOMAIN_TITLES[domain]} (${favLabelText} vs. ${chalLabelText})`
          : `${DOMAIN_TITLES[domain]} (${favLabelText || chalLabelText})`;
      tensions.push({
        polarities: polarityHeading,
        reconciliation,
        evidenceIds: evidence([...fav.map(f => f.item), ...chal.map(c => c.item)]),
      });
    }

    const consequenceParts = [
      ...supportive.map(p => `Available strength — ${plainPlacementLabel(p)}: ${summarizeInsight(p)} Evidence: ${p.supportingEvidenceIds.join(", ")}`),
      ...difficult.map(p => `Pressure to manage — ${plainPlacementLabel(p)}: ${summarizeInsight(p)} Evidence: ${p.supportingEvidenceIds.join(", ")}`),
    ];
    if (!consequenceParts.length) consequenceParts.push(...ordered.map(p => `${p.plainLanguageMeaning} Evidence: ${p.supportingEvidenceIds.join(", ")}`));

    themes.push({
      id: `theme-${domain}`,
      humanTheme: DOMAIN_TITLES[domain],
      domain,
      primaryConclusion: `${plainPlacementLabel(leading)}: ${summarizeInsight(leading)}`,
      whyHow: [
        `Primary mechanism: ${leading.causalMechanism}.`,
        ...combined,
        ...relationships.map(r => `CROSS-METHOD CONNECTION: ${r}`),
      ].join("\n"),
      concreteManifestations: ordered.slice(0, 4).map(p =>
        `${plainPlacementLabel(p)}: ${p.plainLanguageMeaning} Evidence: ${p.supportingEvidenceIds.join(", ")}`
      ),
      consequences: consequenceParts.join("\n"),
      deeperMeaning: `Symbolic interpretation of ${DOMAIN_TITLES[domain]}: ${reconciliation}`,
      convergenceAssessment: {
        independentTraditions: traditions,
        corroborationLevel,
        tensions: opposing && reconciliation ? [reconciliation] : [],
        reconciliation,
      },
      linkedPropositionIds: ordered.map(p => p.id),
      evidenceIds: allEvidence,
    });
  }

  return { themes, tensions };
}
