# Bible Believers Astrology

A TypeScript astrology and interpretation app: a dark, interactive observatory for natal charts, transit readings, and AI-guided chart interpretation, including Horary charts.

## Stack

- **Client:** React 19 + Vite, framer-motion, recharts
- **Server:** Express + Node, tRPC for API calls
- **Astronomy:** `sweph` (ephemeris / planetary calculations)
- **Database:** drizzle-orm
- **Tests:** Vitest

## Project layout

```text
client/    React frontend (pages, components, hooks, tRPC client helpers)
server/    Express backend: chart calculation, horary flows, interpretation prompts, DB access
shared/    Shared types and helpers (including horary logic)
drizzle/   DB schema and migrations
docs/      Design guidance (mobile visual system)
```

Key server files: `astronomy.ts` (chart calculation), `astrologyCore.ts` (core astrology logic), `master-interpreter.ts` (interpretation prompts), `host.ts` (host persona), `routers.ts` (API routes).

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

## Configuration

This app needs environment variables (database, auth, LLM). Create a local `.env` file; it is git-ignored and should never be committed.
