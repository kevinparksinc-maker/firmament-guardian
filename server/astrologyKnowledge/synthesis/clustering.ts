import type {
  HumanDomain,
  InterpretedProposition,
  SynthesizedTheme,
} from "./types";

const DOMAIN_METADATA: Record<
  HumanDomain,
  {
    title: string;
    coreQuestion: string;
    lifeSpheres: string[];
  }
> = {
  identity: {
    title: "Core Identity, Vitality & Self-Orientation",
    coreQuestion: "Who are you at the foundational level, and how do you meet the world?",
    lifeSpheres: ["Embodiment", "Instinctual Reactions", "Personal Horizon", "Inner Temperament"],
  },
  purpose_work: {
    title: "Calling, Conscious Purpose & Public Vocation",
    coreQuestion: "What is your primary contribution and where does intentional agency build?",
    lifeSpheres: ["Craft & Mastery", "Public Vocation", "Solar Initiative", "Long-Term Legacy"],
  },
  relationships: {
    title: "Partnerships, Relational Reciprocity & Alliances",
    coreQuestion: "How do you form deep mutual bonds and navigate the mirrors of intimacy?",
    lifeSpheres: ["Contractual Bonds", "Heart Magnetic Desires", "Alliances", "Reciprocity"],
  },
  resources_wealth: {
    title: "Tangible Resources, Wealth & Material Sustenance",
    coreQuestion: "How do material providence and practical self-sufficiency manifest?",
    lifeSpheres: ["Financial Discipline", "Providential Luck", "Concrete Assets", "Stewardship"],
  },
  family_home: {
    title: "Ancestry, Domestic Roots & Emotional Sanctuary",
    coreQuestion: "Where do you rest, recharge, and honor foundational roots?",
    lifeSpheres: ["Domestic Peace", "Ancestral Inheritance", "Private Sanctuary", "Vulnerability"],
  },
  autonomy_power: {
    title: "Executive Agency, Courage & Sovereign Boundaries",
    coreQuestion: "How do you assert power, defend boundaries, and lead without tyranny?",
    lifeSpheres: ["Decisive Action", "Courage Under Pressure", "Ethical Leadership", "Defensive Strength"],
  },
  energy_wellbeing: {
    title: "Physical Rhythm, Resilience & Energetic Flow",
    coreQuestion: "How do somatic health, daily habits, and vitality renew themselves?",
    lifeSpheres: ["Nervous System Equilibrium", "Habitual Routines", "Vitality", "Endurance"],
  },
  choices_obstacles: {
    title: "Karmic Tests, Reality Boundaries & Character Maturation",
    coreQuestion: "What resistance refines your character, and where must patience rule?",
    lifeSpheres: ["Saturnian Reckoning", "Patience Under Delay", "Ethical Integrity", "Self-Correction"],
  },
  timing: {
    title: "Dynamic Windows, Active Transits & Turning Points",
    coreQuestion: "What forces are active right now, and what season of development is this?",
    lifeSpheres: ["Current Transit Weather", "Culminations", "Onset & Easing", "Strategic Timing"],
  },
};

export function clusterPropositionsIntoThemes(
  propositions: InterpretedProposition[]
): {
  themes: SynthesizedTheme[];
  tensions: Array<{ polarities: string; reconciliation: string; evidenceIds: string[] }>;
} {
  const domainGroups = new Map<HumanDomain, InterpretedProposition[]>();

  for (const prop of propositions) {
    // Ledger coverage is evidence bookkeeping, not an independent interpretation.
    // Keep it out of domain themes and corroboration scoring.
    if (prop.id.startsWith("prop-method-ledger-")) continue;
    const list = domainGroups.get(prop.domain) ?? [];
    list.push(prop);
    domainGroups.set(prop.domain, list);
  }

  const themes: SynthesizedTheme[] = [];
  const tensions: Array<{ polarities: string; reconciliation: string; evidenceIds: string[] }> = [];

  for (const [domain, props] of Array.from(domainGroups.entries())) {
    if (props.length === 0) continue;

    const meta = DOMAIN_METADATA[domain];
    const traditions: string[] = Array.from(
      new Set<string>(props.map((p: InterpretedProposition) => p.tradition))
    );
    const allEvidenceIds: string[] = Array.from(
      new Set<string>(props.flatMap((p: InterpretedProposition) => p.supportingEvidenceIds))
    );
    const allPropIds = props.map((p: InterpretedProposition) => p.id);

    // Corroboration level calculation
    let corroborationLevel: SynthesizedTheme["convergenceAssessment"]["corroborationLevel"] = "singular";
    if (traditions.length >= 3) {
      corroborationLevel = "strong-corroboration";
    } else if (traditions.length === 2) {
      corroborationLevel = "strong-corroboration";
    } else if (props.length > 1) {
      corroborationLevel = "moderate-reinforcement";
    }

    // Detect tensions within domain or cross-domain (e.g. supportive vs challenging)
    const supportive = props.filter((p: InterpretedProposition) => p.valence === "supportive");
    const challenging = props.filter((p: InterpretedProposition) => p.valence === "challenging" || p.valence === "transformative");

    let reconciliationText = `The chart harmonizes ${props.map((p: InterpretedProposition) => p.causalMechanism).join(" and ")} through balanced awareness.`;
    if (supportive.length > 0 && challenging.length > 0) {
      const tensionPolarity = `${supportive[0].themeTitle} (Expansion/Grace) vs. ${challenging[0].themeTitle} (Discipline/Friction)`;
      reconciliationText = `The expansive impulse of ${supportive[0].causalMechanism} is anchored and protected by the rigorous limits of ${challenging[0].causalMechanism}. Neither overrides the other: growth is safeguarded by strict boundary discipline.`;
      tensions.push({
        polarities: tensionPolarity,
        reconciliation: reconciliationText,
        evidenceIds: Array.from(new Set([...supportive[0].supportingEvidenceIds, ...challenging[0].supportingEvidenceIds])),
      });
    }

    // Build synthesized explanation (WHAT, WHY, HOW, CONSEQUENCE, MEANING)
    const interpreted = props.filter(p => !p.id.endsWith("-remaining"));
    const strongest = interpreted.find(p => p.strength === "dominant") ?? interpreted.find(p => p.strength === "strong") ?? interpreted[0] ?? props[0];
    const primaryConclusion = strongest.plainLanguageMeaning;
    // Include the ACTUAL finding text from each computed doctrine, not just a label
    // that says the doctrine was evaluated. Every computed proposition participates.
    const whyHow = interpreted.map(p => `[${p.tradition} / ${p.frame}] ${p.plainLanguageMeaning} (mechanism: ${p.causalMechanism}; evidence: ${p.supportingEvidenceIds.join(", ")})`).join("\\n");
    const concreteManifestations = interpreted.filter(p => p.supportingEvidenceIds.length > 0).slice(0, 4).map(p =>
      p.themeTitle + ": " + p.plainLanguageMeaning + " (evidence: " + p.supportingEvidenceIds.join(", ") + ")"
    );
    const consequences = `Evidence: ${strongest.plainLanguageMeaning}. No specific life outcome is established by this calculation alone.`;
    const deeperMeaning = `Symbolic interpretation of ${strongest.themeTitle}: ${strongest.plainLanguageMeaning}. This is interpretive meaning, not a separately calculated event.`;

    themes.push({
      id: `theme-${domain}`,
      humanTheme: meta.title,
      domain,
      primaryConclusion,
      whyHow,
      concreteManifestations,
      consequences,
      deeperMeaning,
      convergenceAssessment: {
        independentTraditions: traditions,
        corroborationLevel,
        tensions: supportive.length > 0 && challenging.length > 0 ? [reconciliationText] : [],
        reconciliation: reconciliationText,
      },
      linkedPropositionIds: allPropIds,
      evidenceIds: allEvidenceIds,
    });
  }

  // Sort themes by priority: identity & purpose first, then resources, autonomy, choices, timing
  const order: HumanDomain[] = [
    "identity",
    "purpose_work",
    "autonomy_power",
    "resources_wealth",
    "relationships",
    "choices_obstacles",
    "family_home",
    "energy_wellbeing",
    "timing",
  ];

  themes.sort((a, b) => order.indexOf(a.domain) - order.indexOf(b.domain));

  return { themes, tensions };
}
