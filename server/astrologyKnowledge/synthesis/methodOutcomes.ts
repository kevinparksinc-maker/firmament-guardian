import type { LayerRecord, UnifiedMasterChartSnapshot } from "../../masterChart/types";
import type {
  CanonRuleApplication,
  MethodOutcome,
  MethodOutcomeFinding,
} from "./types";

const METHOD_INTERPRETATIONS: Record<string, {
  meaning: string;
  judgment: string;
}> = {
  "western-planets-and-signs": {
    meaning: "Classical planetary placement rules establish the planet's sign-based agency and condition before houses and timing modify its expression.",
    judgment: "The sign and degree testimony is valid as a foundational disposition, not a complete life judgment by itself.",
  },
  "western-houses-and-angles": {
    meaning: "Hellenistic house and angle rules locate the calculated planetary testimony in concrete areas of life through the chart's local horizon.",
    judgment: "The house placement identifies where the testimony manifests; the local Ascendant and equal-house cusps are required for this judgment.",
  },
  "western-aspects-and-orbs": {
    meaning: "Ptolemaic aspect rules describe how the planets modify one another, with orb and aspect nature determining the force of the testimony.",
    judgment: "An aspect is judged only when its calculated orb is present; harmony and friction are retained as distinct testimony.",
  },
  "western-essential-dignities": {
    meaning: "Essential dignity rules assess whether a planet can act according to its nature through domicile, exaltation, or peregrine condition.",
    judgment: "Dignity changes the planet's ability to deliver its promise; it does not replace accidental or house strength.",
  },
  "fixed-stars-royal-watchers": {
    meaning: "The fixed-star layer applies the recorded Royal Watcher contact rules in the God View firmament frame.",
    judgment: "Only the calculated star contacts carry a judgment; unactivated stars remain background reference and cannot be promoted.",
  },
  "arabic-hermetic-lots": {
    meaning: "Hermetic Lot rules derive specific life topics from the chart's validated day/night formula and place them in the Agent View house frame.",
    judgment: "The Lot testimony describes the relevant topic's mode of arrival and agency, subject to the calculated formula and house.",
  },
  "arabic-lunar-manazil": {
    meaning: "Arabic Manzil rules assign each calculated longitude to a lunar station with its recorded quality and psychological or operational meaning.",
    judgment: "The Manzil modifies the planet's expression as a fine-grained lunar condition; it must be read with, not instead of, the planet and house.",
  },
  "vedic-nakshatras-and-padas": {
    meaning: "Vedic Nakshatra and Pada rules assign the calculated longitude to an asterism, deity, Shakti, motivation, and quarter-level expression.",
    judgment: "The Nakshatra supplies the planet's patterned motivation and the Pada refines its mode; no sidereal conversion or missing Pada is invented.",
  },
  "vedic-vargas-divisional": {
    meaning: "Parashari divisional rules derive the recorded D1, D2, D3, D9, and D10 placements from the same authoritative natal longitudes.",
    judgment: "A varga modifies the relevant life topic only through its recorded division, formula, and placement; it is not an independent astronomical chart.",
  },
  "vedic-dasha-and-ashtakavarga": {
    meaning: "The Vedic timing layer applies its validated Dasha sequence and Ashtakavarga checksums to identify activation and planetary support.",
    judgment: "Timing is issued only when the Dasha or bindu calculation passes its validation rules; failed checks produce no inferred timing.",
  },
  "vedic-graha-drishti": {
    meaning: "Parashari Graha Drishti rules apply the universal seventh aspect and the recorded Mars, Jupiter, and Saturn special aspects.",
    judgment: "The aspect modifies the target sign or house according to the calculated offset and is not conflated with Western aspect geometry.",
  },
  "chinese-lunar-mansions-xiu": {
    meaning: "The Chinese Xiu catalog is preserved as historical reference because the required ancient sector boundaries are not calculated for personal placement.",
    judgment: "No personal Xiu judgment is issued from this reference-only layer.",
  },
  "elemental-decans": {
    meaning: "The decan layer applies the recorded 10-degree face and elemental-family ruler to refine each planetary expression.",
    judgment: "The decan is a modifying character trait and must be reconciled with dignity, house, aspect, and the other calculated testimony.",
  },
  "kabbalah-sefer-yetzirah": {
    meaning: "Sefer Yetzirah correspondences apply the recorded planetary gates and contrary pairs to describe the constructive and difficult poles of the configuration.",
    judgment: "The Kabbalistic outcome identifies a polarity to be consciously directed; it does not create a placement absent from the calculation.",
  },
  "genesis-behavioral-patterns": {
    meaning: "The Genesis behavioral engine applies its recorded pattern and Yoga analysis to the validated planetary, house, and aspect inputs.",
    judgment: "Only the returned pattern analysis is judged; an absent or failed engine result is not replaced with personality prose.",
  },
  "transit-activation-layer": {
    meaning: "The transit layer applies the calculated event-to-natal contacts, orbs, flow, intensity, and strength to the natal foundation.",
    judgment: "The event testimony describes what is active now and must remain separate from natal disposition and from event-chart house claims.",
  },
};

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function findingsForLayer(layer: LayerRecord, prefix = ""): MethodOutcomeFinding[] {
  const raw = layer.results;
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return values.map((value, index) => ({
    evidenceId: `${prefix}${layer.evidenceIds[index] ?? layer.evidenceIds[0] ?? layer.id}`,
    label: `${layer.name} finding ${index + 1}`,
    calculatedValue: renderValue(value),
  }));
}

function canonForLayer(
  layer: LayerRecord,
  canonApplications: CanonRuleApplication[],
  prefix = "",
): CanonRuleApplication[] {
  const ids = new Set(layer.evidenceIds.map(id => `${prefix}${id}`));
  return canonApplications.filter(application =>
    application.calculationEvidenceIds.some(id => ids.has(id)),
  );
}

function calculatedJudgment(
  layer: LayerRecord,
  findings: MethodOutcomeFinding[],
  applications: CanonRuleApplication[],
): string {
  const values = findings.map(f => f.calculatedValue).join(" | ");
  const ruleIds = applications.map(application => application.ruleId).join(", ");
  switch (layer.id) {
    case "western-aspects-and-orbs": {
      const friction = findings.filter(f => /friction|square|opposition/i.test(f.calculatedValue)).length;
      const harmony = findings.length - friction;
      return `Rule judgment [${ruleIds}]: ${findings.length} measured aspect contact(s), ${harmony} harmonious and ${friction} frictional by the calculated aspect nature; the strongest conclusion remains conditional on the recorded orb. Findings: ${values}`;
    }
    case "western-essential-dignities": {
      const dignified = findings.filter(f => /Domicile|Exaltation/i.test(f.calculatedValue)).length;
      return `Rule judgment [${ruleIds}]: ${dignified} of ${findings.length} calculated planetary placements have domicile or exaltation status; the remaining placements are treated as peregrine for essential dignity. Findings: ${values}`;
    }
    case "arabic-hermetic-lots":
      return `Rule judgment [${ruleIds}]: ${findings.length} sect-derived Lot placement(s) are available in the local Agent frame; their topic contribution is read through the recorded Lot house and formula. Findings: ${values}`;
    case "vedic-vargas-divisional":
      return `Rule judgment [${ruleIds}]: ${findings.length} calculated divisional placement record(s) qualify the natal promise; the explicit coordinate variant and division are retained as limitations. Findings: ${values}`;
    case "vedic-dasha-and-ashtakavarga":
      return `Rule judgment [${ruleIds}]: the Vedic timing layer contributes only the validated Dasha and Ashtakavarga records present in the findings; no missing period or checksum is inferred. Findings: ${values}`;
    case "vedic-graha-drishti":
      return `Rule judgment [${ruleIds}]: ${findings.length} calculated Graha Drishti relationship(s) are judged by their recorded seventh or special offset, not by Western aspect geometry. Findings: ${values}`;
    case "kabbalah-sefer-yetzirah":
      return `Rule judgment [${ruleIds}]: ${findings.length} recorded Sefer Yetzirah correspondence(s) qualify the chart's constructive/contrary polarity; this symbolic layer does not override calculated placement testimony. Findings: ${values}`;
    case "genesis-behavioral-patterns":
      return `Rule judgment [${ruleIds}]: the Genesis engine returned ${findings.length} validated pattern record(s); only those calculated patterns contribute, with no substitute personality narrative. Findings: ${values}`;
    case "transit-activation-layer":
      return `Rule judgment [${ruleIds}]: ${findings.length} calculated transit-to-natal activation(s) are active; each is limited to its recorded orb, intensity, and polarity. Findings: ${values}`;
    default:
      return `${applications.length ? `Rule judgment [${ruleIds}]` : "Calculated judgment"}: ${findings.length} finding(s) were evaluated against the applicable Canon record. Findings: ${values}`;
  }
}

function outcomeForLayer(
  layer: LayerRecord,
  snapshot: UnifiedMasterChartSnapshot,
  canonApplications: CanonRuleApplication[],
  prefix = "",
): MethodOutcome {
  const event = prefix === "transit:" || layer.id === "transit-activation-layer" || layer.id.startsWith("transit:");
  const calculatedFindings = findingsForLayer(layer, prefix);
  const applications = canonForLayer(layer, canonApplications, prefix);
  const template = METHOD_INTERPRETATIONS[layer.id.replace(/^transit:/, "")] ?? {
    meaning: "This method's calculated result must be interpreted through its registered traditional rules and recorded evidence.",
    judgment: "No unrecorded judgment is permitted when the method's rule coverage is incomplete.",
  };
  const limitations: string[] = [];
  if (layer.notes) limitations.push(layer.notes);
  if (layer.frame === "god") limitations.push("God View frame: no local houses are inferred for a location-free cosmic chart.");
  if (layer.frame === "agent" && !snapshot.baseCelestialState.ascendant) limitations.push("Agent View house judgment unavailable because no local Ascendant was calculated.");
  if (!applications.length && layer.status === "computed-with-result") limitations.push("No applicable Canon rule was matched to this method's calculated evidence; traditional judgment is incomplete.");

  if (layer.status === "reference-only") {
    return {
      methodId: layer.id,
      methodName: layer.name,
      tradition: layer.tradition,
      chartScope: event ? "event" : "natal",
      frame: layer.frame === "transit" ? "transit" : layer.frame === "god" ? "god" : layer.frame === "agent" ? "agent" : "shared",
      status: "reference-only",
      calculatedFindings,
      canonApplications: applications,
      interpretation: template.meaning,
      judgment: template.judgment,
      contribution: "Reference context only; it does not contribute a personal method judgment.",
      evidenceIds: calculatedFindings.map(f => f.evidenceId),
      strengthAndLimitations: limitations,
      missingCanon: false,
    };
  }
  if (layer.status === "not-applicable") {
    return {
      methodId: layer.id,
      methodName: layer.name,
      tradition: layer.tradition,
      chartScope: event ? "event" : "natal",
      frame: "transit",
      status: "not-applicable",
      calculatedFindings: [],
      canonApplications: [],
      interpretation: "This method is not applicable to the requested chart scope.",
      judgment: "No judgment is issued.",
      contribution: "No contribution for this chart scope.",
      evidenceIds: [],
      strengthAndLimitations: [layer.notes ?? "Method not applicable."],
      missingCanon: false,
    };
  }
  if (layer.status === "failed" || layer.status === "not-implemented" || layer.status === "computed-no-result") {
    const reason = layer.notes ?? layer.errorCode ?? "No valid calculated result was returned.";
    return {
      methodId: layer.id,
      methodName: layer.name,
      tradition: layer.tradition,
      chartScope: event ? "event" : "natal",
      frame: layer.frame === "transit" ? "transit" : layer.frame === "god" ? "god" : layer.frame === "agent" ? "agent" : "shared",
      status: "failed",
      calculatedFindings,
      canonApplications: applications,
      interpretation: "No method-specific interpretation is issued because the calculation did not return a valid result.",
      judgment: "No traditional judgment is issued.",
      contribution: "This method contributes an explicit unavailable status, not an inferred meaning.",
      evidenceIds: calculatedFindings.map(f => f.evidenceId),
      strengthAndLimitations: [reason],
      missingCanon: false,
    };
  }

  const findingText = calculatedFindings.map(f => `${f.label}: ${f.calculatedValue}`).join(" | ");
  const canonText = applications.map(application => `[${application.ruleId}] ${application.statement}`).join(" ");
  const missingCanon = applications.length === 0;
  const judgment = calculatedJudgment(layer, calculatedFindings, applications);
  return {
    methodId: layer.id,
    methodName: layer.name,
    tradition: layer.tradition,
    chartScope: event ? "event" : "natal",
    frame: layer.frame === "transit" ? "transit" : layer.frame === "god" ? "god" : layer.frame === "agent" ? "agent" : "shared",
    status: missingCanon ? "failed" : "interpreted",
    calculatedFindings,
    canonApplications: applications,
    interpretation: `${template.meaning} Actual calculation: ${findingText || "no finding records"} Canon applied: ${canonText || "NONE — required traditional rule coverage is missing"}`,
    judgment: missingCanon ? "No traditional judgment issued because the applicable Canon rule is missing." : judgment,
    contribution: missingCanon ? "The method is withheld from the authoritative synthesis until its Canon coverage is supplied." : `This ${layer.tradition} method contributes its calculated testimony to the cross-method synthesis without replacing other methods.`,
    evidenceIds: calculatedFindings.map(f => f.evidenceId),
    strengthAndLimitations: limitations,
    missingCanon,
  };
}

export function buildMethodOutcomes(
  snapshot: UnifiedMasterChartSnapshot,
  canonApplications: CanonRuleApplication[],
): MethodOutcome[] {
  return snapshot.methodExecutionLedger.map(layer => outcomeForLayer(layer, snapshot, canonApplications));
}
