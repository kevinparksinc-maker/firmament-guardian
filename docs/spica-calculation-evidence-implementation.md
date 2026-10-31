# The Absolute — Spica Reference & Calculation Evidence Implementation Brief

**Status:** Implementation specification only. No production calculation changes authorized by this document.
**Target:** Manus / frontend and astronomy implementation team
**Branch:** `feature/spica-calculation-evidence-spec`

## Mission
Make the app show its work: **“Don't Just Read the Stars. Understand the Calculation.”** Every chart result should disclose its input, coordinate frame, formula, provenance, and verification status. Use a consistent Spica-anchored fixed-star reference once numerically validated.

## Existing implementation: inspect before changing
- `server/astronomy.ts` currently uses Swiss Ephemeris `sweph`, sidereal mode 14 (Aldebaran at Taurus 15°), `MOSHIER_FLAGS = 4 | 256`, `SIDEREAL_FLAG = 65536`, and `safeCalc()` for geocentric planetary positions.
- `canonicalLocalSiderealAngle()` uses `sw.sidtime(jd)*15 + observerLongitude - babylonianAyanamsha(jd)`.
- `server/firmament-geometry.ts` uses `calculateZeroTiltAscendant(thetaCanonical)` with `ASC = normalize(thetaCanonical + 90)`, `DSC = normalize(ASC + 180)`, and `MC = normalize(thetaCanonical)`.
- Existing equal-house logic and energy scoring must remain intact during the reference-frame experiment.

## Phase A — Audit and isolated Spica reference
1. Document the exact Swiss Ephemeris version, flags, ephemeris backend, and star-catalog API available in the installed package.
2. Implement a **separate** `spica-fixed` frame adapter, preserving the current `firmament-aldebaran-15-taurus` path as a baseline.
3. Define the intended Spica anchor as **Libra 0° = 180°**. Specify the exact reference plane, epoch, catalog identifier, and coordinate transform. Do not conflate a fixed coordinate frame with a tropical ecliptic longitude subtraction; distinguish transformations clearly.
4. Treat Aldebaran ~45.9°, Hamal ~13.8°, and Antares ~225° as **provisional check targets** until recalculated and sourced within the same frame. A single star constrains zodiac zero but does not fully define a 3D basis.
5. **Never apply a second -24° shift.** Avoid double-applying the existing sidereal flag and ayanamsha.
6. Compare frame output on 1986-11-20 16:06 UTC, Dallas, TX, for Sun, Moon, all planets, ASC, DSC, MC, and house cusps. Show full numeric longitude and arcminute differences. Verify the local time conversion (10:06 CST = 16:06 UTC).
7. Include independent reference calculations in the same coordinate frame. Do not label unverified results as accurate. Do not merge or switch the canonical engine until results are reviewed.

## Phase B — Calculation evidence data contract
Implement a shared, serializable evidence record generated from **actual** computations, not illustrative UI constants:

```ts
type CalculationEvidence = {
  objectId: string;
  resultLongitudeDeg?: number;
  resultLatitudeDeg?: number;
  displayValue: string;
  frameId: string;
  frameEpoch?: string;
  input: {
    localDate?: string; localTime?: string; timezone?: string;
    utcIso?: string; julianDay?: number;
    latitudeDeg?: number; longitudeDeg?: number;
    observerMode?: "geocentric" | "topocentric";
  };
  engine: { name: string; version: string; flags?: number; model?: string };
  source: { catalog?: string; reference?: string; url?: string };
  steps: Array<{
    name: string; formula: string;
    operands: Record<string, number | string>;
    result: number | string; units?: string;
  }>;
  validation: {
    status: "verified" | "unverified" | "not-applicable";
    fixtureId?: string; referenceValue?: number;
    angularDifferenceArcmin?: number;
    notes?: string[];
  };
};
```

Keep a separate chart-level evidence envelope (timestamp, stable version identifier, canonical inputs, engine and frame versions). Distinguish a reproducibility identifier from a cryptographic proof of accuracy.

## Phase C — Required formula traces
For every supported item, show **the actual active formula and numeric operands**:
- Zodiac: `signIndex = floor(normalize(longitude)/30)`; `degreeInSign = normalize(longitude)%30`.
- DSC: `normalize(ASC+180)`.
- Equal house cusp n: `normalize(ASC+30*(n-1))`.
- Equal-house assignment: `1+floor(normalize(planetLongitude-ASC)/30)`.
- Separation: `min(abs(a-b),360-abs(a-b))` after normalization.
- Aspect orb: `abs(separation - targetAngle)`; use existing 5° rule where active.
- ASC/MC: show current zero-tilt local-sidereal computation and exact `thetaCanonical` input. Label this as the app's **experimental zero-tilt convention**, not standard observational horizon geometry.
- Planet: show Swiss flags, raw returned longitude and applied frame transform. Avoid fabricating a heliocentric-vector trace when the active engine uses `sweph`.
- Mansion/decans/fixed-star contacts: show actual boundaries, reference tables, and source citations used by that module.
- Energy Read: show aspect pairs, orbs, weights, counts, subtotals, and reconciliation to displayed totals.

## Phase D — UI and certificate
- Add a compact **How was this calculated?** affordance to Sun/Moon/planet, ASC/DSC/MC, houses, aspects, fixed stars, Nakshatras, Arabic Manzils, Chinese mansions, decans, and Energy Read.
- Reusable mobile-first evidence drawer: **Inputs**, **Fixed-star reference**, **Formula & operands**, **Verification**.
- Adopt the ongoing frontend redesign's shared dark/gold/cyan tokens; do not introduce another styling pass. Keep primary chart clean and panels collapsed by default.
- Provide **Calculation Certificate** with inputs, UTC/JD, frame, star anchor, all positions, angles, houses, method/engine version, reproducibility ID, and clearly labeled validation status.
- Support copy and export (PDF or document), using the actual chart data; omit private location or birth details from public sharing unless the user explicitly chooses to include them.
- Design one evidence contract usable by God View, Agent View, Natal, Transit, Synastry, Horary, Harmonic Flow Clock, and later Simulation Lab.

## Phase E — Tests and delivery
1. Determinism: same input + versioned engine/config = same record.
2. Every UI result equals its trace value; no placeholder or fabricated verification.
3. Zodiac boundaries, 0°/360° wrap, aspect orb, mansion boundary tests.
4. ASC/DSC 180°; equal houses 30°; house assignment at cusps.
5. Energy Read totals reconcile exactly to component weights.
6. No duplicate frame offset and no cross-frame mixing.
7. Regression fixture: Dallas 1986-11-20 10:06 CST / 16:06 UTC.
8. Full test suite; loaded desktop and Android screenshots (not loading-state screenshots).
9. Report changed files, formulas, independent comparison, tests, unresolved data/source questions.
10. **Do not merge into main without explicit approval.**

## Delivery sequencing
Coordinate with frontend Phase 1–3. First ship the isolated frame comparison and evidence schema; then UI components and certificate; then integration and verification. Preserve existing behavior while Spica calibration is unverified.

**Definition of done:** A user can inspect any supported chart value and learn what was calculated, from which inputs and data, under which frame and formula, with a reproducible trace and honest verification status.
