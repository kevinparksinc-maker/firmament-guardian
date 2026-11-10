# Firmament Guardian — Repair and GitHub Handoff

**Prepared:** 2026-11-10  
**Repository:** `kevinparksinc-maker/firmament-guardian`  
**Working directory:** `/home/ubuntu/firmament-guardian-github`

## Current repository state

The workspace was originally fetched at upstream merge commit `97c2938`, which combined:

- `7e6c8cf` — the last coherent parent baseline
- `bc4a134` — the 144 Vedic canon/profile-deletion feature branch

Both `97c2938` and `bc4a134` failed TypeScript validation because they combined incompatible synthesis, chart, router, account, and Canon contracts. The workspace was therefore restored to the known typecheck-green parent:

```text
7e6c8cf Remove obsolete NVIDIA AI configuration fields
```

This is intentional. The latest upstream merge was not silently treated as production-ready. The 144-method feature branch must be reintegrated later as a complete contract-level change, not through `any` casts or isolated missing exports.

The local branch is currently behind/diverged from `origin/main` because it is intentionally based on `7e6c8cf` while the remote points to `97c2938`. Do not push this state until the user confirms whether the broken upstream merge should be reverted on GitHub or repaired and reintegrated.

## Changes completed in this session

### 1. Preserved the chart-reading redesign

The reorganized chart page remains in:

```text
client/src/components/ProfileChartScreen.tsx
```

The user-facing hierarchy places the human reading before technical chart evidence and keeps the detailed visualizers/method outcomes available below. The file is currently modified relative to `7e6c8cf` and has not been committed.

### 2. Restored the coherent code baseline

The broken merge was not patched piecemeal. The workspace was reset to `7e6c8cf`, which restores the canonical type contracts used by the active application:

- `server/astronomy.ts` chart contracts
- `server/masterChart/types.ts` and builder contracts
- active synthesis result types
- active router surface
- active Canon/astrology calculation contracts
- active account/session contracts

This restored `pnpm check` to passing.

### 3. Connected Host responses to the Master Interpreter contract

Updated:

```text
server/host.ts
```

The Host system prompt now uses `buildAstrologyInterpreterSystem(...)`, so model-backed Host responses receive the same core interpretation rules as chart readings. This prevents the Host path from bypassing the Master Interpreter contract.

### 4. Corrected LLM error tests for the active provider contract

Updated:

```text
server/llm-errors.test.ts
```

The tests now isolate the active Groq adapter instead of mocking a removed Anthropic-only environment field. They verify:

- permanent HTTP 400 errors are not retried;
- provider details are not leaked in the public error;
- requested timeout behavior is reported;
- a timed-out generation is not resent automatically.

## Validation completed

### Typecheck

```text
pnpm check
PASS — tsc --noEmit
```

### Production build

```text
pnpm build
PASS — Vite frontend build and esbuild server bundle
```

The build reports large-chunk warnings for existing visualization/editor assets. These are performance warnings, not build failures.

### Focused AI and synthesis regression suite

```text
pnpm exec vitest run \
  server/llm-errors.test.ts \
  server/master-interpreter.test.ts \
  server/masterNarrative.test.ts \
  server/synthesisReadingBridge.test.ts \
  server/narrativePacket.test.ts \
  --reporter=dot

PASS — 5 test files, 14 tests
```

## Known remaining work

### A. Full test suite still has unrelated baseline failures

Before the Host/LLM test repairs, the full suite had seven failures. The remaining failures were concentrated in:

- `server/chartPageReading.test.ts`
- `server/chartMethodOutcomes.test.ts`
- `server/placementMinisUi.test.ts`

These are not TypeScript failures. They concern placement-mini generation expectations, transit mini output, UI loading text, and a long-running method-outcome test. They should be fixed next before claiming the complete suite is green.

Run:

```bash
pnpm test -- --reporter=dot
```

Do not hide these failures by excluding the test files or increasing all global timeouts. Fix the packet/generation contract or update stale expectations only after confirming the intended current behavior.

### B. The 144-method feature merge is not yet safely reintegrated

The feature branch `bc4a134` introduced consumers that expect contracts absent from the active baseline, including:

- `SynthesisResult.methodOutcomes`
- `SynthesisResult.canonApplications`
- `SynthesisResult.sourceSnapshot`
- transit `framework`
- `ChartRow.xyz`
- `ChartInput.xyzPositions`
- `ChartResult.methodBindings`
- `MasterMethodBindings`
- `MINI_SYNTHESIS_STYLE`
- additional router procedures
- additional account/profile fields
- richer decan and Vedic Canon records

Proper reintegration requires choosing one canonical contract line and porting the whole feature across types, implementations, routers, UI, and tests. Do not add broad casts.

### C. Durable background AI jobs are not implemented yet

The current application still performs long synthesis requests synchronously in tRPC procedures. The in-memory placement job prototype is not durable and is not sufficient for production.

The proper next architecture is:

1. Add a MySQL/Drizzle `llm_jobs` table.
2. Persist queued/running/succeeded/failed/cancelled state.
3. Return a job ID quickly from expensive synthesis mutations.
4. Run AI work in a separate worker process or scheduled bounded worker.
5. Add leases, heartbeats, retry policy, idempotency keys, ownership checks, and stale-job recovery.
6. Add status/result/cancel procedures.
7. Keep deterministic chart calculation separate from optional AI narration.

Do not implement this as `void buildReading()` inside the Express process; that would still lose work on restart or deployment rollover.

### D. LLM transport hardening remains a separate phase

The current baseline already supports `timeoutMs` and has tests for no-resend timeout behavior. The next hardening phase should add:

- a total invocation deadline rather than a fresh timeout for every retry;
- typed timeout/provider/abort errors;
- explicit retryable-status classification;
- no retry for ambiguous POST network failures unless an idempotency key is supported;
- consistent deadline/abort handling for every provider, including Gemini;
- safe provider telemetry without logging chart prompts.

## Existing audit document

The broader technical audit is saved here:

```text
AI_PIPELINE_AUDIT.md
```

It contains the detailed findings, recommended MySQL queue schema, worker lease design, retry policy, security requirements, and rollout phases.

## Files currently changed or newly created

```text
M  client/src/components/ProfileChartScreen.tsx
M  server/host.ts
M  server/llm-errors.test.ts
?? AI_PIPELINE_AUDIT.md
?? FIRMAMENT_GUARDIAN_HANDOFF.md
```

The `dist/` build output is generated and should not be committed if it is ignored by the repository configuration.

## Safe next-session sequence

When resuming:

```bash
cd /home/ubuntu/firmament-guardian-github

git status --short
git log -1 --oneline
git fetch origin --prune
```

Before any push, inspect the remote divergence:

```bash
git log --graph --decorate --oneline --all -20
git diff --stat HEAD..origin/main
git diff --stat origin/main..HEAD
```

Then choose one explicit strategy:

### Strategy 1 — Keep the coherent baseline and revert the broken upstream merge

Use this only if the 144-method feature is not ready. Create a normal commit that documents the intentional rollback/reversion, preserve the chart-reading redesign, run all checks, then push to `origin/main`.

### Strategy 2 — Reintegrate the 144-method feature properly

Use this if the feature is required. Create a repair branch or worktree, port the complete contracts and implementations as one unit, restore all router procedures and tests, and only merge after:

```bash
pnpm check
pnpm test -- --reporter=dot
pnpm build
```

are all passing.

### Strategy 3 — Commit the current safe repairs first, then queue work separately

This is the recommended practical sequence:

1. Fix the remaining three focused test groups.
2. Commit the chart hierarchy, Host prompt repair, LLM test repair, audit, and handoff.
3. Push that coherent baseline.
4. Implement durable AI jobs in a separate commit/PR.
5. Reintegrate the 144-method branch only after its contract migration is complete.

## Commit/push checklist for the next session

Do not use force-push. Before committing:

```bash
pnpm check
pnpm test -- --reporter=dot
pnpm build
git diff --check
git status --short
```

Then commit with a descriptive message, for example:

```bash
git add \
  client/src/components/ProfileChartScreen.tsx \
  server/host.ts \
  server/llm-errors.test.ts \
  AI_PIPELINE_AUDIT.md \
  FIRMAMENT_GUARDIAN_HANDOFF.md

git commit -m "stabilize chart reading and AI pipeline baseline"
git push origin HEAD:main
```

The push must happen only after confirming the intended remote strategy and verifying that `origin/main` has not advanced unexpectedly.

## UI failure review from 2026-11-10

The remaining UI-related failures were rerun individually before this handoff was committed.

### `server/chartPageReading.test.ts`

Two tests fail:

1. **Compact classified Canon payload:** the test expects the mocked provider request to contain two placement records, but the current `buildChartPageReading()` path sends one placement per generation call. The implementation intentionally processes placement cards one at a time so each completed card can render immediately. The test should either assert the one-card request contract or the implementation should intentionally batch the two requested names. The better product direction is to keep one-at-a-time generation and update the test to inspect the actual per-card calls while retaining the compact-payload assertions.
2. **Transit mini readings:** the event-sky path returns zero validated placements. The likely cause is that the mocked response is built from natal packet evidence while the transit call validates against event-sky packet IDs. Fix by constructing the mocked response from the event packets, or by making the test explicitly assert that natal evidence is rejected. The implementation must continue to prevent natal packet evidence from being presented as event-sky evidence.

### `server/placementMinisUi.test.ts`

The test expects the literal loading label `Preparing Moon`, but the current UI now uses a progress status such as `Processing placement 1 of 14` and immediately renders the first placement card. This is a stale UI expectation, not an application crash. Update the test to assert the current accessible progress status and the first rendered placement heading, or restore a per-card `Preparing <name>` label if that wording is a product requirement.

### `server/chartMethodOutcomes.test.ts`

One natal outcome test exceeds Vitest's 5-second default because it performs optional model-backed mini-reading work. The code correctly treats provider failure as optional, but the test still waits through the provider fallback path. Fix by mocking the optional mini-reading provider in the test, or by separating deterministic method-outcome assertions from AI prose generation. Do not raise the global timeout to mask provider calls.

### Recommended UI fix order

1. Update `chartPageReading.test.ts` to match the intentional one-placement-per-request contract and use event-sky packets for transit mocks.
2. Update `placementMinisUi.test.ts` to assert the current accessible progress UI rather than the obsolete `Preparing Moon` string.
3. Mock optional AI mini-reading work in the natal `chartMethodOutcomes.test.ts`, keeping deterministic outcome assertions independent of provider latency.
4. Run each focused test, then the complete suite, typecheck, and build.
