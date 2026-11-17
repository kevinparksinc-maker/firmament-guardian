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

## Production deployment

The production container runs the compiled server with `pnpm start`, listens on the
platform-provided `PORT` (defaulting to `3000`), and exposes `/health` as an
unauthenticated readiness endpoint. The published frontend is built into
`dist/public`; the server handles `/api/*` and the SPA fallback serves client routes.

## Configuration

This app needs environment variables (database, auth, LLM). Create a local `.env` file; it is git-ignored and should never be committed.


### Independent account sign-in

`/account` provides email/password registration and sign-in without the original OAuth provider. Configure a persistent MySQL `DATABASE_URL` and a unique production `JWT_SECRET` (at least 32 characters). Apply the existing Drizzle schema to a new database before launch. The credentials table is created idempotently on the first account request; users and saved-record tables use the existing schema. Passwords are salted with scrypt, sessions use HttpOnly cookies, and registration never attaches a password to an existing OAuth identity by matching its email.

Production does not create temporary account/chart records when database configuration is absent. Original OAuth sign-in remains available for existing accounts when its provider is configured. Old device profiles are preserved and can be explicitly imported after signing in. Device profile storage is scoped by account; signing out clears cached private API results.

The primary index is `/explore`. Readings use `/reading`, `/reading/depth`, and `/reading/evidence`. Energy uses `/energy`, `/energy/contacts`, `/forecast`, and `/energy/consultation`. The floating AI guide is mounted once in the shared shell and keeps its conversation across client-side navigation, resetting when the active birth profile changes.

### Interpreter providers

Configure server-only keys for the providers you want enabled. Shared interpretation calls try configured providers in this order: **Gemini → Groq → OpenRouter**. Missing keys are skipped. Failed, empty, timed-out, and truncated responses move to the next configured provider without dropping evidence. Cancellation stops the chain. Only these three providers participate; Anthropic, OpenAI, and Forge are never automatic fallbacks, even when their old keys remain.

| Provider | Key | Model setting |
| --- | --- | --- |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` (default `gemini-2.5-flash`) |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` (default `llama-3.3-70b-versatile`; example config chooses `openai/gpt-oss-120b`) |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` (default `openrouter/free`) |

Never put keys in `VITE_` variables or commit them. Each account/model has its own context and rate limits. Full evidence can exceed a provider's request allowance; the chain returns provider names, safe error codes, and HTTP statuses when it cannot complete a request. No provider error bodies or private chart prompts are exposed to the client.

The reading-plan validator accepts exact calculated point names and evidence IDs/labels, including lunar, Kabbalah/Canon, fixed-star, and transit findings. A malformed or unsupported plan gets one evidence-grounded repair; provider outages do not trigger a redundant planning request. Complete interpretation dossiers include every calculated method and finding. Compact display summaries explicitly report omitted findings and shortened text.

Run real natal, transit, and combined readings in a configured environment:

```bash
node --import tsx scripts/test-master-interpreter-live.ts
```

This calls real providers for a reading plan, full reading, and chapter in each mode. It prints result counts and failures without printing credentials or the reading. Automated fixture tests do not establish live reading quality or confirm a deployed version.
