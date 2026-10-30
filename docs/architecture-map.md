# Firmament Guardian — Architecture Map

This is a map of the repository as it exists today, not a target-state rewrite plan. It describes where responsibilities currently live and sets low-risk conventions for organizing future work. File moves and engine consolidation should be made incrementally, with tests and callers checked first.

The loaded-state UI baseline, responsive audit, visual-system proposal, and calculation guardrails are documented in [the frontend visual inventory](frontend-visual-inventory.md); its baseline screenshots are under `baseline-screenshots/live/`.

## Runtime entry points

- **Browser app:** `client/src/main.tsx` mounts the React application. `client/src/App.tsx` owns lazy page registration, route selection, access/profile gating, and the global provider tree.
- **HTTP/API server:** root `server.ts` starts the server through `server/_core/index.ts`. Core setup wires Express and mounts the tRPC API.
- **API composition:** `server/routers.ts` defines the app router and currently combines validation, request orchestration, and endpoints for several domains. Keep it as the discoverable API composition root; split its domain routers gradually when those endpoints are changed.
- **Persistence/schema:** `server/db.ts` contains database access helpers; `drizzle/` contains schema and migrations.
- **Tests:** `vitest.config.ts` discovers tests under `server/`, `client/`, and `shared/`. The project-wide TypeScript check is `pnpm check`; `pnpm test` runs Vitest.

## Ownership map

| Area | Current responsibility | Organization rule |
| --- | --- | --- |
| `client/src/pages/` | Route-level screens and page composition | Pages compose feature UI; move reusable behavior into a feature component or hook when there is a real reuse or separation need. |
| `client/src/components/` | Product components plus the separate `components/ui/` primitive set | Keep generic primitives in `ui/`; organize product components into feature folders gradually, starting with touched code. |
| `client/src/hooks/`, `contexts/`, `config/`, `lib/` | Client hooks, global state, configuration/navigation, and client-side helpers | Keep browser behavior and client state here; do not add server-only runtime dependencies. |
| `server/_core/` | Express, tRPC, authentication, and server bootstrap concerns | Keep transport/framework setup out of domain calculations. |
| `server/routers.ts` | tRPC procedures and their current orchestration | Validate request shape here; delegate substantive domain rules to a domain service. Split by API domain without changing procedure contracts unless needed. |
| `server/astrologyKnowledge/` | Canon, doctrine, interpretation knowledge, and related registries | Treat this as knowledge/domain material; do not make it depend upward on routers or UI. |
| `server/patterns/`, `server/genesisBackup/` | Pattern/Genesis-related engines, including a separately named backup grouping | Confirm canonical ownership and active callers before merging, deleting, or renaming either grouping. |
| `server/services/`, `server/utils/` | Server service and utility code | Prefer domain-owned service modules over adding unrelated behavior to large central modules. |
| `server/` root | Several mature domain engines and large orchestration modules, including Horary, astronomy, interpretation, and life-story code | The flat layout is legacy-compatible today; migrate a cohesive domain only when its boundaries and imports are understood. |
| `shared/` | Cross-layer contracts, schemas, rules, and browser-safe helpers | Shared modules should remain runtime-safe for both browser and server. Client code should prefer the configured `@shared` alias; avoid importing server implementations for runtime behavior. |
| `drizzle/` | Database schema and migration history | Database structure belongs here; keep migration edits explicit and reviewed. |
| `docs/` and root Markdown | Architecture/design docs, user guides, audits, plans, and project notes | Identify which documents are current guidance versus historical evidence before moving or deleting them. |

## Dependency direction

The intended direction is:

```text
client ───────► shared
   │
   └──────────► API contracts / tRPC client

server/_core ─► routers ─► domain services and engines ─► shared
                                      │
                                      └───────────────► persistence adapters
```

This is a target boundary, not a claim that every current import already follows it. Some client modules currently import server paths, including runtime helpers; check whether a dependency is type-only or runtime before moving it. Extract browser-safe pure functions into `shared/` only when ownership is clear and tests preserve behavior.

## Test and change conventions

- Use `pnpm test` for the complete discovered suite; Vitest includes `server/**/*.test.ts` and `**/*.spec.ts` plus corresponding client/shared patterns.
- Keep new tests close to the feature/domain they protect. A migration to a mirrored test tree is not necessary unless it makes ownership clearer.
- Make structural changes behavior-preserving where possible: move one cohesive unit, retain an export or compatibility facade when it reduces churn, then run the relevant tests, full suite, and type check.
- Do not use line count alone as a reason to split a file. Extract a meaningful hook, pure rule set, view, service, or contract with a clear owner.
- Do not treat an unreferenced file, a `Prototype` name, a backup folder, or a root audit report as proof that it is safe to delete. Confirm routes, imports, build scripts, and project-owner intent first.

## Incremental organization sequence

1. Keep this map and `README.md` aligned with the actual repository; make test discovery cover all source layers.
2. Establish a consistent feature-folder convention in the client on the next feature change; do not move the entire component library at once.
3. Split `server/routers.ts` into domain routers behind the same `appRouter` composition surface, then extract multi-step use cases only where a transport handler currently owns domain logic.
4. Document the intended canonical ownership of Genesis/pattern engines and persistence domains before consolidation.
5. Normalize client imports toward `@shared` and extract browser-safe code from server modules opportunistically.
6. Revisit large interpretation, charting, and visualization modules one responsibility at a time, with tests around each seam.
7. Classify root documents as current guide, architecture/contract, audit history, or planning; relocate only after links and automation references are checked.

## Items requiring owner decisions before broad cleanup

- Whether `/sky` and the unlinked component showcase are supported product surfaces, internal demos, or legacy experiments.
- Which Genesis/pattern engine grouping is canonical and what the `genesisBackup/` name means operationally.
- Whether package name `bible-believers-astrology`, README title “12 Gates of the Firmament,” and product/repository name “Firmament Guardian” are intentional distinctions. Do not rename these as part of code organization alone.
- Which audit reports and planning documents remain authoritative versus historical.
