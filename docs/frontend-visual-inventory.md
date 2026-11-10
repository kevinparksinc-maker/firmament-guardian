# The Absolute — Frontend Visual Inventory (Phase 0)

**Status:** Phase 0 source and first-viewport route inventory completed. Thirteen active route/section destinations were captured at 390px, 768px, and 1440px (39 loaded-state screenshots), and local UI checks were performed. No visual redesign or scoring changes have been made. Some secondary interactions and nested/below-fold module states still need a live manual pass; see “Audit coverage and limitations.”

## Scope and guardrail

The attached visual brief is a presentation refactor, not an astrology/calculation-engine rebuild. This inventory records route ownership, presentation modules, stylesheets/assets, and data entry points before proposing UI changes. The reported conjunction-scoring concern is kept separate: `client/src/pages/EnergyPage.tsx` and `client/src/components/ProfileHomeScreen.tsx` each contain a local `conjunction: 0` map. This is recorded for a dedicated calculation review; this visual pass must not change it.

## Active route inventory

Routes are registered in `client/src/App.tsx` and wrapped in a shared provider/shell composition. The router currently handles profile gating and named routes in one component.

| Route(s) | Page composition | Main observed data/API boundary |
| --- | --- | --- |
| `/`, profile tab destinations | `pages/Home.tsx` + `components/ProfileHomeScreen.tsx`; section selection is driven by `PROFILE_TABS` | `trpc.hybrid.calculate`, `trpc.hybrid.geocode`, `trpc.auth.me`, `trpc.history.saveChart` |
| `/synastry` | `pages/SynastryPage.tsx` + `components/SynastryMatrixTab.tsx` | Client-side paired-chart view and synastry calculation helpers; profile data/context supplies inputs |
| `/energy` | `pages/EnergyPage.tsx` | Uses profile/chart/transit presentation components; scoring constants are currently colocated in the UI page and also partly repeated in `ProfileHomeScreen.tsx` |
| `/explore` | `pages/ExplorePage.tsx` | Directory/navigation surface; includes saved-profile and feature entry points |
| `/sky` | `pages/SkyHomePrototype.tsx` | `trpc.hybrid.calculate`, geocode; composes multiple chart, transit, behavioral, and interpretation visualizations |
| `/life-story` | `pages/LifeStoryPage.tsx` + `components/LifeStoryDashboard.tsx` | `trpc.hybrid.calculate`, profile context, generated life-story content |
| `/horary` | `pages/HoraryPage.tsx` | `trpc.horary.open`, `trpc.horary.followUp`, `trpc.hybrid.geocode` |
| `/zodiac-readings` | `pages/ZodiacHoraryPage.tsx` | `trpc.zodiacHorary.read` |
| `/history` | `pages/History.tsx` | `trpc.history.charts`, `trpc.history.readings`, `trpc.auth.me` |
| `/guide`, `/profile` | Reuse `pages/Home.tsx` with section props | Same Home data boundary; profile navigation config in `client/src/config/profileNavigation.ts` |
| `/404` and fallback | `NotFound` in `App.tsx` | No feature data |

`CelestialCommandShell` composes `GuardianNavigation` and `PrimaryProfileNavigation`, while Home also presents its profile section navigation. This creates multiple navigation surfaces whose hierarchy should be deliberately retained or simplified in one shared navigation plan rather than restyled independently.

## CSS, design tokens, and visual ownership

Nine authored CSS files were found under `client/src/`:

| Stylesheet | Lines | Current owner |
| --- | ---: | --- |
| `index.css` | 328 | Global styles/tokens and broad overrides |
| `components/CelestialCommandShell.css` | 121 | App shell |
| `components/GuardianNavigation.css` | 169 | Global navigation |
| `components/ChartObservatory2050.css` | 655 | Chart observatory |
| `components/Guardian2050.css` | 35 | Welcome/hero component |
| `components/HoraryChamber2050.css` | 18 | Horary presentation |
| `components/Interpreter2050.css` | 12 | Interpreter presentation |
| `components/SynastryDualOrrery.css` | 8 | Synastry visualization |
| `pages/ZodiacHoraryPage.css` | 61 | Zodiac Horary page |

At the captured source revision, `index.css` contains 16 `!important` occurrences and `CelestialCommandShell.css` contains 1. A raw scan finds 713 hexadecimal color tokens across TSX files (occurrences, not distinct colors). These source counts support the brief’s observation that global, shell, page, and component styling are mixed; they do not imply that every hardcoded color must be replaced in one pass.

Styling ownership is inconsistent: some feature stylesheets sit beside their component/page; much of the UI is expressed inline through Tailwind classes; global CSS and shell CSS both participate in the application theme. `ChartObservatory2050.css` is a particularly large feature stylesheet (655 lines).

## Large presentation surfaces and duplication candidates

Line counts are navigation aids, not proof that a file is poorly designed. Larger active surfaces include:

- `components/SynastryMatrixTab.tsx` — 1,017 lines
- `pages/SkyHomePrototype.tsx` — 1,063 lines (active at `/sky` despite “Prototype” in its name)
- `components/NatalProfileBuilder.tsx` — 994 lines
- `components/LifeStoryDashboard.tsx` — 716 lines
- `components/ProfileHomeScreen.tsx` — 647 lines
- `pages/Home.tsx` — 502 lines
- `pages/EnergyPage.tsx` — 500 lines
- `pages/ExplorePage.tsx` — 378 lines

`ProfileHomeScreen` and `EnergyPage` are duplicate-presentation candidates for the Energy Read according to the visual brief, with local aspect score maps in each. Before extracting shared view components, compare their props/data contracts and keep all score computation and mappings untouched. Likewise, standardize chart containers/legends around `DiamondChart`, `GuardianDiamondCharts`, `ChartWheel`, and observatory views without changing chart geometry or positions.

## Assets and navigation baseline

`client/public/assets/` contains `firmament-starfield.png` (about 1.5 MB) and `firmament-inner-peace-528hz.mp3` (about 1.4 MB); public icons and a web manifest are also present. These are existing resources to inventory for reuse, not an instruction to add new imagery or alter branding.

At 390px width the header’s brand/profile controls compress substantially while the fixed five-item mobile dock remains present. At desktop width the global header presents additional entries (Sky, Life Story, Horary, Synastry, etc.) alongside the primary section nav. The original two images at `baseline-screenshots/home-*.png` record the earlier blocked/loading state. The live captures are in `baseline-screenshots/live/` and show the local demo profile.

- [Mobile 390px route contact sheet](baseline-screenshots/live/mobile-contact-sheet.png)
- [Tablet 768px route contact sheet](baseline-screenshots/live/contact-sheet-768.png)
- [Desktop 1440px route contact sheet](baseline-screenshots/live/contact-sheet-1440.png)
- [Home at 390px](baseline-screenshots/live/home-390.png) · [Chart at 390px](baseline-screenshots/live/chart-390.png) · [Energy at 390px](baseline-screenshots/live/energy-390.png)
- Individual captures: `baseline-screenshots/live/{route}-{390,768,1440}.png` for 13 routes/sections (`home`, `chart`, `energy`, `reading`, `explore`, `guide`, `profile`, `synastry`, `horary`, `sky`, `life-story`, `zodiac-readings`, `history`).

## Baseline capture limitation

The regular `pnpm dev` command attempted an install and stopped at `ERR_PNPM_IGNORED_BUILDS`. `pnpm ignored-builds` identified `@google/genai@2.32.0`, `esbuild@0.25.12`, `protobufjs@7.6.6`, and `sweph@2.10.3-8`; no `allowBuilds` setting was added, and no blocked lifecycle script was approved or executed. Inspection showed that the installed `esbuild` binary responds with version 0.25.12 and `require("sweph")` loads successfully. The visual audit therefore used the already-installed executable directly, without changing pnpm’s security policy:

```bash
./node_modules/.bin/tsx server.ts
```

The app serves the integrated frontend at `http://127.0.0.1:3000/`; `GET /health` returns `200 {"ok":true}`, and a tRPC `auth.me` request returns the local demo account. The startup logs `OAUTH_SERVER_URL is not configured`; local demo mode still renders the routes, but external OAuth flows are not verified. Reproduce screenshots after starting the server and using a browser/device viewport of 390×844, 768×1024, or 1440×1100. Do not add credentials to the repository or weaken the build-script policy to reproduce this audit.

## Functional boundaries for the visual project

Keep existing calculations and contracts unchanged while changing presentation:

- Swiss Ephemeris and astronomy/coordinates/Ascendant/Equal House calculations
- Fixed-star anchors, chart geometry, God View / Agent View values
- Nakshatra, Manzil, Chinese mansion, decan, dasha, Ashtakavarga, and timing calculations
- Horary doctrine and judgment, synastry calculations, and Energy scoring
- Existing tRPC/API schemas, profile persistence, authentication, and premium entitlement behavior

Presentation components should consume existing chart/transit/interpretation results. Avoid introducing a second scoring implementation in shared visual components.

## Recommended implementation order after Phase 0

1. **Fix shared-shell overflow and undersized controls** across 390/768/1440 before per-page polish; preserve accessible routing and at least 44×44px primary touch targets.
2. **Consolidate tokens and foundations**: define one source of truth for colors, type, spacing, radii, surfaces, focus, reduced motion, and safe-area variables. Replace global overrides only after confirming affected components.
3. **Unify shell and navigation**: choose the hierarchy between global navigation, mobile dock, and profile tabs; preserve route/access behavior.
4. **Extract only shared presentation primitives** after comparing current props and visual differences: headers, cards, section headings, chart frames, loading/empty/error states. Keep feature data flow local.
5. **Pilot one screen pair** (Home Energy module and Energy page) with the scoring engine and contracts frozen; compare output values before/after to ensure the visual work did not alter calculations.
6. **Apply the visual language screen by screen**, beginning with onboarding/profile separation and the Home/Horary first screen, then Chart/Guide/Sky and narrative tools. Validate loaded, loading, error, empty, premium, keyboard, safe-area, reduced-motion, and device behavior as each surface is touched.

Do not remove the `/sky` route, component showcase, prototype material, CSS rules, or duplicated score logic based on naming or appearance alone. Establish actual usage and behavior first.


## Phase 0 completion: loaded-state audit

The application was started with the already-installed `tsx` executable; no package install scripts were run. The rendered routes show the local demo seeker, chart content, and the API-backed shell, rather than the earlier loading placeholder. The screenshot directory now contains 39 first-viewport captures (13 destinations × 390/768/1440 widths), 13 complete-height mobile captures at 390px, three viewport contact sheets, and 10 selected interaction-state captures. The mobile full-page overview is [here](baseline-screenshots/live/full-mobile/contact-sheet-full-mobile.jpg); individual full pages are in `baseline-screenshots/live/full-mobile/`.

### Route-by-route visual audit

| Screen | Loaded-state observations | Redesign direction |
| --- | --- | --- |
| `/` Home | Personalized welcome and Big Three/data cards lead into a very long dashboard; the first mobile viewport is mostly hero/shell before the broader chart content. | Make the first screen answer “what matters now?” with a shorter hero and a few clear, compact insight cards; keep deeper chart data scrollable. |
| `/chart` Chart | Loaded chart workspace exposes two chart geometries, Agent/God views, and 25 expandable technical modules, including house rulerships, lunar mansions, decans, and fixed stars. Long, dense, and content-heavy. | Keep expert depth, but group it into a deliberate summary → chart → expandable technique-library hierarchy. The examples’ card-grid treatment can make house summaries scannable without altering chart geometry or values. |
| `/energy` Energy | A dedicated energy/transit analysis screen with many metrics and supporting material; its visual/data surface overlaps with the Home profile dashboard’s Energy presentation. | Share presentation primitives with Home while maintaining one source of truth for the existing scoring logic. |
| `/reading` Readings | Editorial, text-forward reading page; more narrative and dense than the chart/metrics screens. | Adopt the references’ clear editorial hierarchy and break long interpretation into readable sections with “why this” evidence disclosure. |
| `/explore` Explore | Directory-style entry point with distinct featured tools and library groupings. | Preserve the catalog role, but normalize card sizing, headings, and category grouping across destinations. |
| `/guide` Guide & Patterns | Loaded 12-gate guide/interactive view with many filters, controls, and calculation panels; among the densest routes. | Provide a short overview first, then progressive disclosure for technical frameworks; establish a consistent tab/category pattern. |
| `/profile` Profile / onboarding | A demo seeker is already named in the shell while the screen also presents “Load Profile” and create-profile onboarding content. This mixes “current profile” and “first profile” states. | Split empty/onboarding from existing-profile management and make the active state explicit. |
| `/synastry` Synastry | Relationship-focused tool with a distinct rose/pink accent language against the broader cyan/gold shell. | Keep relationship-specific cues, but bring card, typography, spacing, and status styles under shared tokens. |
| `/horary` Horary | Focused question experience, but at 390px the introductory framing precedes the question form, pushing the key action down the page. Optional advanced overrides and location fallback are present. | Put the question field and primary action at the top, with doctrine/advanced controls progressively disclosed. Do not touch judgment logic. |
| `/sky` Sky Map | Broad living-sky observatory with many technical controls and visual subsystems; it has the largest number of visible interactive elements in the DOM scan. | Give the user one clear primary view and group secondary lenses/tools, especially at mobile widths. |
| `/life-story` Life Story | Clear unlock/empty state in the local demo session; no generated story is assumed. | Keep the empty state, but distinguish unavailable data, premium gating, and an actual generation action. |
| `/zodiac-readings` Zodiac readings | Twelve-sign content surface with its own editorial/astrological presentation. | Reuse the common card and reading hierarchy while retaining sign-specific accent cues. |
| `/history` History | Private archive with a clear empty state in the demo account. | Retain a distinct archive state and align it with the shared empty-state pattern. |

The user’s three mobile examples are visual references, not an instruction to copy another app’s brand. The intended cues are clear: dark, immersive backgrounds; purposeful image-backed cards; a compact 12-house grid; elemental balance cards; and editorial reading typography. The Absolute can keep its own identity while reducing uncontrolled glow/color variation and giving technical content a more consistent card grammar.

### Responsive and interaction checks

A read-only browser scan measured every route at exact 390px, 768px, and 1440px CSS viewport widths. All 39 measurements show horizontal document overflow. The document width is 461px at a 390px viewport, 879px at 768px, and 1676px at 1440px. The overflowing elements trace to the shared navigation/shell: at 390px the global menu-toggle edge is at x=461; at 768px it is at x=879; on desktop the global navigation/profile group extends to about x=1669. This is a cross-route, all-breakpoint defect to fix before visual polish.

The visible-clickable bounding-box scan also found numerous controls below 44px in at least one dimension. At 390px, the detected under-44px counts were: Home 56/72, Chart 61/100, Energy 18/64, Readings 34/48, Explore 7/26, Guide 88/105, Profile 24/35, Synastry 18/26, Horary 8/16, Sky 187/202, Life Story 5/13, Zodiac readings 5/26, and History 6/11. These counts are DOM target rectangles, not a claim that every small text link is unusable; they identify the shared header controls, dense technical buttons, and small icon actions for a focused 44×44px touch-target pass. The app was evaluated in a desktop browser’s CSS viewport emulation, not on a physical Android device; safe-area, device keyboard, native gesture, and screen-reader behavior remain unverified.

Verified local interactions:

- The mobile navigation drawer opens, its `/energy` destination navigates correctly, and the drawer closes after the route changes.
- The mobile bottom dock links to the primary sections.
- The saved-profile switcher opens a dialog and Escape closes it. Profile creation/saving was not submitted.
- Chart geometry (North Indian/Circular Wheel) and Agent/God view selectors change their selected visual state. The selected state is conveyed by classes/color; the view buttons do not expose `aria-pressed` or `aria-selected` in the inspected markup.
- The chart’s accordion controls expose `aria-expanded`; the planetary-placement accordion opened. Vedic Nakshatras, Arabic Manzils, Chinese Lunar Mansions, Decans, and Fixed Star panels were expanded and captured at mobile width.
- The Horary “Advanced · manual house overrides (optional)” disclosure opens and closes; the initial question/location controls render. The question was not submitted, so no chart judgment or external generation was triggered.

The Chart and Horary screens had no visible `[role=tooltip]` in their initial DOM state; native `title` attributes exist. Transit-location dropdown behavior, all 25 chart accordions, every Guide tab, premium checkout, account/OAuth, and every form-validation/error state were not exhaustively exercised. OAuth cannot be verified in this environment because `OAUTH_SERVER_URL` is unset. No premium purchase or external action was attempted.

Selected interaction screenshots are in `baseline-screenshots/live/interactions/`; the full set of expanded chart-module samples is in `baseline-screenshots/live/interactions/modules/`.

### Build-script/runtime notes

The ignored entries were inspected, not approved or executed:

| Dependency | Declared lifecycle hook(s) | Audit assessment |
| --- | --- | --- |
| `@google/genai@2.32.0` | `preinstall` is a no-op; `prepare` declares `node scripts/prepare.js`, but that file is absent in this installed package. The package imports successfully. | No lifecycle execution needed for the local app to boot. |
| `esbuild@0.25.12` | `postinstall: node install.js`, which installs/checks the platform binary. | Existing binary reports 0.25.12; do not rerun the hook merely for screenshots. |
| `protobufjs@7.6.6` | `postinstall: node scripts/postinstall`; the present script checks a dependent package’s `versionScheme` and may warn. | Pure-JS dependency; no native build is indicated by the hook. It is not directly importable from the app root. |
| `sweph@2.10.3-8` | `preinstall` generates binding source; `install` runs `node-gyp-build && npm run test`; rebuild invokes `node-gyp rebuild` and a calculation smoke test. | The hook can compile native code and is the highest-impact script. It was not run/approved. The installed module loads and the existing server renders chart data. |

No `allowBuilds` policy or equivalent was changed. `pnpm dev` remains unsuitable in this sandbox because it invokes installation and stops at the ignored-build gate; direct `./node_modules/.bin/tsx server.ts` successfully serves the local UI/API for visual verification. Do not commit generated lock/workspace artifacts created by that failed startup attempt.

### Proposed shared visual system (planning only)

This is a direction for the next phase, not an implementation in this branch. Consolidate the existing `:root` tokens rather than introducing a competing palette:

| Role | Existing token/value | Proposed use |
| --- | --- | --- |
| Canvas | `--obsidian: #080B14` | Primary page background; retain restrained starfield texture. |
| Raised canvas | `--midnight: #101628`; `--card: 229 32% 10%` | Panels and card elevation; use a small number of consistent surface levels. |
| Main text | `#E8EDF7` / `--foreground` | High-contrast titles and body copy. |
| Muted text / lines | `--muted-foreground`; `--border` | Supporting labels, dividers, and quiet metadata. |
| Primary focus | `--celestial-gold: #D9B66F` | Primary actions, selected state, active profile. |
| Sky-data accent | `--electric-cyan: #22D3EE` | Live/active sky values and focus; not a second generic CTA color. |
| System/secondary accent | `--royal-violet: #8B5CF6` | Secondary celestial categories. |
| Relationship/contrast accents | `--harmony-teal: #2DD4BF`; `--friction-coral: #FB7185` | Reserve for domain meaning, not decoration. |
| Focus | Existing `:focus-visible` cyan outline | Preserve visible keyboard focus, with adequate contrast on every surface. |

Use the already-loaded font families: Manrope/DM Sans for interface and body, DM Mono for degrees/orbs/coordinates/status, and Playfair Display sparingly for large editorial headings. A consistent 4/8/12/16/24/32/48 spacing scale and a small set of 12/16/24px card radii should replace per-page improvisation. Keep card edges and imagery purposeful; avoid making every card glow or every feature a different color. At mobile, use a three-column 12-house grid only for very compact glyph/label summaries; use two columns when titles or supporting details need room, preserving readable text and touch targets.

The proposed information hierarchy is: (1) answer/primary action, (2) concise summary cards, (3) chart or visual evidence, (4) expandable doctrine/technical detail. The narrative pattern should read **what → evidence → why it matters → optional deeper method**, using plain-language summaries before astrological terminology. Technical values should retain units, time/orb, source/provenance, and clear status labels. On mobile, make key reading and question tasks visible early; let the deeper 25-module observatory remain available without making it the first impression. On desktop, keep module navigation inside the viewport and avoid a permanently overlong global header. Reuse shared components such as `PageHeader`, `SummaryCard`, `MetricCard`, `StatusBadge`, `ChartFrame`, `EvidenceDisclosure`, and `Empty/Loading/ErrorState`; keep calculations and page-specific domain behavior in their current feature owners.

### Priorities and boundaries for the next implementation phase

1. Fix global horizontal overflow and test the shared header/dock at 390/768/1440 before touching per-page ornamentation.
2. Establish design tokens and a shared card/type/spacing/focus system, using the supplied images as loose layout inspiration.
3. Separate onboarding from saved-profile management; compact the Home first screen and move the Horary question input/primary action upward.
4. Pilot the shared card language on one safe pair (Home/Energy) and compare calculation outputs before/after. Do not move or duplicate scoring.
5. Apply the system to Chart/Guide/Sky and the narrative tools, preserving 12 houses, the God/Agent values, ephemeris results, fixed-star anchors, all lunar mansion/decan data, Horary doctrine, Synastry, Energy scores, tRPC schemas, profile persistence, auth, and premium entitlements.
6. Finish with real-device Android checks for 44×44px targets, keyboard/focus, safe areas, reduced motion, loading/error/empty/premium states, and representative module accordions.

No visual redesign, CSS cleanup, calculation change, or account/premium mutation was made during this audit. The legacy `/sky` route and current calculation owners remain in scope until a later behavioral review explicitly proves a replacement is safe.
