# The Absolute interpretation pipeline migration

The source is `the-absolute-astrology-2026-11-16.zip`. Its SHA-256 is `5809b27b6e822b4058455477899fe54255ec112d32e424bb481c5fe1d3edb88f`.

## Architecture

The existing Master Chart and Canon bridge verify the chart, form the method execution ledger, attach Canon rule applications, and produce cross-method synthesis. The new `interpretationPipeline.ts` takes that synthesis, packages its evidence, calls the configured provider, and rejects empty or prematurely stopped responses. Route adapters supply their own calculated evidence and validate their own response formats. The placement route uses the original packet, adapters, compact chart context, prompts, and provider settings through the shared handoff.

Ordinary requests carry the full calculation rows, per-finding judgments, Canon references, convergences, tensions, timing, and explicit availability statuses. The combined fixture delivered 19 base methods and 19 separately identified event methods. The named placement keeps the reference transport for its exact target, including the full method registry and the placement-specific adapter outcomes. Cross-chart comparison supplies both natal ledgers plus independently calculated cross-chart contacts and house overlays. Calculations, traditional Canon and technical evidence remain available.

## Before and after

| Reading pathway | Before | After |
| --- | --- | --- |
| Profile Home precision placement | Gold-standard placement orchestrator called the provider directly | Same provider request through the shared handoff. Both paragraphs are required. |
| My Chart natal, transit and combined minis | Compact placement packets and canned replacement paragraphs | Placement packets plus complete applicable ledger. Validated batch, evidence IDs and layer IDs. |
| Planet Persona Matrix People Talk and drawer | Local personality copy and advice | Focused placement synthesis on selection. Matrix columns and expandable Canon evidence remain. |
| Individual method minis | A partly filled batch could be cached and the UI showed deterministic outcomes as the main prose | Shared provider handoff. The complete batch of distinct mini readings appears above the calculation evidence. |
| Full natal, transit and combined interpretation | Master reading with deterministic substitution and separate chapter planning | Both the structured chapter plan and final narrative use the canonical evidence handoff. |
| Master Synthesizer | Master narrator could substitute deterministic Story Mode | Shared handoff from either a verified chart or a server-built snapshot. |
| Audio/chart briefing | Could inherit master fallback prose | Briefing sections come from the same validated master narrative. |
| Focused placements, stars and contacts | Canon evidence and direct mini generator | Full shared method ledger plus target evidence. Canon records appear under evidence. |
| Energy Read overview | Separate provider call and empty-contact canned answer | Shared synthesis at the selected moment, including available evidence when there are zero scored contacts. |
| Energy contact expansion, map and aspect cards | Local dialogue template produced final text | Focused transit contact synthesis. Charts, filters, aspect weights and calculations remain. |
| 24-hour Energy Read timeline | Local dialogue applied to a future sample | Focused contact reading uses the actual sampled moment. |
| Horary opening | Optional Master evidence and deterministic final fallback | Canonical method ledger plus authoritative traditional horary evidence. On failure the chart and calculated verdict are still returned with `ai_unavailable`. |
| Horary follow-up | Direct provider call with generic fallback | Anchored to the original chart and traditional evidence through the shared handoff. |
| Zodiac sign sky | Provider call could substitute generic sign reading | Shared method ledger and ruler-anchored sign evidence. |
| Full interpretation chapter and follow-up | Separate direct provider calls | Shared handoff with the same chart and question, with chapter or thread constraints. |
| Life Story chapter | Independent AI call and fixed unavailable string | Shared handoff with the selected age, profection, calculated cycles and chapter presentation. |
| Chart companion and chart-backed Host | Separate context construction, with canned companion prose on failure | Shared canonical chart evidence and preserved conversation turns. |
| Chart QA and transit QA | Placement text sent straight to the provider | Verified `chart` payload and canonical Host reading. |
| Relationship potential | Natal placement string sent directly to the provider | Full natal method ledger and validated relationship portrait. |
| Synastry and Social System Intersect | String-based synastry or deterministic cross-chart report | Shared narrative from each natal ledger plus cross-chart calculations. |
| Social loved-one check-in | Hardcoded personal status, guidance and suggested message | Shared transit synthesis, the existing calculated triggers and a validated draft. |
| Genesis | Independent deterministic reading engine | Genesis pattern calculations feed the shared method ledger and the original layered reading format. |
| Behavioral report | Structured deterministic model and evidence | Shared narrative leads the report. The structured behaviors, polarities and evidence remain available. |
| Simulation Lab prediction | Separate model call over contest evidence | Shared event ledger plus contest scoring, evidence IDs and server-side verdict validation. |

Chartless Host help stays a general conversation. Horary question classification is a routing step. Raw chart formation, forecast sampling, compatibility scores, Persona Matrix columns, Canon mappings, developer evidence diagnostics, divisional charts and timing tables remain calculation or evidence surfaces. None supplies fallback final prose.

## Removed or rewired bypasses

- `generatePlacementParagraphs` no longer builds `driveLine` and `balanceLine` after provider errors.
- `narrateMasterSynthesis` no longer calls `buildDeterministicMasterStory` or uses calculated narrative as replacement prose.
- `deterministicHoraryReading` and `masterHoraryFollowUp` were removed from the Horary module. The traditional horary calculations remain.
- `buildDeterministicCompanionAnswer`, the Zodiac deterministic reader, and the unused executive overview and Life Story chapter fallback were removed from the migrated route modules.
- `generateReading` in the legacy Genesis module and `buildDeepDeterministicMasterStory` remain as legacy code. Active readings no longer call them.
- `getHumanDialogue` and browser-side personality translations no longer supply the Energy Read or People Talk interpretations. Existing Canon and evidence helpers remain.
- Chart QA, transit QA, relationship potential and AI synastry now require calculated chart payloads. Integrations that used only placement strings must pass the actual chart objects.
- Failed or partial batches are evicted. The browser reading-cache version changed so earlier substitute results are not reused.

## Reader-facing pathway audit

The follow-up audit traced the browser actions in the shipped app, including the older Guide screens that reuse specialist components.

| Screen or action | Evidence now sent to the shared pipeline |
| --- | --- |
| Synastry Studio overview, relationship playbook and individual cross-aspect | Both verified chart ledgers in the visible Person A/B order, the full cross-aspect and house-overlay calculation used by the Studio, and the verified selected contact for a focused read. |
| Independent Transit Sky overview and individual contact | One event chart calculated for the selected place and instant, with its independent body-to-body score and selected contact. Locally listed contacts remain visible if synthesis is unavailable. |
| Energy barometer | The existing Energy synthesis receives the collective score derived from the current transit bodies alongside the personal score. The barometer presents calculated evidence without issuing a second set of fixed advice paragraphs. |
| 39-day Transit Weather consultation | The actual selected day's transit chart, with its verified instant. The daily 24-hour contact timeline retains its existing exact-time focused reading. |
| Loved Ones consultation | The selected loved one's calculated chart and relationship context. |
| Floating AI guide on specialist pages | General help. Each specialist page's reading controls send its own selected chart or chart pair. |

The reference placement request and the established calculation geometry are preserved. The audit added route tests for selected synastry and event-sky contacts, rejection of uncalculated contacts, forecast timing, and the transit-only input to the collective score.

## Release verification

- Original ZIP baseline on the installed dependencies: **365 tests passed across 72 files**.
- Migrated application full suite: **404 tests passed across 74 files**, including 35 cases in the tRPC pathway suite and three reference-placement checks.
- TypeScript checking, production bundling, frozen pnpm lockfile verification, and production HTTP smoke checks for `/` and `/healthz` passed.
- Captured original and migrated provider requests for the same Sun natal and Moon combined fixtures. The requests and returned placement objects matched byte-for-byte with the same mocked provider text. This covers the evidence packet, prompts, 900-token budget, 60-second timeout and output transformation. The third reference test rejects a one-paragraph provider response.
- The routing tests exercised the real tRPC procedures with calculated charts and verified the ledgers reaching the provider adapter. Other tests covered complete outputs, failed-response propagation, partial and duplicate prevention, retry behavior and preservation of chart geometry and method calculations.

### Verification limits

No live AI key was available. Live prose quality, latency, quota and context acceptance remain unverified. The complete canonical dossier was about 0.6 MB for the natal fixture and 1.2 MB for the combined fixture before route-specific evidence. Providers with smaller input limits can reject those requests. The application reports that failure and does not substitute a generic interpretation. The original placement route keeps its smaller reference request.

The build emitted a frontend chunk-size warning. There were no test, type-check or build failures in the final checks. The production smoke test exercised startup and static serving without an authenticated account.
