# 12 Gates of the Firmament

A TypeScript astrology and interpretation app: a dark, interactive observatory for natal charts, transit readings, and AI-guided chart interpretation, including Horary charts.

## Stack

- **Client:** React 19 + Vite, framer-motion, recharts
- **Server:** Express + Node, tRPC for API calls
- **Astronomy:** `sweph` (ephemeris / planetary calculations)
- **Database:** drizzle-orm
- **Tests:** Vitest

## Project layout

```text
client/    React frontend (pages, components, hooks, contexts, config, tRPC client helpers)
server/    Express backend, API composition, domain engines, knowledge, and persistence helpers
shared/    Cross-layer contracts, schemas, rules, and browser-safe helpers
drizzle/   DB schema and migrations
docs/      Architecture and design guidance
```

See [the architecture map](docs/architecture-map.md) for current module ownership, runtime entry points, dependency direction, test conventions, and an incremental cleanup sequence. This guide describes the current structure; it does not authorize bulk file moves or deletions.

Key server entry points: `server/_core/index.ts` (Express/tRPC setup), `routers.ts` (API composition), `astronomy.ts` / `astrologyCore.ts` (chart calculations), `astrologyKnowledge/` (doctrine and knowledge), and `master-interpreter.ts` (interpretation orchestration and prompts).

## Getting started

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm check    # type check
pnpm test     # run tests
pnpm build    # production build
pnpm start    # run the production build
```

A `Dockerfile` is included for containerized runs.

## Production deployment

The production container runs the compiled server with `pnpm start`, listens on the
platform-provided `PORT` (defaulting to `3000`), and exposes `/health` as an
unauthenticated readiness endpoint. The published frontend is built into
`dist/public`; the server handles `/api/*` and the SPA fallback serves client routes.

## Configuration

This app needs environment variables (database, auth, LLM). Create a local `.env` file; it is git-ignored and should never be committed.
