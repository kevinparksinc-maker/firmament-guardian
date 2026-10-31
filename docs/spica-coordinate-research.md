# Spica frame experiment: Phase A results

The production chart engine remains on `firmament-aldebaran-15-taurus`; the new `spica-fixed` adapter is isolated and is not selected by `calculateChart()`. The Dallas fixture shows that moving-body longitudes change by about 0.918° in the candidate frame, while the ASC and equal-house cusps move by about 2.810°. Those angle differences are material, so the experiment is not ready to replace the canonical frame.

## Installed engine audit

The checkout uses the `sweph` Node wrapper version `2.10.3-8`, backed by Swiss Ephemeris runtime `2.10.03`. The runtime exposes `calc_ut`, `fixstar2_ut`, and `fixstar2`. No `sefstars` or `fixstars` text catalog file was found under `node_modules/sweph`, although `fixstar2_ut("Spica", ...)` returned a named-star result. The source of that runtime catalog data remains unresolved. Swiss documents `fixstar2_ut` and the newer `sefstars.txt` catalog path; its manual warns that legacy `fixstars.cat` is outdated for new use. [1]

The existing production path uses `MOSHIER_FLAGS = 4 | 256`, `SIDEREAL_FLAG = 65,536`, and sidereal mode 14. Its requested flag value is `65,796`. The isolated apparent-position adapter uses Moshier, speed, J2000, ICRS, and equatorial flags (`133,412`) and deliberately omits `SEFLG_SIDEREAL`; it does not call the Aldebaran ayanamsha. The separate geometric benchmark uses Swiss `TRUEPOS | NOABERR | NOGDEFL` in addition to the J2000/ICRS/equatorial flags (`134,708`) so its output can be compared with JPL geometric vectors.

## Candidate frame definition

The frame is `spica-fixed`, epoch J2000.0, with the IAU 1976/1980 ecliptic plane fixed at J2000.0 and referred to ICRF. The fixed obliquity is 84,381.448 arcseconds. [2]

SIMBAD lists Spica as HIP 65474 and gives its ICRS coordinates at epoch J2000 as RA 13h 25m 11.57937s and Dec −11° 09′ 40.7501″. [4] The adapter converts that unit vector to the fixed J2000 ecliptic using

```text
x_e = x_eq
 y_e = y_eq cos(epsilon) + z_eq sin(epsilon)
 z_e = -y_eq sin(epsilon) + z_eq cos(epsilon)
```

The anchor’s resulting ecliptic coordinates are longitude 203.841357808° and latitude −2.054488650°. A rotation of 336.158642192° about the ecliptic north pole places Spica’s longitude at 180° (Libra 0°) while preserving its nonzero latitude. This is one explicitly defined fixed-frame rotation, not a tropical longitude subtraction followed by the old mode-14 ayanamsha. JPL’s manual documents the J2000 ecliptic plane and its ICRF relation. [2]

For the angle experiment, apparent Greenwich sidereal time is converted to mean sidereal time using the equation of the equinoxes. The mean-equatorial-date angle vector is then precessed to J2000 with IAU 1976 precession angles and rotated into the same fixed ecliptic frame. This is a candidate mapping of the app’s experimental zero-tilt convention, not a validated observational horizon calculation.

## Dallas fixture: baseline versus candidate

The local input is 1986-11-20 10:06 in `America/Chicago`, which the application resolves to 1986-11-20 16:06:00 UTC and Julian day UT 2446755.1708333334. The test suite checks this conversion directly. The baseline is the active Swiss mode-14 chart. Candidate planet positions use the isolated apparent-position flags described above.

Each line shows `baseline → spica-fixed`, followed by signed candidate-minus-baseline differences. Degrees are full ecliptic longitudes in their respective declared frames; arcminutes are the signed difference.

```text
Sun      213.463743323° → 214.381308938°   Δ +0.917565615°  (+55.053937′)
Moon      78.926825536° →  79.844440923°   Δ +0.917615386°  (+55.056923′)
Mercury  198.785082199° → 199.702689478°   Δ +0.917607280°  (+55.056437′)
Venus    190.933698441° → 191.851234087°   Δ +0.917535646°  (+55.052139′)
Mars     301.778008536° → 302.695615337°   Δ +0.917606801°  (+55.056408′)
Jupiter  318.651391552° → 319.568996528°   Δ +0.917604976°  (+55.056299′)
Saturn   225.979821503° → 226.897397943°   Δ +0.917576440°  (+55.054586′)
Uranus   236.550334874° → 237.467900308°   Δ +0.917565434°  (+55.053926′)
Neptune  249.621835334° → 250.539395837°   Δ +0.917560503°  (+55.053630′)
Pluto    193.543062775° → 194.460979939°   Δ +0.917917164°  (+55.075030′)
```

The zero-tilt angle and equal-house comparison is:

```text
ASC  269.503707188° → 272.313553962°   Δ +2.809846774°  (+168.590806′)
DSC   89.503707188° →  92.313553962°   Δ +2.809846774°  (+168.590806′)
MC   179.503707188° → 178.637763200°   Δ -0.865943988°  ( -51.956639′)
```

The house cusps are listed as `house: baseline → candidate; signed difference`:

```text
1:  269.503707° → 272.313554°; +2.809847° (+168.590818′)
2:  299.503707° → 302.313554°; +2.809847° (+168.590818′)
3:  329.503707° → 332.313554°; +2.809847° (+168.590818′)
4:  359.503707° →   2.313554°; +2.809847° (+168.590818′)
5:   29.503707° →  32.313554°; +2.809847° (+168.590818′)
6:   59.503707° →  62.313554°; +2.809847° (+168.590818′)
7:   89.503707° →  92.313554°; +2.809847° (+168.590818′)
8:  119.503707° → 122.313554°; +2.809847° (+168.590818′)
9:  149.503707° → 152.313554°; +2.809847° (+168.590818′)
10: 179.503707° → 182.313554°; +2.809847° (+168.590818′)
11: 209.503707° → 212.313554°; +2.809847° (+168.590818′)
12: 239.503707° → 242.313554°; +2.809847° (+168.590818′)
```

The candidate ASC is not merely the old ASC plus the planetary longitude offset. Its angle mapping first moves a mean-equatorial-date vector into the fixed J2000 ecliptic. The resulting nonzero ecliptic latitude and the differences above make this modeling choice a review item. The active engine’s Sun longitude and ASC remain covered by regression assertions.

## Independent geometric comparison

JPL Horizons was queried at the fixture instant for geocentric vectors centered on Earth (`CENTER=500@399`), using `EPHEM_TYPE=VECTORS`, `TLIST_TYPE=JD`, `TIME_TYPE=UT`, `REF_PLANE=ECLIPTIC`, `REF_SYSTEM=ICRF`, `VEC_CORR=NONE`, and `OUT_UNITS=AU-D`. The response identifies the JPL DE441 target ephemeris and the “Ecliptic of J2000.0” reference frame. [2] [3] The JPL vectors were rotated into the same Spica-fixed frame. They were compared with Swiss Moshier geometric positions using `TRUEPOS | NOABERR | NOGDEFL`; this deliberately does not compare JPL geometric values with the app’s apparent-position outputs.

```text
Body     JPL longitude    Swiss longitude   Swiss − JPL
Sun      214.387057895°   214.387068051°   +0.000609′
Moon      79.844969860°    79.844626755°   -0.020586′
Mercury  199.701231667°   199.701241320°   +0.000579′
Venus    191.850840814°   191.850844231°   +0.000205′
Mars     302.699625770°   302.699569338°   -0.003386′
Jupiter  319.570051704°   319.570105961°   +0.003255′
Saturn   226.904782365°   226.904781293°   -0.000064′
Uranus   237.474475312°   237.474519845°   +0.002672′
Neptune  250.545136067°   250.545115365°   -0.001242′
Pluto    194.467774938°   194.467798556°   +0.001417′
```

The maximum absolute difference is 0.020586 arcminutes (about 1.235 arcseconds), within the test threshold of 0.03 arcminutes. This supports the geometric planetary vector conversion and its implementation. It does not certify the fixed-star catalog provenance, the zero-tilt angle mapping, or the app’s apparent-position path.

## Open review items and current implementation

A runtime probe of Swiss `fixstar2_ut("Spica", 2451545.0, ...)`, with Moshier/J2000/ICRS/equatorial flags, returned RA 201.297052038° and Dec −11.160633760°. That is about 4.891 arcseconds from the SIMBAD anchor coordinates. The installed package contains no star-catalog text file, and the reason for this runtime/catalog discrepancy is not yet known. The adapter therefore uses the sourced SIMBAD coordinates as its explicit anchor and keeps the comparison unverified pending review. [1] [4]

The independent comparison is now reproducible from the captured request parameters and raw DE441 Cartesian vectors in `server/spica-jpl-de441-dallas-1986.fixture.ts`. The regression test reconstructs each Spica-frame longitude from those vectors before comparing it with the Swiss geometric benchmark; it does not rely only on precomputed expected angles.

The implementation also adds `server/spica-fixed-frame.ts` as an isolated experiment and tests its anchor, angle geometry, no-sidereal-flag rule, Dallas UTC conversion, baseline preservation, and ten JPL planet comparisons. It adds a shared `CalculationEvidence` contract and attaches an evidence envelope to `ChartResult`. The envelope contains actual values and formula operands for positions, nodes, angles, house cusps, fixed-star table lookups, topocentric Moon values, and transit contacts. Position records now preserve the raw longitude returned by the original Swiss call alongside the normalized chart value and explicitly state that the app applies no second frame rotation. All current-frame evidence records remain `unverified`; the reproducibility hash is not presented as proof.

The hash now covers the worldview, reading scope, natal/transit house frames, Swiss flags and mode, active major-aspect rules, the fixed-star table fingerprint, wrapper/runtime versions, and the effective observer elevation. Input snapshots distinguish explicit local times, date-only references, and automatically generated current transits. For a natal-only request, current transits are still returned, so the actual auto-generated transit instant is part of the canonical inputs and a later request can correctly have a different identifier. The same complete canonical inputs and configuration remain deterministic. Evidence envelopes are marked private-only and `shareSafe: false`; the public-share redaction/export path is not implemented yet, so these records must not be published as-is. The zero-tilt angle note now calls that convention experimental and not independently validated as standard horizon geometry.

The evidence drawer/certificate UI and detailed Energy Read weight reconciliation remain later phases.

Do not switch the canonical chart engine until the Spica catalog discrepancy, angle mapping, and complete UI-level regression review are resolved. The production Aldebaran mode-14 path remains intact.

Verification for this implementation slice: TypeScript passes, `git diff --check` passes, and Vitest passes all 283 tests across 49 files. The isolated Spica suite includes ten raw-vector JPL geometric comparisons; the chart-evidence suite checks actual outputs, raw-return traces, topocentric inputs, mode-sensitive fingerprints, serialization, private-only status, and determinism for fixed canonical inputs.

## References

[1]: https://www.astro.com/swisseph/swephprg.htm "Swiss Ephemeris Programmer's Manual"
[2]: https://ssd.jpl.nasa.gov/horizons/manual.html "JPL Horizons Manual"
[3]: https://ssd-api.jpl.nasa.gov/doc/horizons.html "JPL Horizons API Documentation"
[4]: https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Spica "SIMBAD Spica record"
