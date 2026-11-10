# Firmament Guardian — Profile UI architecture and acceptance audit

## Stack
React 19 + TypeScript + Vite + Tailwind CSS + Wouter + tRPC.

## Canonical post-profile routes

| Route | Responsibility |
|---|---|
| `/` | Intake when no saved natal profile; otherwise concise `ProfileHomeScreen` and chart CTA |
| `/chart` | `ProfileChartScreen`: calculated `ChartObservatory2050`, frame and reading-scope controls, evidence and Interpreter links |
| `/reading` | `ProfileReadingScreen`: chart overview, Master Interpreter and complete interpretation |
| `/guide` | Discovery cards, the single `12 Gates of the Firmament` intro, technical evidence, and existing secondary modules |

`PrimaryProfileNavigation` renders exactly these four tabs from `config/profileNavigation.ts` across all routes. Specialized `/horary`, `/sky`, `/history`, and `/zodiac-readings` routes are preserved and retain secondary navigation.

## State and correctness

- `ProfileSessionProvider` is the shared owner of the saved profile and calculated chart. It restores the profile from the existing storage contract and caches a calculated chart across route switches.
- `App.tsx` redirects profile-required routes to the intake route when no saved profile exists.
- The intake builder mounts only with no profile; the modal editor mounts only on explicit user action.
- The calculated diamond chart appears only with a `ChartResult`. Pending/unavailable states never masquerade as calculated planetary positions.
- `shared/chartRules.ts` exports `MAJOR_ASPECT_ORB_DEGREES = 5`. `server/astronomy.ts` uses that value in major transit-aspect detection, and `Home.tsx` derives the matching evidence labels from it.
- Frame and reading-scope controls were moved from old post-profile Step 1 into the Chart screen.

## Removed or moved

- Removed the duplicate legacy homepage hero and the pre-profile promotional teasers.
- Deleted more than 300 lines of dead post-profile Step 1/Step 2 forms.
- Removed the obsolete global Interpreter scroll-jump and the former local three-button workspace switch.
- Moved Home, Chart, Reading and Guide content into dedicated presentational components.
- Moved discovery and technical work to Guide, and full long-form interpretation to Reading.
- Retained the deterministic calculations and traditional astrology engines; no astronomical calculation rules were removed.

## Acceptance checks

| Check | Status |
|---|---|
| Four distinct primary routes and single shared nav configuration | Implemented; regression test |
| Profile required for all non-home routes | Implemented |
| No post-profile intake forms mounted by default | Implemented |
| Chart is prominent in its route and not beneath chat/carousel | Implemented |
| No false calculated positions when chart unavailable | Implemented |
| Duplicate legacy homepage hero removed | Implemented |
| Major transit orb 5° is shared with its UI labels | Implemented |
| Existing readings and traditional technical evidence still reachable | Code preserved; live navigation not yet manually verified |
| Full route-level/375px mobile acceptance | Not yet manually verified |
| Manus deployment at the tested commit | Not yet verified |

## Important follow-up technical debt

This Guide evidence has now been extracted into its own `ProfileGuideScreen` component, alongside `ProfileHomeScreen`, `ProfileChartScreen`, and `ProfileReadingScreen`. The former `Home.tsx` monolith is now a smaller route/session controller, and Chart, Reading, and Guide are lazy-loaded for mobile entry performance. Future changes should not reintroduce duplicate rendering or modify astrology calculations. The CI pipeline verifies TypeScript, tests, bundling, auditing and Docker packaging; it is not a browser/device screenshot test or proof of Manus deployment.
