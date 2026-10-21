# 12 Gates — House Frame Contract

## Authoritative Guardian behavior

Source: `server/astrologyCore.ts`. Guardian uses a **forward equal-house** model:
`cusp(n) = normalize(ascendant + 30 × (n-1))` and
`house(lon) = floor(normalize(lon - ascendant) / 30) + 1`.
God View uses the fixed Aries-zero anchor, and Agent View uses the astronomical
Ascendant returned by Swiss Ephemeris `houses_ex(..., "E")` in
`server/astronomy.ts`. Planetary ecliptic longitude is unchanged between frames.

## Simulation Lab divergence — intentional and NOT silently migrated

The separate `firmament-simulation-lab-premium` repository currently uses
**reverse house numbering** in `server/engine/houseFrameFoundation.ts`.
For the same Ascendant and *same longitude coordinate frame*, forward and reverse
labels map as follows:

| Guardian | Lab |
|---|---|
| 1 | 1 |
| 2 | 12 |
| 3 | 11 |
| 4 | 10 |
| 5 | 9 |
| 6 | 8 |
| 7 | 7 |
| 8 | 6 |
| 9 | 5 |
| 10 | 4 |
| 11 | 3 |
| 12 | 2 |

Use `translateHouseLabelBetweenFrameworks()` for **labels only**.
Do not convert longitudes, rotate the wheel, exchange teams, or reinterpret the
physical chart as part of a label translation. Frame anchors, coordinate epochs,
and sign conventions must be verified before any cross-app comparison.

### Example

Scorpio 0° (210°) Ascendant, Sagittarius 10° (250°) object:
Guardian house 2; Simulation Lab house 12. Both refer to the **same** 250°
longitude; only their house numbering convention differs.

## Change-management policy

- The applications **remain deliberately different** until the owner explicitly
  approves one common house-order policy.
- Do not silently rewrite `firmament-simulation-lab-premium` while a separate
  integration is underway.
- Each method/evidence output should include framework identifier, Ascendant,
  and coordinate reference.
- Relevant regression tests: `server/houseFrameContract.test.ts`.
- Wheel display orientation must not be mistaken for house numbering.

This document reconciles the conventions; it does not certify all live renderers.
