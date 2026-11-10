# The Absolute — Energy Read V2

## Canonical chart source
Use `calculateChart()` in `server/astronomy.ts` and preserve its `firmament-aldebaran-15-taurus` reference frame. The repository currently uses `sweph` with `MOSHIER_FLAGS = 4 | 256`, sidereal mode 14 and `SIDEREAL_FLAG = 65536`. Preserve the zero-tilt ascendant from `server/firmament-geometry.ts` and degree-precise Equal Houses from `server/astrologyCore.ts`. Do not recalculate positions in a second engine or double-apply the ayanamsha.

## Energy scoring
Score all 10 natal planets against all 10 transit planets, one qualifying aspect per pair, using angular separation `min(abs(normalize(a-b)),360-abs(normalize(a-b)))`. Maximum orb is 5 degrees inclusive.

Planet weights: Saturn 5, Sun 5, Mars 5, Moon 5, Jupiter 5, Pluto 5, Uranus 5, Mercury 4, Neptune 4, Venus 3.

Harmony aspects: conjunction 0 degrees weight 5; trine 120 weight 5; sextile 60 weight 3; quintile 72 weight 2.

Friction aspects: opposition 180 weight 5; square 90 weight 5; quincunx 150 weight 3; semisquare 45 weight 2.

Exclude semisextile, biquintile and sesquiquadrate. No extra aspects or modifiers.

Orb intensity: 0–1 degrees inclusive = 5; >1–2 = 4; >2–3 = 3; >3–4 = 2; >4–5 = 1.

Each aspect score = natal planet weight + transit planet weight + aspect weight + orb intensity. Sum separately by polarity. Friction percentage = 100 * friction points / (friction points + harmony points); harmony is the complement. If no aspects qualify, show no qualifying contacts, not an invented neutral 50/50. Do not round intermediate calculations.

## Houses and power structures
Keep natal and transit God House and Agent House for every contact. Houses identify the real-life area affected, never increase or decrease numerical scores. For each contact explain the natal planet's intrinsic power/source, transit planet's activating force, aspect channel, exact orb and intensity, natal and transit houses, and concrete manifestations. Include fixed stars, rulers, elements, dignities, decans, nakshatras, Arabic manzils, Chinese mansions, yogas, dasha, lots and other available canon only when the chart engine actually supplies supported evidence. Never invent a power source or double-score overlays. Distinguish natal predisposition from present transit trigger.

## Master Interpreter
Synthesize the contact ledger into ONE coherent human story: WHAT is happening, WHY these aspects combine, HOW it manifests in decisions, work, finances, communication, relationships, responsibilities and inner life, CONSEQUENCES of impulsive or deliberate responses, and MEANING / actionable countermeasures. Prioritize by score, repetition, shared planets, shared house themes and convergent power structures. Explain people as relationship roles (authority, partners, family, peers), never claim to identify enemies or intentions. Include strongest harmony as available resources and strongest friction as pressure. Provide plain-language details expandable into raw chart evidence. Avoid asserting astrological scores are measured probabilities.

## UI
Energy Read card: Easy Flow / Mixed / Friction, percentage meter, harmony/friction point totals, qualifying aspect counts, timestamp and timezone, source ephemeris/reference frame, natal and transit placements with sign/degree/house, God/Agent comparison, sorted aspect ledger, score component breakdown, click-to-expand interpretations, and next-shift time computed from repeated canonical ephemeris calculations (never fabricated). Saved profile and live transit location should feed the same chart API. For ties show equal numeric totals and Mixed.

## Acceptance tests
Test 0, 1, 2, 3, 4, 5 degree orb boundaries and rejection above 5; 359-to-1 wrap; all 8 aspect definitions and both polarities; Saturn(5) opposite Moon(5) at orb 3.19 => 17; Neptune(4) semisquare Mercury(4) at orb 0.21 => 15; no contacts; tie; deterministic ordering; zero house influence on score; no duplicate pair; wrong reference frame rejection; identical longitudes and houses to `calculateChart()`; timezones and DST; natal and transit locations separately; documented Swiss Moshier flag and mode 14; no duplicate ayanamsha; consistent God/Agent view; explain every scored aspect; no fabricated timing. Existing `aspectBetween()` supports only five aspects and must not be reused as the complete Energy Read V2 aspect detector.

## Manus integration instructions
Implement a pure `server/energyReadV2.ts` scoring module with unit tests, then wire it to the existing chart API, Energy Read UI and Master Interpreter. Do not change the established astronomy and house geometry, do not merge until integration tests pass, and do not change the approved weights or scoring formula without explicit approval.
