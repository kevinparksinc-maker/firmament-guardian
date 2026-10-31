# Calculation transparency UI integration

Branch: feature/calculation-transparency-ui. Based on the **isolated experimental** feature/spica-calculation-evidence-spec branch, NOT production main.

## Implemented
- Typed reusable evidence drawer for any existing evidence item, including planetary positions, house cusps, aspects and fixed-star positions when present.
- Calculation Certificate component with two explicit exports. Public summary uses an allowlist and excludes ALL per-object traces, dates, timestamps, coordinates, and canonical inputs. Private export contains the full envelope and warns of sensitivity.
- Component CSS with mobile-width handling and keyboard focus.

## Integration
Import from client/src/components/calculation-transparency. Render <EvidenceById envelope={chart?.calculationEvidence} objectId="natal:Sun" /> where the API already provides the envelope. For house 1: natal:house-cusp-1. For transit contacts: contact:<transit>:<aspect>:<natal>. Inspect actual ChartResult property before wiring; do not assume name. Render <CalculationCertificate envelope={...} /> only in an authenticated private chart context.

## Outstanding, not claimed complete
- Wire the components into active chart, Energy Read, and other screens and verify actual envelope property and access boundaries.
- Add server traces for energy weights/totals and mansion/decan/fixed-star **contacts**; current envelope has raw positions, house cusps, major-aspect contacts and static fixed-star positions but not all requested categories.
- Build full public sharing flow only after privacy/security review. Current public export is deliberately minimal and does not include reproducibilityId (which fingerprints private inputs).
- Run TypeScript/tests, mobile and desktop screenshots, and real profile regression checks.
- Resolve Spica catalog discrepancy and experimental angle mapping separately. Never promote Spica into production without approval.

## Safety
Do not pass private envelope to public pages. Public certificate is not a signed proof or independent validation. The experimental branch is not authorized for production merge.
