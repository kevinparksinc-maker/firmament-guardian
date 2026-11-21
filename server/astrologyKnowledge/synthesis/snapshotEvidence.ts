import type { UnifiedMasterChartSnapshot } from "../../masterChart/types";
import {
  canonDossierToEvidenceItems,
  retrieveChartCanonDossier,
} from "../canon/retriever";
import { buildCanonRuleApplications } from "./canonApplications";
import { synthesizeMasterReading } from "./synthesizer";

/** Server-created snapshots enter here directly: no second ephemeris pass. */
export async function synthesizeSnapshotEvidence(
  snapshot: UnifiedMasterChartSnapshot,
  mode: "natal" | "transit" | "combined",
  question: string
) {
  // The Master Chart remains the only calculation source. Its canonical natal
  // ChartResult is passed to the existing deterministic retriever; no second
  // astronomical calculation or alternate house/frame pipeline is introduced.
  const canonicalChart = snapshot.natal;
  if (!canonicalChart)
    throw new Error("MASTER_CHART_MISSING: Snapshot has no canonical chart.");
  const canonDossier = retrieveChartCanonDossier(canonicalChart);
  const canonEvidence = canonDossierToEvidenceItems(canonDossier);
  const canonApplications = buildCanonRuleApplications(snapshot, canonEvidence);
  // The same registry is evaluated for each sky. Namespace event evidence so
  // Saturn's present mansion can never be mistaken for natal Saturn's mansion.
  const event = snapshot.transit?.framework;
  const eventLayers =
    event?.methodExecutionLedger.map(layer => ({
      ...layer,
      id: `transit:${layer.id}`,
      name: `Current sky · ${layer.name}`,
      frame: layer.frame,
      evidenceIds: layer.evidenceIds.map(id => `transit:${id}`),
      prerequisites: layer.prerequisites.map(id => `transit:${id}`),
    })) ?? [];
  if (event?.natal) {
    const applications = buildCanonRuleApplications(
      event,
      canonDossierToEvidenceItems(retrieveChartCanonDossier(event.natal))
    );
    canonApplications.push(
      ...applications.map(application => ({
        ...application,
        canonEvidenceId: `transit:${application.canonEvidenceId}`,
        subject: `Current sky ${application.subject}`,
        calculationEvidenceIds: application.calculationEvidenceIds.map(
          id => `transit:${id}`
        ),
      }))
    );
  }
  const synthesisSnapshot = {
    ...snapshot,
    layers: {
      ...snapshot.layers,
      ...Object.fromEntries(eventLayers.map(layer => [layer.id, layer])),
    },
    methodExecutionLedger: [...snapshot.methodExecutionLedger, ...eventLayers],
  };
  const synthesis = await synthesizeMasterReading({
    snapshot: synthesisSnapshot,
    readingMode: mode,
    userQuestion: question,
    canonApplications,
  });
  if (!synthesis.qualityAudit.passed) {
    console.warn(
      "[SYNTHESIS_THEME_COVERAGE] Rule-based theme coverage is incomplete; forwarding all calculated results to the AI:",
      synthesis.qualityAudit.unsupportedClaims
    );
  }
  return { snapshot, synthesis, canonicalChart };
}
