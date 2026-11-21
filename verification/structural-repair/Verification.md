# The Absolute structural repair

The source in `The_Absolute/` is the repaired copy of `the-absolute-astrology-2026-11-21.zip`. All original source and asset paths remain present. The patch in this directory applies to a fresh extraction of that original archive.

## Changes

- **Astronomy.** `server/ephemeris.ts` owns Swiss Ephemeris sampling, Julian day conversion, XYZ projection and the observer-specific Moon call. The chart engine reuses the longitude and angular speed from the same XYZ sample. Existing imports from `server/astronomy.ts` still work.
- **Canon, synthesis and readings.** The Master Chart hands one typed snapshot to the synthesis evidence module. That module gathers Canon applications and the full natal and event method ledgers. The reading bridge formats narrative context when a reading needs it. Chart generation consumes the evidence binding without formatting that unused context.
- **Dependencies.** Genesis uses direct implementation imports. Horary shares a chart contract with its provider adapter. Behavioral and Canon components depend on type contracts rather than importing back through the evidence-packet definitions.
- **Duplicated logic.** Guide tabs and chart cells, polar chart coordinates, sign lookup, Vedic/Arabic evidence rows, body longitude lookup for Lots and Genesis ordinal formatting share implementations. The independent expected-angle calculation in the Lots tests stays in the test.
- **Errors.** Narrative preparation logs a scoped warning if the supplemental persona-matrix section fails. Existing recovery continues. The finding ledger records recovery and retry paths that were reviewed and retained or deferred.

## Scanner results

| Code Architect v0.3 finding | Original | Repaired |
| --- | ---: | ---: |
| Total | 369 | 285 |
| Dependency cycles | 3 | 0 |
| Unused named imports | 70 | 0 |
| Repeated function bodies | 10 | 1 |
| Empty catches | 25 | 24 |
| Fetch inside a loop | 3 | 3 |
| Dependency fan-out or hub | 33 | 31 |
| Reachability heuristic | 157 | 160 |
| Module size heuristic | 68 | 66 |
| Repair candidates | 70 | 0 |

`Findings.csv` has one decision for each of the 369 original findings. It records 83 repaired, 4 cleared on rescan, 135 retained and 147 deferred. TypeScript resolution found paths to 107 of the 157 files the original scanner called unreachable. The scanner only resolves relative module specifiers, so the raw reachability count also includes false positives and misses some framework or tooling entry points. No module was deleted on reachability evidence alone.

## Verification

- Both trees passed TypeScript and built the client and server with the same locked dependencies. Both passed all 496 tests under the configured Vitest suite.
- The revised production server returned HTTP 200 for `/healthz`, the application shell, and its compiled JavaScript entry. The smoke test used a temporary local session secret.
- With a fixed clock, the comparison script checks complete parsed output for natal, combined natal/transit, transit, date-only God View and externally supplied XYZ fixtures, plus horary. It compares raw charts, routed Master Chart output, Canon dossiers, synthesis method evidence and context, and Genesis results.
- Instrumented Swiss Ephemeris calls fell from 46 to 26 for the representative automatic-XYZ Agent chart, a 43% reduction. The result counts calls in raw chart calculation. Overall page speed depends on the route and external services.
- Live sign-in, hosted database access, external AI-provider responses and a full interactive browser walkthrough were outside the local verification. Existing known limitations, including reference-only Chinese Xiu and some Canon coverage warnings, appear in the original and repaired fixture output.

## Reproduce or roll back

From a project root, install the locked dependencies with `pnpm install --frozen-lockfile`, then run `pnpm check`, `pnpm test`, and `pnpm build`. For the fixture comparison, temporarily copy `compare-fixtures.ts` into each project root as `.compare.ts` and run `node --import tsx .compare.ts /absolute/path/to/output.json` in each tree. Compare the parsed JSON objects. Remove the temporary scripts and generated fixture files after comparison.

The included patch passed `git apply --check` on the original source. Use the original ZIP as the rollback copy or reverse the patch on a clean repaired checkout with `git apply -R`.

## Code Architect repair case

The source, patch, finding decisions and comparison harness form a regression case for the eventual repair engine. Its 23 tests passed while regenerating the baseline scan. The expected behavior is to resolve TypeScript aliases and classify runtime and type edges independently, verify import usage before changing a file, require evidence for module deletion and keep independent test calculations out of deduplication. A generated repair should reproduce these build, test and output checks in a separate verification environment before it is accepted. Code Architect v0.3 was used to rescan the project. This package changes The Absolute.
