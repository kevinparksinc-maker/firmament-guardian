# The Absolute — Reading & User-Output Dependency Map

> **Change-control contract.** Read this before modifying any calculation, Canon doctrine, synthesis, interpretation, API response, chart visualization, reading page, or shared type. Update this map **in the same PR** as the change. A successful build is necessary but does not prove that a reading is coherent.
>
> **Scope:** Verified source paths on branch `fix/synthesis-authoritative-reading` as of 2026-11-03. This is a **verified core inventory**, not yet a claim that every route and output component in the repository has been enumerated. Add newly discovered output producers; do not silently treat this map as exhaustive.

## 1. One dependency chain

```text
User data / question / reading mode
  -> server/astronomy.ts (chart facts, where applicable)
  -> server/masterChart/builder.ts (authoritative snapshot + method execution ledger)
  -> server/astrologyKnowledge/canon/retriever.ts (EXISTING full-chart Canon dossier)
     -> Canon modules: signs, planets, houses, dignities, decans, mansions,
        stars, lots, traditional techniques, timing, provenance
  -> server/astrologyKnowledge/synthesis/normalizer.ts (evidence-linked propositions)
  -> server/astrologyKnowledge/synthesis/clustering.ts (themes + tensions)
  -> server/astrologyKnowledge/synthesis/synthesizer.ts (master reading + quality audit)
  -> server/astrologyKnowledge/synthesis/readingBridge.ts (chart/snapshot consistency)
  -> server/routers.ts (tRPC contracts; mode-specific routes)
  -> client output pages/components (reading, chart, evidence, chapters, forecasts)
```

**Important current-state qualification:** This is the **target mandatory order**, not a claim that the full-chart Canon dossier is already wired into `readingBridge.ts`. The bridge currently builds/validates a snapshot and calls `synthesizeMasterReading`; the normalizer currently performs selected direct Canon lookups. Full dossier integration is **OPEN**. Do not claim Canon-first across all routes until it is wired and tested.

**Hard rules:** calculations remain authoritative; Canon doctrine is locally retrieved and source-tagged; no AI-generated planet position, aspect, house, or evidence ID; only computed methods may be described as computed; preserve God/Agent frame distinction; avoid duplicate snapshot calculation, Canon retrieval, synthesis, or AI calls per chapter.

## 2. Source-of-truth and output-producer register

| Source file | Produces / controls | Downstream dependencies to inspect when changed |
| --- | --- | --- |
| `server/astronomy.ts` | Planet positions, chart and transit inputs | masterChart builder, Canon retriever, synthesis bridge, tRPC chart routes, ChartWheel, forecast, reading, tests |
| `server/masterChart/builder.ts` | Master snapshot, 16-method layer records, evidence IDs, God/Agent positions, aspects | normalizer, synthesizer, readingBridge, tRPC, Reading Center, Simulation Lab, method-coverage tests |
| `server/masterChart/types.ts` | Snapshot, layer and frame contracts | builder, normalizer, synthesizer, tRPC responses, client display types |
| `server/astrologyKnowledge/canon/retriever.ts` | **Existing full-chart Canon dossier**; placement doctrine, sect, conditions, traditional methods, text and evidence | normalizer, readingBridge, synthesis context, provenance tests, all reading routes |
| `server/astrologyKnowledge/canon/types.ts` | Canon records, provenance and dossier types | all Canon modules, retriever, evidence bridge, client evidence displays |
| `server/astrologyKnowledge/canon/planetsAndSigns.ts` | Planet/sign doctrine, planetary functions, sign synthesis | retriever, normalizer, chart and reading interpretation, aspect synthesis |
| `server/astrologyKnowledge/canon/housesAndFrames.ts` | House meanings, planetary joy, God-to-Agent translation | retriever, normalizer, house interpretation, charts and reading |
| `server/astrologyKnowledge/canon/planetInHouseInterpretations.ts` | Expanded planet-in-house meanings and cautions | retriever, synthesized placement narrative, evidence UI |
| `server/astrologyKnowledge/canon/dignitiesAndHorary.ts` | Dignities, sect, horary/traditional mechanisms | retriever, horary, natal, timing and synthesis |
| `server/astrologyKnowledge/canon/decans36.ts` | Decan boundaries and interpretations | builder, retriever, normalizer, mansion/decan display, reading |
| `server/astrologyKnowledge/canon/manazil28.ts` | Arabic mansion doctrine and boundaries | builder, retriever, normalizer, readings and mansion display |
| `server/astrologyKnowledge/canon/nakshatras27.ts` | Nakshatra/pada doctrine and coordinate-mode options | builder, retriever, normalizer, Vedic reading, evidence |
| `server/astrologyKnowledge/canon/fixedStarsAndLots.ts` | Fixed-star contacts and Hermetic Lots | retriever, builder, readings, chart evidence |
| `server/astrologyKnowledge/canon/vedicJyotishCanon.ts` | Vedic calculations/interpretive records | retriever, method ledger, Vedic reading |
| `server/astrologyKnowledge/canon/arabicPersianCanon.ts` | Arabic/Persian traditional methods | retriever, horary, synthesis |
| `server/astrologyKnowledge/canon/westernRelationalAndTiming.ts` | Dispositor/relational chains and timing | retriever, synastry/timing readings |
| `server/astrologyKnowledge/synthesis/normalizer.ts` | Method-to-proposition translation; selected direct Canon enrichment | clustering, synthesizer, method coverage, evidence UI |
| `server/astrologyKnowledge/synthesis/clustering.ts` | Thematic corroboration and tensions | synthesizer, final narrative, quality audit |
| `server/astrologyKnowledge/synthesis/synthesizer.ts` | Master narrative, themes, method findings, quality audit | readingBridge, routers, Reading Center and all consumers |
| `server/astrologyKnowledge/synthesis/types.ts` | Synthesis response schema | normalizer, clustering, synthesizer, bridge, routers, client |
| `server/astrologyKnowledge/synthesis/readingBridge.ts` | Snapshot consistency gate and canonical synthesis context | interpretation.generate, chapter routes, cached reading behavior |
| `server/interpretation.ts` | Reading/chapter formatting, legacy/fallback interpretation, follow-up and possible LLM calls | routers, Reading Center, AI-cost audit, life story |
| `server/lifeStoryEngine.ts` | Life-story chapter data, cycles, age periods, legacy chapter AI path | lifeStory routes, chapter UI, chronology tests |
| `server/routers.ts` | User-facing tRPC chart, interpretation, chapter, life-story, synastry, synthesis and other endpoints | every corresponding client caller, response types, AI-cost and authorization tests |
| `client/src/components/InterpretationPanel.tsx` | Reading Center output, chapters, visible master evidence, reading cache | interpretation.generate/chapter, masterSynthesize, synthesis response types |
| `client/src/components/ChartWheel.tsx` | Visual planet, house and aspect output | chart model, aspect definitions, geometry, evidence display |
| `client/src/components/PersonalCosmicForecast.tsx` | Personal forecast interpretation and user-facing advice | chart, aspects, Canon coverage, evidence UI |
| `client/src/pages/EnergyPage.tsx` | Energy Read output and aspect scoring | chart aspects, shared aspect taxonomy/weights, profile home, forecasts |
| `client/src/components/ProfileHomeScreen.tsx` | Home/profile energy and reading summaries | EnergyPage scoring, reading API, cached profile/chart |

**Inventory expansion required:** Locate and add *all* other client route/page components, sports Simulation Lab, Horary Chamber, Synastry UI, Numerology/Kabbalah outputs, personal Flow Clock, daily forecast, PDF/share/export and notification outputs, and any additional LLM invocation sites. Do not assume they are wired because the files above exist.

## 3. Change-impact matrix — what MUST be checked together

| If changing… | Inspect / update together | Minimum acceptance checks |
| --- | --- | --- |
| Longitude, fixed frame, Polaris, sunrise ASC, houses, XYZ, sidereal rotation | astronomy, masterChart builder/types, readingBridge, Canon longitude lookups, chart wheel, every reading mode | Same coordinates and houses in engine, ledger, Canon, API, wheel and interpretation; God/Agent reconciliation |
| Aspect names, orb limits, major/minor aspects, conjunction valence | aspect calculator, masterChart aspect layer, normalizer, Canon aspect doctrine, EnergyPage, ProfileHomeScreen, ChartWheel, forecast, sports scoring | No unsupported aspect labels; same orb/valence/count/weights everywhere; TypeScript and fixture tests |
| Planet/sign/house doctrine or dignities | Canon record, retriever, normalizer, synthesizer, reading/chapter routes, UI | Same doctrine appears in each supported reading with provenance; no fabricated chart fact |
| Nakshatra, Manzil, decan or fixed-star boundaries | Canon, builder method layer, retriever, normalizer, wheel/overlay and evidence | Coordinate mode and exact degree agree; no invented active mansion |
| Kabbalah, numerology or traditional technique | Canon or technique module, method ledger status, normalizer, synthesis, reading-specific UI | Distinguish calculated from symbolic/reference-only; visible method/evidence |
| Master synthesis theme or method extraction | normalizer, clustering, synthesizer/types, bridge, router, InterpretationPanel, cache | Every computed layer represented; no duplicate/invented evidence; quality audit truthful |
| Interpretation, Life Story or follow-up prompts | interpretation.ts, lifeStoryEngine.ts, routers, bridge, InterpretationPanel, cache | One canonical source; chapter consistency; no unnecessary AI call; safe fallback |
| tRPC response shape | routers, shared/inferred client types, all consumers, persisted cache | Old cache invalidated/migrated; loaded UI and errors tested |
| UI display or chart overlays | relevant component, underlying API and method ledger, visual regression | Mobile + desktop loaded states; same values as backend |
| Sports weather/injuries or no-bet logic | sports ingestion, simulation calculation, synthesis, UI and evidence | Physical conditions labeled separately from symbolic readings; no unsupported availability claim |

## 4. Reading/output endpoint review register

- **Natal / Transit / Combined** — `server/routers.ts` `interpretation.generate` -> `synthesizeChartForReading` -> `generateInterpretation` -> `InterpretationPanel`. Confirm canonical response is displayed and cached.
- **Master Synthesis evidence** — `server/routers.ts` `masterSynthesize` and Reading Center's explicit button. Confirm it does not recalculate a second divergent reading when `interpretation.generate` already returns synthesis.
- **Reading chapters** — `server/routers.ts` `interpretation.chapter`, `server/interpretation.ts` chapter functions, `InterpretationPanel` chapter queue. Confirm chapters reuse one snapshot and consistent Canon evidence.
- **Life Story** — `server/routers.ts` `lifeStory.generateChapter`, `server/lifeStoryEngine.ts`. Check chronological specificity, legacy LLM path and repeated synthesis.
- **Synastry** — `server/routers.ts` synastry endpoint. Verify any displayed aspects from computed geometry rather than unvalidated generated prose.
- **Horary, Energy Read, Flow Clock, Simulation Lab, Kabbalah and Numerology** — **NOT YET FULLY TRACED**. Identify their route, producer, Canon inputs, synthesizer, UI and cache before declaring pipeline complete.

## 5. Required PR change-impact record

For **every** PR affecting output, include:

```text
Changed source(s):
Output(s) affected:
Calculation and coordinate dependencies checked:
Canon modules / doctrine checked:
Master ledger / evidence IDs checked:
Synthesis + contradiction checks:
Server routes / API contract checked:
Client consumers / cache checked:
Other reading modes affected:
AI calls before/after (and fallback behavior):
Tests added/updated + CI result:
Mobile and desktop loaded-state verification:
Known gaps / deferred work:
```

If a field is not applicable, say why. If unverified, mark **OPEN**. Never use `N/A` to conceal an unknown dependency.

## 6. Mandatory regression fixtures

1. Fixed known natal chart: verify positions, sunrise-anchored ASC, equal houses, God/Agent translation, Canon meanings and visible reading.
2. Same chart in transit and combined mode: no mismatch between source chart, snapshot, Canon, synthesis and UI.
3. Major and minor aspects: conjunction, sextile, square, trine, opposition, semisquare; check taxonomy, orb, valence, evidence and all consuming screens.
4. All computed method layers: full evidence coverage, no truncated findings, no reference-only claims promoted to calculations.
5. Same chart, two chapters: identical source facts and doctrine; no redundant snapshot/LLM invocation.
6. Horary/synastry: validate significators and interchart aspects from computed data.
7. Energy Read vs Home: matching scores, weights and aspect totals.
8. Missing Canon data and unavailable AI: clear deterministic fallback, never invented doctrine.
9. Cache reload and version change: no stale or divergent synthesis.
10. Mobile/desktop loaded-state smoke tests, backend health and Render deployment checks.

## 7. Status / ownership

- **Verified**: the files in Section 2 exist and contain the described relevant code.
- **Verified**: selected Canon lookups currently occur in normalizer; full-chart dossier retriever exists.
- **OPEN**: make full-chart Canon retrieval mandatory in the shared bridge; do not double-count evidence.
- **OPEN**: exhaustive repository-wide output producer discovery and remaining route mapping.
- **OPEN**: deduplicate chapter synthesis and LLM calls; validate synastry; full end-to-end tests.
- **OPEN**: reconcile related PRs before merging; verify CI and Render deployment.

**Maintenance rule:** The dependency map is part of the implementation. No output-affecting code change is complete until its upstream and downstream entries, tests, and statuses are updated.
