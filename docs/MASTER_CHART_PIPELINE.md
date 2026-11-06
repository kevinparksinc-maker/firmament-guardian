# Shared chart production and reading pipeline

Every public chart producer uses `server/masterChart/entry.ts`:

1. `buildUnifiedMasterChart` calculates the authoritative astronomical state, sunrise Ascendant and Equal Houses.
2. `registry.ts` requires the same 16 method IDs for every sky. A missing or unregistered adapter is an error. Each method retains its actual results, sources, evidence IDs and execution status.
3. A combined/transit snapshot includes an independent event framework calculated at the exact event instant and resolved horizon. It evaluates the same registry. Natal and event mansions, decans, star contacts, conditions, divisional data and other methods are separate.
4. `synthesizeMasterSnapshot` retrieves both skies' Canon dossiers, binds the actual teachings to calculated evidence, and runs synthesis. Event method/evidence IDs use the `transit:` prefix.
5. Coverage failure blocks chart publication. Successful charts carry `methodBindings`: base results, event results and the synthesis audit. This contract is also attached to sports game snapshots for their adapters.
6. User-facing prose is generated from the verified synthesis. Energy requires citations to actual evidence and explicit use of the available natal/event mansion, decan and fixed-star layers before displaying the reading and score evidence.

## Production callers

- `server/routers.ts`: ordinary chart production and the Master Chart/synthesis endpoints.
- `server/horary.ts`: question, natal and God charts.
- `server/zodiacHorary.ts`: sign-centered sky; its symbolic ruler houses remain a separate lens.
- `server/harmonicForecast.ts`: every sample is recalculated at its selected instant; it does not reuse the source instant or interpolate scores.
- `server/simulationLab/masterGameChart.ts`: sports charts use the same formation; no alternate astronomical engine.
- `server/focusedReading.ts`: placement/contact readers reuse the verified natal/event frameworks rather than casting another event chart with birth anchors.
- `server/master-pipeline.ts`: compatibility entry point delegating to the single verified reading bridge. It has no alternate defaults or calculation path.

The low-level `astronomy.calculateChart` remains the builder's calculation primitive and is used directly by astronomy unit tests. Public producers import `calculateMasterChart`.

## Data and model rules

- No substitute dates, coordinates, timezones, XYZ vectors or sunrise anchors are introduced by the reading gate.
- A location-free God chart has no local Ascendant. Horizon-dependent methods retain explicit not-applicable statuses; fixed-frame placements and applicable longitude methods still run.
- Nodes and available chart angles receive mansion, decan and stellar-contact findings too.
- The transit activation layer consumes the same deduplicated ledger as Energy, including minor aspects, angles and the configured weight formula.
- The existing Chinese overlay identifies its custom Firmament boundary model. The separate ancient Chinese catalog remains reference-only; its unavailable ancient boundaries are not fabricated.
- Unimplemented Shadbala/Bhava Bala or other absent techniques are not claimed as computed by this registry. This change does not invent additional method implementations.
- Event-origin cycle/divisional results describe the event model; they must not be presented as someone's birth history or natal lifecycle.

## Avoiding duplicate work

Ordinary reading routes call their gate once, rather than running another gate in both router and service. Exact repeated reading requests share a bounded, short-lived promise cache; failures are evicted. The interpreter packet carries every method and Canon application once, instead of expanding the same records repeatedly inside narrative themes. Saved-reading cache version 8 invalidates older interpretation output.

## Verification

`pnpm check`, `pnpm test`, and `pnpm build` verify types, calculations, source-input preservation, cross-chart separation, Canon lineage, forecast progression, sports bindings and build output. Provider failures remain explicit; mocked-provider tests cannot establish that a hosted AI service is currently available or that a deployment has become live.
