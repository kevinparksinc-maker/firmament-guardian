# Stitch integration handoff — Zodiac Horary

## Source files
User-provided `stitch_the_absolute_astrology_redesign (3).zip` contains:
- `stitch_the_absolute_astrology_redesign/zodiac_horary_the_absolute/code.html`
- `stitch_the_absolute_astrology_redesign/zodiac_horary_the_absolute/screen.png`

**This branch contains instructions only, not imported HTML or completed frontend changes.** Manus / Studio must receive the ZIP separately.

## Existing React integration targets
- `client/src/pages/ZodiacHoraryPage.tsx`
- `client/src/pages/ZodiacHoraryPage.css`

## Implementation requirements
1. Compare Stitch's HTML layout and screenshot to the existing screen, then adapt the design into existing React/TypeScript components. Preserve props, hooks, routing, user actions, accessibility, loading/error states and mobile responsiveness.
2. Retain zodiac-sign-as-first-house logic, question entry, verdict computation and evidence.
3. Do **not** change `server/`, ephemeris, Babylonian fixed-star frame, God/Agent calculations, Equal Houses, lunar mansion methods, scoring algorithms, or API contracts.
4. Replace all Stitch demonstration scores, charts, names and dates with the existing live data bindings. Never introduce hardcoded predictions or calculations.
5. Coordinate styling with `feature/stitch-shared-design-system`; minimize CSS collisions and maintain visual consistency with other Stitch screens.
6. Run `pnpm check`, `pnpm test`, and `pnpm build`. Document any failures, and provide mobile/desktop before-after screenshots.
7. Create a PR for review; do not merge or deploy without approval.

## Acceptance
- Every existing feature and control on this page still works.
- Real calculations and profile data remain connected.
- Visual output matches the supplied Stitch preview.
- No engine or backend source files are modified.
