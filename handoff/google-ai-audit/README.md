# The Absolute — Google AI Studio source audit

**Source repository:** [kevinparksinc-maker/firmament-guardian](https://github.com/kevinparksinc-maker/firmament-guardian)
**Exact source baseline:** `884d669a1deae3e2b7c3857ad5f5e4a641a79838` (the four-file update plus Google AI implementation instructions, prior to this source-export commit).

## Start here: complete, paste-ready code

Each `.txt` batch contains **complete, unmodified TypeScript code** copied from its original source path, not summaries. Each internal file has a clearly named original path, a source blob SHA, and START/END separators. Do not paste the banners into any `.ts` file.

1. [Method outcomes + Chart page](./BATCH_01_METHOD_OUTCOMES_AND_CHART_PAGE.txt) — Start with this one
2. [Normalizer + clustering + evidence transport + types](./BATCH_02_NORMALIZER_CLUSTERING_TRANSPORT_TYPES.txt) — Evidence boundaries and method loss
3. [Synthesizer + context + reading bridge + interpreter pipeline](./BATCH_03_SYNTHESIS_HANDOFF.txt) — AI handoff and all-method synthesis
4. [Focused reading route](./BATCH_04_FOCUSED_READING_ROUTE.txt) — Focused route
5. [Main interpretation route](./BATCH_05_INTERPRETATION_ROUTE.txt) — Full reading route
6. [Horary + model adapter + Master Interpreter](./BATCH_06_HORARY_AND_READING_STYLE.txt) — Horary 3-view route

**First handoff:** Send Batch 1 to Google AI Studio first, followed by Batch 2. Batch 3 completes the synthesis pipeline. Batches 4–6 trace each route's real call flow, including Horary.

## What Gemini should audit

1. Trace `methodExecutionLedger` → `buildMethodOutcomes` → `canonApplications`/`findingJudgments` → `normalizer` propositions → `clustering` themes and tensions → `SynthesisResult` → model-facing transport.
2. Count and report where findings, evidence IDs, statuses, calculated results or Canon refs are truncated, filtered, capped or relabeled; distinguish complete-read dossiers and intentionally bounded compact/mini packets.
3. Inspect the complete/compact selection, request-size checks, schema checks, fallback handling and token/time budgets for all reading callers. Identify actual duplicate work and sequential LLM hops with measured code paths.
4. Verify Horary's three views: real natal foundation (when supplied), question-time Agent/transit, and God View; confirm which calculated evidence *actually reaches* the initial model request, beyond summary labels. The traditional Horary judgment is authoritative.
5. Preserve the fixed XYZ astronomy, God/Agent distinction, sunrise-anchored Ascendant, Equal Houses, Canon provenance, the four Horary output sections, and the discard-not-rewrite generic claim filter.
6. Do not invent natal data, mark reference-only methods as computed, silently drop valid evidence, or claim a live AI integration based only on a prompt or file name.
7. Implement actual fixes only after mapping the end-to-end data path, add route-specific regression tests, and verify `pnpm check`, `pnpm test`, `pnpm build`, GitHub CI and Render deployment.

## Highest priority reading modes

**First:** all-method full natal/combined synthesis and Horary three-view interpretation. **Next:** Chart page planet mini readings and individual focused placements, then transit and Life Story compatibility. These modes must keep their distinct output and context budgets.

## Additional handoff

[GOOGLE_AI_STUDIO_HANDOFF.md](../../GOOGLE_AI_STUDIO_HANDOFF.md) describes the existing three-view Horary implementation and the remaining actual integration work. Review that before modifying Horary.

## Suggested paste to Google AI Studio

> I have now shared the complete current code in batches. Begin with `BATCH_01_METHOD_OUTCOMES_AND_CHART_PAGE.txt` and trace it to Batch 2 and Batch 3. Identify concrete code paths that drop calculated findings, Canon evidence, method statuses or AI request content; then read Batches 4–6 to map the exact routes and the remaining three-view Horary handoff. Do not rewrite the app or calculation framework. Show file-by-file findings and implement only evidence-backed fixes with tests. Push changes to `kevinparksinc-maker/firmament-guardian` once verified.
