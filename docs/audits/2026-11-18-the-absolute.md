# The Absolute — application audit and repair log
**Date:** 2026-11-18  
**Repository:** `kevinparksinc-maker/firmament-guardian`  
**Branch:** `main`

## Scope and confidence
This is an evidence-based **source-code and automated-test audit** of the main astrology application. I traced the client router, its pages and core components, the calculation-to-synthesis handoff, provider fallback, persistence, download endpoint, and GitHub Actions test results. **It is not a substitute for a live browser walkthrough.** A passed build does not prove a button works with a real account, location API, timezone or LLM key.

## Root-cause repair results
- **Interpretation contract:** The shared prompt previously displaced route-specific prompts at the beginning of the message array. Fixed ordering; generic weaving now augments rather than replaces individual reading instructions.
- **Oversized focused readings:** Requests observed at approximately **65–145 KB** versus the focused route's **30 KB test limit**. Added method-scoped compact evidence with IDs, method status, bounded direct findings, calculation links, and explicit omitted detail counts. Full technical data is still held by the calculation source; focused prose should not redundantly resend it.
- **Plan and pipeline:** Prior 42 failures included Master Interpreter planning, Horary follow-up, focused placements and transit summaries. Subsequent CI confirmed these previously failing suites passing.
- **Aspect contract:** Deterministic code and agreed policy use **five full-weight majors**: conjunction, sextile, square, trine, opposition (five-degree orb). The three minor aspects have half weight. Corrected stale contradictory tests instead of changing working calculation behavior.
- **Provider chain:** Verified in source: Gemini → Groq → OpenRouter for configured keys. Repaired the incomplete Gemini SDK test mocks and modernized the outdated Anthropic-only error tests; provider errors are sanitized. Keys and real provider responses are **not** verified by tests using mocks.
- **Routing:** Removed the main app's Sports Lab page route and index entry. Independent event-sky viewing at `/transit-sky` now bypasses the natal-profile gate. Removed a duplicate/unreachable Explore route.
- **History:** Fixed old branding and added read-only opening of stored charts and saved readings without regenerating a new chart; retained original records for inspection.
- **Public source ZIP:** Added exclusions for environment files, private keys and standard credential paths, with regression tests.

## Routed-page review matrix
Legend: **Reviewed** = source/navigation and relevant integration inspected. **Automated** = corresponding tests passed in a green full workflow. **Live pending** = no real-browser/device click-through has been performed.

| Route / screen | Code inspection and current decision | Verification still required |
| --- | --- | --- |
| `/` Home | Reviewed profile gate, natal builder, homepage state and chart-load calls. | Create/switch birth profile; persistence; permission errors on phone. |
| `/account` Sign in/register | Reviewed auth mutations, error states and account-session tests. | Register, log in/out on deployed host, cross-device account isolation. |
| `/profiles` Saved profiles | Reviewed device-to-account import entry and profile gate. | Import, switch, edit, delete and relaunch on mobile. |
| `/profile` Birth details | Reviewed natal editor, location and time form, unknown-time state. | Invalid dates, city lookup, sunrise/ASC numerical evidence. |
| `/chart` Chart | Reviewed wheel/diamond, placements, stars/lots, method panel and synthesis; focused request fixed. | Click each planet; show all three mansions and methods; wheel readability. |
| `/reading` Summary | Reviewed `MasterSynthesizerPanel` entry and upstream plan/evidence contract. | Real model narrative quality; check no facts invented and no loops. |
| `/reading/depth` Full interpretation | Reviewed shared reading component and combined plan/chapter path. | Generate full natal/transit/combined reading with real provider keys. |
| `/reading/evidence` Evidence | Reviewed shared reading view and method ledger route tests. | Ensure each visible claim points to actual calculation evidence. |
| `/energy` Energy scanner | Reviewed interactive aspect view, refresh mutation and score code. | Expand every contact; verify totals and 30-minute timings. |
| `/energy/real-life` | Routed through Energy screen. | Validate tab and practical explanations. |
| `/energy/contacts` | Routed through Energy screen. | Validate individual contact cards, orbs and unique prose. |
| `/energy/consultation` | Routed through Energy screen; synthesis API exists. | Real AI consultation and provider failure handling. |
| `/forecast` | Routed through Energy screen; deterministic forecast endpoint exists. | Step through forecast timestamps and local timezone. |
| `/explore` | Reviewed directory search, Horary link and app indexing; removed redundant route. | Search all pages and test every destination. |
| `/guide` | Reviewed homepage guide routing and chart dependency. | Exercise tabs, charts and method drill-downs. |
| `/horary` | Reviewed question form, separate optional natal layer and synthesis tests. | Full cast, follow-up, verdict and 3-ring chart in live browser. |
| `/zodiac-readings` | Reviewed sign-selection controls and mutation/error path. | Change sign/date/time, repeat results and inspect evidence. |
| `/transit-sky` | Reviewed independent event-sky page and fixed no-profile access. | Calculate with no natal profile, resolve city and inspect views. |
| `/sky` | Reviewed sky prototype, XYZ vector import/input validation and screen switches. | Test each visual toggle, map, vector import and location control. |
| `/synastry` | Reviewed matrix and share modal wrapper. | Two-profile comparison, chart overlay and export/share. |
| `/life-story` | Reviewed page entry and corresponding engine regression test. | Generate chapters, navigation, evidence and repeated generation. |
| `/history` | Reviewed protected queries; saved records were not openable. Added read-only views. | Save, sign out/in, reopen old/new records and verify account isolation. |
| `/legacy` | Retained legacy page route (not removed without migration evidence). | Decide when safe to retire old UI. |
| `/404` | Router contains a not-found route and fallback. | Open unknown URL and test back navigation. |

## Important unresolved items (do not mislabel as fixed)
1. **Live visual/browser QA is pending.** Automated tests and source inspection cannot prove real clicks, responsive mobile display, network/session state, or perceived narrative coherence. Test with a live deployment and authenticated/guest sessions.
2. **Render secrets and deployment connectivity are unverified.** Presence of key entries in `render.yaml` does not mean the running service has valid Gemini/Groq/OpenRouter keys. The active Render workspace must be selected by the owner before deployment resources can be inspected.
3. **Sports backend still exists in the main source.** The sports-specific front-end route and directory entry were removed, but the `simulationLab.predict` tRPC handler and sports files remain until migration to the dedicated standalone application is verified. This is **not** yet a complete codebase separation.
4. **Archive view is read-only**, not a restored editable chart session. It displays saved positions and reading text; full restore-to-chart, version migration and deletion require an explicit product workflow.
5. **No live astronomical benchmark replay** has been performed for the zero-tilt sunrise Ascendant method, star anchors or the full three-frame chart. Existing unit/integration checks are not equivalent to independent astronomical validation.
6. **No real provider-to-provider fallback transaction** has been run against production keys, including oversized provider requests.

## Acceptance criteria before release
- Both workflows complete `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build` and remaining CI checks on the **same final SHA**.
- Browser walkthrough every route above on small-screen Android and desktop, following each reachable button/action.
- Check anonymous, registered, expired-session and connection-failure states.
- Run natal, transit, combined, Horary, focused planet, energy, Zodiac, synastry and life-story output in a real provider environment; validate evidence handoff and coherent reader-facing text.
- Measure prompt bytes and tokens for the heaviest chart, and deliberately trigger Gemini 429/503 to confirm fallback, without disclosing secrets.
- Confirm app scope excludes the sports predictor after standalone migration, not just from navigation.
- Capture reproducible issue notes and screenshots for each live-page failure, and fix those failures before claiming the application is fully audited.

## CI baselines
- Beginning of this audit: `5927685` — **405 passed / 42 failed** (447 tests).
- After core pipeline repairs: `e7fa20e` — **422 passed / 25 failed** (447 tests).
- After focus/major-aspect repairs: `5cdc538` — **443 passed / 5 failed** (448 tests).
- `ae423429`: **Verify The Absolute** and **CI** both succeeded, including type check, tests and build. Commits after this point require their own final-SHA verification.
