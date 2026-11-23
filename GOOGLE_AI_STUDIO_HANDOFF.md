# The Absolute — Google AI Studio / Gemini implementation handoff
**Prepared:** November 23, 2026  
**Repository:** `kevinparksinc-maker/firmament-guardian`  
**Authoritative branch:** `main`  
**Previously integrated baseline:** merge commit `85b36387d5b95626e9d75bbabd2e3484e2eeda77` (PR #83)

## Purpose

Use the **existing application in this repository** as the authoritative source. The November 23 four-file interpretation synthesis update is already merged. This document records what is implemented, the remaining Horary three-view interpretation gap, and a precise acceptance contract for implementation by Google AI Studio/Gemini. **Do not mistake this handoff document for an already implemented software change.**

**User requirement:** The Horary interpreter must read (1) the natal foundation, when real birth data is available; (2) the Agent/local question-moment chart and transits; and (3) the God View/fixed background at the same question instant; then interpret their results together, retaining the traditional Horary question judgment. The technical Evidence view must retain the provenance, IDs and calculated method statuses.

## Existing code — read these files before modifying anything

| Path | Existing responsibility |
| --- | --- |
| `server/horary.ts` | Casts the actual question-time chart and traditional Horary testimony; optionally constructs a natal foundation; constructs `transitChart` and a separate `godChart`; assembles natal, question-time and God View textual evidence; orchestrates the Horary reading and follow-ups. |
| `server/services/groqHoraryService.ts` | Current Horary model-facing adapter (despite its name). Builds a 3-ring reasoning summary and compact traditional Horary packet; calls `runInterpretation("HORARY_READING", ...,"horary-compact")`. |
| `server/astrologyKnowledge/synthesis/interpretationPipeline.ts` | Shared model handoff; complete calculated findings for normal readings and route-specific compact Horary/placement evidence; reading-behavior directive. |
| `server/astrologyKnowledge/synthesis/context.ts` | Lossless synthesis context and compact context packet utilities. Compact packets explicitly report omitted findings when limited; they are not a substitute for complete evidence. |
| `server/astrologyKnowledge/synthesis/synthesizer.ts` | Builds synthesized method outcomes, cross-method themes, contradictions, and evidence traces. |
| `server/astrologyKnowledge/synthesis/readingBridge.ts` | Constructs and validates the master chart snapshot used by ordinary synthesis. |
| `server/master-interpreter.ts` | Current 'As Real As It Gets' reading behavior, one specific thesis with distinct calculated witnesses and the discard-not-rewrite specificity standard. |
| `server/horaryTraditional.ts` | Traditional Horary significators, perfection, receptions, Moon status, dignities, timing and judgment. |
| `server/horary.test.ts`, `server/interpretationRoutes.test.ts`, `server/astrologyKnowledge/interpretation.integration.test.ts` | Existing regression coverage to preserve and extend. |

## Current verified code behavior (before future Gemini changes)

1. `calculateHoraryChart()` in `server/horary.ts` creates an **Agent/local question-moment chart** with the question's time and location. Horary is traditionally cast for one question instant; it is **not** automatically a birth chart.
2. When `input.natal` exists, a distinct **natal foundation** is calculated in `agent-vs-god` / combined mode, and `transitChart` compares the question-moment sky to that real natal data. With **no natal profile**, the code does **not** fabricate natal contacts: it reports question-time positions instead.
3. A separate `godChart` is calculated for the same question instant in `worldview: "god"`. This is fixed/background/geocentric context, not a local Ascendant or a personal set of natal houses.
4. `evidenceText` in `server/horary.ts` already contains explicitly separated **NATAL / AGENT**, **TRANSIT / QUESTION-MOMENT**, and **GOD VIEW / GEOCENTRIC** sections, plus the traditional judgment.
5. The normal initial Horary AI request is assembled in `server/services/groqHoraryService.ts`: it currently sends a **three-wheel summary** plus a **compact traditional judgment** and the shared synthesized-method packet. The entire separate God View method ledger is **not** independently supplied as a fully judged third synthesis to the model. This distinction is the remaining integration work. A source field existing in `HoraryChart` does not prove it reached the model.
6. The primary synthesis in `synthesizeHoraryChart()` currently runs against `chart.natalChart ?? chart.transitChart`, not against three explicit independent synthesis-result inputs. Horary's traditional verdict remains primary.

## Required implementation — no silent substitutions

### A. Make three named input sets explicit in the model handoff

Define a stable structured Horary evidence envelope with:
- `questionAgent`: question date/time/location, local Ascendant and Equal Houses, significators, Moon, aspects, applicable Horary rule outputs, statuses, evidence/source IDs.
- `transitMoment`: same question instant; transit placements and contacts to the natal foundation **only when** natal evidence exists; clear absence status otherwise.
- `natalFoundation`: actual natal placements, houses, timing, calculated method findings and source IDs when a birth profile is supplied; otherwise `status: "not_provided"`.
- `godView`: the same question instant's God View chart, its available method outcomes and evidence IDs, as a distinctly labeled fixed-background frame. **Never manufacture local houses or an Ascendant for God View.**
- `traditionalHoraryJudgment`: unchanged authoritative verdict/testimonies, Moon condition, receptions, application/perfection, prohibition, timing and question-specific significators.

A three-view reading means **natal + question moment/transit + God**, not three fictional natal charts. Keep God vs Agent frame labels and event vs birth time provenance on every result. If calculated results are unavailable, say so explicitly in the structured ledger rather than inventing them.

### B. Synthesize all actual evidence, not just labels

Arrange for Gemini to receive the actual applicable calculated outputs, method statuses, constraints and evidence references for all three available frames. The resulting reading must explain how independent witnesses **reinforce or contradict each other**, not merely recite "God", "Transit" and "Natal" separately. Preserve the historical question-time Horary significator/perfection judgment as the ruling answer. Distinguish a planetary capacity metric from a guaranteed favorable outcome.

**Do not silently truncate a layer or imply that a source was examined if it was omitted.** If provider context size requires bounded transfer, use explicit coverage counts, evidence IDs and verified recoverable/segmented retrieval; surface an actionable error or documented incomplete status rather than claiming full coverage. Current focused-mini budgets and response schemas must still be respected.

### C. Preserve the app's locked calculation conventions

- Ephemeris **XYZ vectors** and fixed-firmament projection; no tropical/sidereal fallback and no unwanted precession/obliquity transformations in the Absolute's custom frame.
- The current sunrise-anchored **Agent Ascendant** and **Equal House** conventions. Do not add a +90° shift or quietly replace them with whole-sign houses or sidereal meridian logic.
- Separate God/fixed-background and Agent/local-horizon frames. Natal is birth context; question-moment sky is event context.
- Preserve the full calculated method inventory, its `computed-with-result`, `reference-only`, `not-applicable` and `failed` statuses, the Canon source mapping, available Shadbala/Bhava Bala and mansion methods, and contradictions. Never promote a reference-only method into a computed one.
- No generic personality claims: discard any claim that could describe almost anybody; derive **new** conclusions only from the chart's genuinely distinct populated evidence.

### D. Preserve the Horary answer contract and route behavior

The initial Horary reading must still emit exactly:
1. `## The Answer`
2. `## What Is Happening`
3. `## What Happens Next`
4. `## What This Means for You`

Maintain direct verdict logic for binary questions and an explanatory answer for "what/why/how" or location questions. Do not invent personal biography, natal contacts, hidden motives or timing dates. Keep extended technical evidence in the expandable Evidence view, not in the spoken paragraph. Keep initial Horary and follow-up readings tied to the same question chart. Keep compatibility with the ordinary natal, transit, mini, life-story, and other interpretation routes.

### E. Test acceptance before merging

Add end-to-end/mock-model tests asserting:
1. With valid natal input, the final Horary model request has all **three distinct frame datasets** (and question-time Horary rules), each traceable to actual calculations; not merely three summary labels.
2. With no natal profile, `natalFoundation` is explicitly not provided, and no natal aspects are invented.
3. God View cannot be accidentally assigned local Agent houses, or a fabricated natal Ascendant.
4. Method-result counts/statuses, contradiction records and evidence/source IDs are preserved and can be reconciled to the chart; no source is asserted to have been read when omitted.
5. The four-section response contract and existing Horary yes/no vs open-question behavior stay intact.
6. Reader-side prompt and schema fit provider request limits or explicitly report incomplete coverage.
7. No regression in chart calculations or other reading routes.

Run `pnpm check`, `pnpm test`, `pnpm build`, and the existing GitHub CI checks. Keep build and tests green. Do **not** deploy a failing tree.

## Suggested Google AI Studio / Gemini task

> Open `kevinparksinc-maker/firmament-guardian` on `main`. Read `GOOGLE_AI_STUDIO_HANDOFF.md` and the referenced source files before editing. The latest four-file synthesis update is already integrated: do not reapply or overwrite it. The remaining task is to complete **Horary three-view evidence synthesis** so the actual natal (when provided), question-moment Agent/transit, God View results and traditional Horary testimony are all explicitly present and genuinely reconciled in the model input and answer. Implement it end-to-end with source provenance, correct absent-natal behavior, complete method-status handling, and regression tests. Preserve astronomical calculations, the Horary four-section format and other existing reading routes. Commit and push the completed code to this repository, then verify the resulting CI and deployment status.

## GitHub and Google AI Studio sync boundary

GitHub `main` is the repository source of truth. **This document is a handoff, not a live Studio connection, automatic GitHub import, or completed three-view model integration.** Google AI Studio/Gemini must open or import the current repository code using a supported workflow, implement the remaining changes, and push them to this repository. Confirm the target is `kevinparksinc-maker/firmament-guardian` (`main`), **not** `the-absolute-astrology`, `the-absolute-manus`, or a sports simulation repository.

Render's `The-Absolute` service tracks this repository's `main` with automatic deployment enabled, so any further merged commits must be validated before pushing to `main`.
