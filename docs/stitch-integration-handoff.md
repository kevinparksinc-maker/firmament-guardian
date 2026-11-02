# Consolidated Stitch Integration Handoffs

These sections preserve the original branch handoff specifications. The branches provide implementation guidance; they do not themselves contain installed Stitch UI code.

## Home Dashboard (`feature/stitch-home-dashboard`)

### Stitch integration handoff: Home dashboard + desktop observatory

#### Source
Use the user-provided archive `stitch_the_absolute_astrology_redesign.zip` (attached in the ChatGPT conversation). This branch contains a handoff specification, **not** the exported HTML or installed UI. Do not infer that a design is implemented.

Stitch source files:
- `stitch_the_absolute_astrology_redesign/home_dashboard_the_absolute/code.html`
- `stitch_the_absolute_astrology_redesign/home_observatory_desktop_the_absolute_1/code.html`
- `stitch_the_absolute_astrology_redesign/home_observatory_desktop_the_absolute_2/code.html`

#### React integration targets
- `client/src/components/ProfileHomeScreen.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/CelestialCommandShell.css`

#### Implementation contract
- Adapt HTML/Tailwind layouts into existing React components; retain props, hooks, routes, event handlers, state, backend API calls, profile context, and loading/error states.
- Do not modify `server/`, astronomy/ephemeris modules, calculation engines, scoring formulas, or API contracts.
- Use real bound chart and energy values, not Stitch sample numbers, fake user data, or placeholder calculations.
- Preserve loaded-profile gating, Harmonic Flow Clock live values, chart data, saved profiles, navigation, and God/Agent displays. Treat Stitch static data as placeholders.
- Keep responsive mobile and desktop layouts, readable text, keyboard focus, semantic labels, and accessible contrast.
- Scope changes to this branch's target and shared UI components; coordinate shared styles with the shared-design-system branch to avoid conflicting edits.

#### Acceptance checklist
- Existing app routes and navigation still work.
- No astrology logic, engine files, or API signatures changed.
- No static Stitch example scores or birth details appear as live user data.
- Mobile and desktop screenshots visually match intended Stitch layout.
- `pnpm check`, `pnpm test`, and `pnpm build` pass (or failures documented).
- Open a PR to `main` for review; **do not auto-merge or deploy** until approved.

---

## Natal Chart (`feature/stitch-natal-chart`)

### Stitch integration handoff: Natal diamond chart

#### Source
Use the user-provided archive `stitch_the_absolute_astrology_redesign.zip` (attached in the ChatGPT conversation). This branch contains a handoff specification, **not** the exported HTML or installed UI. Do not infer that a design is implemented.

Stitch source files:
- `stitch_the_absolute_astrology_redesign/natal_chart_the_absolute/code.html`

#### React integration targets
- `client/src/components/ProfileChartScreen.tsx`
- `client/src/components/DiamondChart.tsx`

#### Implementation contract
- Adapt HTML/Tailwind layouts into existing React components; retain props, hooks, routes, event handlers, state, backend API calls, profile context, and loading/error states.
- Do not modify `server/`, astronomy/ephemeris modules, calculation engines, scoring formulas, or API contracts.
- Use real bound chart and energy values, not Stitch sample numbers, fake user data, or placeholder calculations.
- Preserve existing North Indian diamond geometry, equal-house placements, fixed-star coordinate model, both chart frames, decans and mansions. Never hardcode placements or ayanamsha.
- Keep responsive mobile and desktop layouts, readable text, keyboard focus, semantic labels, and accessible contrast.
- Scope changes to this branch's target and shared UI components; coordinate shared styles with the shared-design-system branch to avoid conflicting edits.

#### Acceptance checklist
- Existing app routes and navigation still work.
- No astrology logic, engine files, or API signatures changed.
- No static Stitch example scores or birth details appear as live user data.
- Mobile and desktop screenshots visually match intended Stitch layout.
- `pnpm check`, `pnpm test`, and `pnpm build` pass (or failures documented).
- Open a PR to `main` for review; **do not auto-merge or deploy** until approved.

---

## Energy Read (`feature/stitch-energy-read`)

### Stitch integration handoff: Energy Read mobile + desktop

#### Source
Use the user-provided archive `stitch_the_absolute_astrology_redesign.zip` (attached in the ChatGPT conversation). This branch contains a handoff specification, **not** the exported HTML or installed UI. Do not infer that a design is implemented.

Stitch source files:
- `stitch_the_absolute_astrology_redesign/energy_read_the_absolute/code.html`
- `stitch_the_absolute_astrology_redesign/energy_read_desktop_the_absolute/code.html`

#### React integration targets
- `client/src/pages/EnergyPage.tsx`
- `client/src/components/ProfileHomeScreen.tsx`

#### Implementation contract
- Adapt HTML/Tailwind layouts into existing React components; retain props, hooks, routes, event handlers, state, backend API calls, profile context, and loading/error states.
- Do not modify `server/`, astronomy/ephemeris modules, calculation engines, scoring formulas, or API contracts.
- Use real bound chart and energy values, not Stitch sample numbers, fake user data, or placeholder calculations.
- Preserve calculation pipeline and real-time chart bindings; do not replace scores, orb thresholds, aspect classifications, time stepping, or totals with demo numbers. Flag any pre-existing scoring discrepancy separately.
- Keep responsive mobile and desktop layouts, readable text, keyboard focus, semantic labels, and accessible contrast.
- Scope changes to this branch's target and shared UI components; coordinate shared styles with the shared-design-system branch to avoid conflicting edits.

#### Acceptance checklist
- Existing app routes and navigation still work.
- No astrology logic, engine files, or API signatures changed.
- No static Stitch example scores or birth details appear as live user data.
- Mobile and desktop screenshots visually match intended Stitch layout.
- `pnpm check`, `pnpm test`, and `pnpm build` pass (or failures documented).
- Open a PR to `main` for review; **do not auto-merge or deploy** until approved.

---

## Shared Design System (`feature/stitch-shared-design-system`)

### Stitch integration handoff: Shared premium theme and responsive shell

#### Source
Use the user-provided archive `stitch_the_absolute_astrology_redesign.zip` (attached in the ChatGPT conversation). This branch contains a handoff specification, **not** the exported HTML or installed UI. Do not infer that a design is implemented.

Stitch source files:
- `stitch_the_absolute_astrology_redesign/celestial_observatory/DESIGN.md`

#### React integration targets
- `client/src/index.css`
- `client/src/components/CelestialCommandShell.css`
- `client/src/components/CelestialCommandShell.tsx`

#### Implementation contract
- Adapt HTML/Tailwind layouts into existing React components; retain props, hooks, routes, event handlers, state, backend API calls, profile context, and loading/error states.
- Do not modify `server/`, astronomy/ephemeris modules, calculation engines, scoring formulas, or API contracts.
- Use real bound chart and energy values, not Stitch sample numbers, fake user data, or placeholder calculations.
- Translate Stitch tokens, typography, spacing, responsive layout and accessible states to reusable styles; avoid global regressions, remove no features, and never edit server or calculation files.
- Keep responsive mobile and desktop layouts, readable text, keyboard focus, semantic labels, and accessible contrast.
- Scope changes to this branch's target and shared UI components; coordinate shared styles with the shared-design-system branch to avoid conflicting edits.

#### Acceptance checklist
- Existing app routes and navigation still work.
- No astrology logic, engine files, or API signatures changed.
- No static Stitch example scores or birth details appear as live user data.
- Mobile and desktop screenshots visually match intended Stitch layout.
- `pnpm check`, `pnpm test`, and `pnpm build` pass (or failures documented).
- Open a PR to `main` for review; **do not auto-merge or deploy** until approved.

---
