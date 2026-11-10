# Stitch premium layout integration — Transit Readings

## Source asset
Use the user-provided updated Stitch archive `stitch_the_absolute_astrology_redesign (1).zip`.
- `stitch_the_absolute_astrology_redesign/transit_readings_the_absolute/code.html`
- `stitch_the_absolute_astrology_redesign/transit_readings_the_absolute/screen.png`

This branch contains **handoff instructions only**, not the actual Stitch export or completed implementation. Obtain the ZIP from the user before implementing.

## Integration targets
- `client/src/components/ProfileReadingScreen.tsx`
- `client/src/pages/Home.tsx`

## Required work
1. Inspect the current route and component hierarchy and map the Stitch layout to existing React components.
2. Transfer only visual structure, typography, styling, responsive behavior and reading presentation. Retain state, hooks, handlers, props, API calls, error/loading states and navigation.
3. Preserve natal/transit/combined reading mode, live transit chart data, timing, house meanings, evidence and interpreter calls. No static Stitch placements or invented dates.
4. Do not edit any `server/` files, ephemeris, Babylonian fixed-star engine, God/Agent frame, houses, scoring formulas or API contracts.
5. Avoid copying Stitch's demonstration chart numbers, personal details or scores into live UI.
6. Use the shared premium design tokens from `feature/stitch-shared-design-system` where compatible; resolve conflicts before merge.

## Acceptance
- Current workflows remain functional with real data and no missing controls.
- Layout matches Stitch preview at phone and desktop widths.
- `pnpm check`, `pnpm test`, `pnpm build` run successfully or failures are documented.
- Show before/after screenshots and list modified files.
- Open a PR; do not merge to main without review.
