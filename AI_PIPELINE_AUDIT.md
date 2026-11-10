# Firmament Guardian AI Pipeline Audit

**Audit date:** 2026-11-10  
**Repository:** `kevinparksinc-maker/firmament-guardian`  
**Audited commit:** `97c2938` — `feat: integrate 144 Vedic canon planet-in-house matrix and profile deletion (#73)`

## Executive summary

The repository was updated to the latest `origin/main`. The local chart-reading hierarchy redesign was preserved in `client/src/components/ProfileChartScreen.tsx` and remains uncommitted.

The AI pipeline has useful safeguards—input validation, evidence packaging, in-process request reuse, provider retries, and output checks—but long readings are still executed synchronously inside tRPC mutations. A full master reading can therefore hold an HTTP request open while chart formation, method evaluation, prompt construction, and an AI request are performed.

The more urgent issue is that the current upstream commit does not pass the repository baseline:

- `pnpm check` fails with numerous cross-module TypeScript contract errors.
- The test run reports **34 failed files, 60 passed files; 108 failed tests, 375 passed tests, 21 skipped**.
- Several failures involve the master synthesis contracts (`methodOutcomes`, transit `framework`, `MasterMethodBindings`, `MINI_SYNTHESIS_STYLE`) and appear to be an incomplete or incompatible merge of the newer master-chart code.

Do not deploy the current workspace until the contract regressions are resolved.

## Pipeline map

```text
Client chart / reading page
  -> tRPC mutation
  -> buildUnifiedMasterChart()
  -> deterministic method registry and evidence ledger
  -> synthesizeMasterReading()
  -> optional full narrative via narrateMasterSynthesis()
  -> provider adapter in server/_core/llm.ts
  -> response validation
  -> client rendering
```

## Findings

### P0 — Current repository does not typecheck

`pnpm check` fails in multiple core contracts. Representative failures include:

- `server/chartPageReading.ts`: `SynthesisResult` no longer exposes `methodOutcomes` where consumers require it.
- `server/chartPageReading.ts`, `server/focusedReading.ts`, and `server/masterChart/entry.ts`: transit `framework` is expected by consumers but absent from the declared transit type.
- `server/energyReading.ts`, `server/focusedReading.ts`, and `server/placement-synthesis/orchestrator.ts`: `MINI_SYNTHESIS_STYLE` is imported but not exported.
- `server/energyReading.ts`: callers pass `timeoutMs`, but `InvokeParams` does not declare it.
- `server/masterChart/entry.ts` and simulation modules: `MasterMethodBindings`, `methodBindings`, `xyz`, `chartRole`, and related fields are out of sync.
- `shared/energyScoring.ts` and `shared/placementMiniReadings.ts`: shared types no longer match the astronomy/chart input contracts.

This is independent of the browser timeout problem and should be fixed first because it prevents reliable validation.

### P0 — Long AI work is synchronous

The master synthesis endpoint in `server/routers.ts` builds the master chart and immediately awaits synthesis inside a tRPC mutation. The same pattern exists in other interpretation routes. There is no durable job ID, worker, queue, persisted job status, or cancellation protocol.

A slow provider, large evidence packet, or retry sequence can therefore exceed the hosting proxy timeout even when the server eventually succeeds.

### P0 — Retry budget can exceed a normal web request lifetime

`server/_core/llm.ts` sets a default provider timeout of 150 seconds and allows four retries after the initial attempt. With backoff, a single provider call can occupy several minutes. This is appropriate only for a worker job, not a normal browser request.

The code also retries every non-2xx response, including permanent client errors. The test `server/llm-errors.test.ts` expects a 400 response not to be retried, while the current `fetchWithBackoff` implementation logs retries for 400 responses. This is a direct implementation/test mismatch.

Recommended retry policy:

- Retry network errors, 408, 409 when appropriate, 425, 429, and 500/502/503/504.
- Do not retry 400, 401, 403, 404, 409 unless the provider contract explicitly says otherwise.
- Honor `Retry-After`, but cap the total job deadline.
- Use a separate longer timeout only inside a worker.

### P0 — Provider timeout behavior is inconsistent

`InvokeParams` does not declare `timeoutMs`, although multiple call sites pass it. The provider adapter therefore cannot reliably honor caller-specific deadlines.

The Anthropic and Forge/OpenAI-compatible paths use `fetchWithBackoff`, but the timeout is hard-coded through the shared default. The Gemini path calls `generateContent` directly and does not apply the shared `AbortSignal`, timeout, retry policy, or requested token limit consistently.

The timeout contract should be explicit:

```ts
export type InvokeParams = {
  // ...
  timeoutMs?: number;
  maxAttempts?: number;
};
```

Each provider adapter should receive the same deadline and abort signal, and the total retry budget should never exceed the caller’s deadline.

### P1 — Full synthesis is generated even when the UI only needs a summary

`server/astrologyKnowledge/synthesis/narrative.ts` requests an 8,192-token full narrative and asks the model to read every applicable method. `MasterSynthesizerPanel` can display a summary presentation, but the backend still performs the expensive full-generation path when that endpoint is used.

Recommended staged generation:

1. **Summary request:** compact dominant conclusion, 400–800 words, relevant evidence only.
2. **Full explanation:** generated only after the user opens the detailed reading.
3. **Evidence view:** deterministic ledger and citations loaded independently; no prose generation required.

This reduces latency, provider cost, and failure surface while matching the reorganized UI.

### P1 — In-process cache is not durable

`server/astrologyKnowledge/synthesis/readingBridge.ts` keeps up to eight verified readings in a process-local `Map` for 60 seconds. This deduplicates simultaneous requests in one Node process, but it does not survive restarts, scale across instances, or let a new browser request recover a completed result.

This should remain as a fast in-process optimization, but long jobs need persisted state in the database or a queue backend.

### P1 — No background worker or durable job state

There is no `ai_jobs` table or equivalent state machine. Recommended states:

```text
queued
calculating
assembling_evidence
generating
validating
completed
failed
cancelled
expired
```

The browser should receive a job ID immediately, then use polling or SSE to observe progress. Results should be persisted so refreshes and proxy reconnects do not lose the reading.

### P1 — No true streaming path for the main synthesis

The client has streaming-rendering components, but the master synthesis path returns a completed tRPC result. There is no server-sent event or streaming response for the long synthesis.

Streaming is useful for short chat responses, but it should not replace a durable job for chart calculations and long evidence-grounded readings.

### P1 — Fallback behavior is uneven

Some interpretation paths have deterministic fallback behavior, but the master synthesis contract deliberately rejects empty or truncated AI output. That is correct for integrity, but the user experience needs a verified deterministic summary while the full AI job is pending or unavailable.

The fallback should be clearly labeled as calculated chart evidence, not presented as an AI-generated interpretation.

### P2 — Prompt and payload size need measurement

The narrative path serializes a large evidence packet into `<chart_data>`. The code has good evidence transport and bounded placement packet utilities, but there is no universal byte/token budget check immediately before provider submission.

Add logging and hard limits for:

- Input characters/tokens
- Output token budget
- Number of method layers
- Number of evidence records
- Provider duration
- Retry count
- Finish reason

Do not log private chart contents in production; log sizes, IDs, and hashes instead.

## Recommended implementation order

### Phase 1 — Restore a green baseline

1. Resolve the upstream master-chart type contract mismatches.
2. Export or replace missing `MINI_SYNTHESIS_STYLE` references.
3. Add `timeoutMs` to `InvokeParams` and update provider adapters.
4. Make the existing LLM tests agree with the intended retry policy.
5. Get `pnpm check` passing.
6. Get the full test suite passing before changing request architecture.

### Phase 2 — Harden provider calls

1. Add a caller deadline and attempt budget.
2. Retry only transient failures.
3. Apply timeout and abort behavior to Anthropic, Gemini, and Forge/OpenAI-compatible providers.
4. Add provider duration, token, status, finish-reason, and retry metrics.
5. Add tests for timeout, cancellation, 400/401 non-retry, 429 retry, and total deadline enforcement.

### Phase 3 — Move long readings to jobs

1. Add an `ai_jobs` persistence model.
2. Add `POST /assistant/jobs` or a tRPC equivalent that returns immediately with `jobId`.
3. Process chart/evidence/AI work in a worker.
4. Add status and result endpoints.
5. Add polling first; add SSE after the job lifecycle is stable.
6. Add cancellation, expiration, idempotency keys, and cleanup.

### Phase 4 — Split summary and depth

1. Use a compact summary contract for the chart’s first screen.
2. Generate full narrative on demand.
3. Keep evidence deterministic and separately expandable.
4. Cache verified results by chart snapshot, mode, question, prompt version, and model version.

## Target production flow

```text
POST /assistant/jobs
  -> validate chart/question
  -> persist queued job
  -> return { jobId }

Worker
  -> calculate or load canonical snapshot
  -> select relevant evidence
  -> generate compact summary
  -> validate evidence links
  -> persist completed result

GET /assistant/jobs/:id
  -> status, progress, summary, error

GET /assistant/jobs/:id/evidence
  -> deterministic technical evidence

POST /assistant/jobs/:id/full-reading
  -> enqueue optional detailed narrative
```

## Current disposition

- Latest GitHub commit fetched and applied locally.
- Local chart reading hierarchy preserved in `client/src/components/ProfileChartScreen.tsx`.
- No AI pipeline code was changed during this audit.
- Current workspace is not production-ready because the upstream baseline does not typecheck and the test suite has substantial contract failures.
