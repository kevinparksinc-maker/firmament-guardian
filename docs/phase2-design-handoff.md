# The Absolute — Phase 2 plug-in design handoff
Status: specification only. Branch based on audit/frontend-phase0. Do not merge Phase 2 presentation code until Phase 1 is reconciled.

## Design goal
An original, premium-feeling, dark celestial observatory: editorial readability first, restrained gold highlights, cyan for interaction and chart inspection, violet for secondary lenses. Do not copy reference screens. Mobile-first, compact, clear, high information density without cramped controls.

## Source evidence
Phase 0 reports 13 routes, 39 viewport checks, 39 horizontal overflow findings, and mixed styles in index.css and CelestialCommandShell.css. Phase 1 owns overflow, shell structure, and touch targets. Phase 2 must not reintroduce these issues.

## Token contract (proposed; implement as scoped tokens after Phase 1)
```css
.the-absolute-theme {
  color-scheme: dark;
  --abs-bg: #060b16;
  --abs-surface: #101a2c;
  --abs-surface-raised: #16243a;
  --abs-surface-soft: #0c1423;
  --abs-border: #34465d;
  --abs-text: #f4f0e8;
  --abs-muted: #b8c7d8;
  --abs-gold: #e8c987;
  --abs-cyan: #7ce5ed;
  --abs-violet: #bba4f1;
  --abs-rose: #e6a5c3;
  --abs-good: #8fd7b0;
  --abs-mixed: #f0ce89;
  --abs-friction: #ed9c9c;
  --abs-radius-sm: 10px;
  --abs-radius-md: 16px;
  --abs-radius-lg: 24px;
  --abs-space-1: 4px;
  --abs-space-2: 8px;
  --abs-space-3: 12px;
  --abs-space-4: 16px;
  --abs-space-5: 24px;
  --abs-space-6: 32px;
  --abs-shadow: 0 16px 44px rgba(0,0,0,.28);
  --abs-focus: 0 0 0 3px rgba(124,229,237,.5);
}
```
Use existing fonts where installed: Playfair Display for editorial headings, Manrope for UI and body. Base text 16px, small metadata >=12px, body line-height 1.55–1.7. Do not rely on color alone for status. Never use decorative glow on every card; reserve glow for selected/active states.

## Reusable presentation-only component contracts
Create under client/src/components/absolute-ui/ after checking Phase 1 component ownership. Do not import ephemeris, scoring, tRPC or astrology math into these components.
- AbsoluteSection: title, eyebrow?, description?, action?, children. Consistent vertical rhythm and semantic headings.
- AbsoluteCard: children, tone='default'|'gold'|'cyan'|'violet'|'rose', interactive?, selected?. Interactive only if actual button/link semantics are supplied.
- MetricTile: label, displayValue, description?, evidence?, status?; strings/numbers supplied by parent. No calculations.
- PlanetPlacementCard: planetName, glyph, signLabel, degreeLabel, houseLabel?, dignityLabel?, onInspect?. Display-only.
- HouseCard: houseNumber, signLabel, cuspDegree?, rulerLabel?, occupants[]; never derive house assignment.
- ElementBalanceCard: elements supplied as {name,value,label}[]; do not derive scores or normalize unless the parent provides display-ready percentages.
- MansionCard: tradition, mansionName, degreeRangeLabel?, occupants[], interpretation?; occupied/unoccupied status comes from parent, not inferred in UI.
- ChartFrame: title, frameLabel ('God View'/'Agent View'), children, legend?, evidence?. Never transform coordinates or change SVG geometry.
- ReadingSection: heading, summary, paragraphs[], evidence?, expanded?; native disclosure and accessible headings.
- EnergyStatusCard: statusLabel, scoreLabel?, windowLabel?, nextShiftLabel?, suggestions[], evidence?, chartSlot?. Status, numeric scores and timings supplied by existing engine.
- StatePanel: kind='loading'|'empty'|'error'|'locked', title, message, action?; distinguish missing data from paywall.

## Homepage order (profile loaded)
1. Compact top identity + active profile switcher (do not duplicate Phase 1 global navigation).
2. Energy Read hero: Easy Flow/Mixed/Friction, source-backed score and current time window, next shift if available, short do/avoid guidance; tap to expand evidence and natal/transit chart. Never invent missing timing.
3. North Indian diamond chart with explicit God View / Agent View toggle or paired panels according to available screen width; preserve actual house and planet geometry.
4. Big Three / core placements summary.
5. Compact insights carousel and 12-house preview grid.
6. Element balance and planetary placements.
7. Expandable techniques: Nakshatras, Arabic Manzils, Chinese mansions, decans, fixed stars, dasha, Ashtakavarga, and other existing methods. Do not omit any technique; group for scanability.
8. Saved profiles and quick actions where not already accessible from global nav.
When no profile exists, show intake as the primary action and do not display fake personal readings. Existing-profile management is a separate state.

## Screen-specific patterns
- /energy: same EnergyStatusCard presentation as Home, deeper evidence and transit timeline. Keep local scoring implementations unchanged during visual work; record duplication for a separate calculation review.
- /chart: summary -> diamond chart -> planets/houses -> technical library. Keep North Indian default and circular optional. Expose God/Agent labeling clearly.
- /reading, /life-story: editorial narrative; concise verdict, what/why/how/consequence/meaning, concrete manifestations, evidence disclosures. Preserve actual generated content and premium gates.
- /horary: question input and submit near top; advanced overrides behind disclosure; never change judgment.
- /synastry: two-profile context visible; rose as accent only; preserve paired chart contracts.
- /sky: primary sky visualization first, secondary lenses in disclosures; preserve geometry and controls.
- /guide: overview then technique groups, accessible filtering.
- /explore, /history, /profile, /zodiac-readings: shared cards, headings, loading/empty/locked patterns; preserve routing.

## Responsive acceptance
390px: one-column hero, 2-column compact house tiles only when labels fit, charts scale without clipping, 16px gutters, touch controls >=44x44px.
768px: two-column card groups; chart and evidence may be side by side if content fits.
1440px: bounded content width, no stretched text columns; 12-house grid can use 3–4 columns.
At all widths: document.scrollWidth <= viewport width; no global overflow-x:hidden as a substitute for fixing the cause. Long degrees/labels wrap or truncate with accessible full text. Test Android safe-area and keyboard on real device later.

## Interaction/accessibility
Keyboard reachable, visible focus, semantic headings, aria-pressed on chart view toggles, aria-expanded on disclosures, text labels on flow status, reduced-motion support. Contrast target WCAG AA for normal text. No hover-only explanation. Selected state must remain clear without neon glow.

## Integration order
A. Wait for Phase 1 shell/nav changes to land; rebase this branch onto main before implementing components.
B. Add scoped tokens and a single component showcase route/story (non-production or dev-only).
C. Implement primitives with fixtures and tests; do not add scoring logic.
D. Pilot Home Energy card and /energy using identical visual primitives, compare values against pre-change snapshots.
E. Pilot /chart and /reading; verify God/Agent, mansions, fixed stars and expanded evidence.
F. Roll out to remaining routes, replacing obsolete CSS only after usage checks.
G. Capture loaded, loading, empty, error, premium, and interaction screenshots at 390/768/1440; verify navigation and no regression in calculations.

## Non-negotiable boundaries
No edits to Swiss Ephemeris, Babylonian star anchors, zero-tilt ascendant, equal-house calculation, chart geometry, aspect/scoring maps, mansion/decan calculation, interpretation logic, horary, synastry, tRPC schemas, authentication, saved profile persistence or premium entitlements. Specifically do not 'fix' conjunction: 0 in EnergyPage.tsx or ProfileHomeScreen.tsx during Phase 2: that is a separate calculation review.

## Definition of done
- Consistent tokens and primitives reused on Home, Energy, Chart, Readings and remaining active routes.
- Phase 1 responsive fixes remain intact; 39 viewport checks rerun without horizontal overflow.
- Chart placement values, scoring outputs and API payloads unchanged in before/after snapshots.
- Screenshots for all 13 routes at 390, 768 and 1440 plus meaningful interactive states.
- Tests and TypeScript pass; PR lists exact files changed and any known limitations.
