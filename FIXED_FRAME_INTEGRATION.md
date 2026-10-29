# Fixed-frame production integration contract

STATUS: prototype geometry and synthetic tests only; NOT production-wired.

1. Supply geocentric direction vectors in one explicitly identified inertial reference frame. Swiss calc_ut Moshier with sidereal flag is sidereal-of-date, not an inertial Cartesian vector. Omitting the sidereal flag alone does not produce ICRS. Barycentric Moshier calculations are unsupported.
2. Numerically calibrate the fixed plane and Aldebaran direction from documented ephemeris and star-astrometry sources; record origin, reference axes, epoch, time scale, proper motion and numerical constants. No guessed offsets.
3. Replace safeCalc, topocentricMoonLongitude, and canonicalLocalSiderealAngle together in server/astronomy.ts. Do not mix coordinate frames.
4. The fixed-chart-pipeline local hour angle arguments MUST already be expressed in the calibrated frame. Do not pass tropical sidereal time without a verified transformation.
5. Preserve shared/hybrid.ts elemental-family decan ruler mapping, 27 Nakshatras and 28 Arabic Manzils. Implement Chinese mansion boundaries from their own dataset; equal 28-fold indexes are not a substitute.
6. Connect Natal, Transit, Horary, Synastry, Energy Read and God/Agent views to the single canonical provider. Conjunctions are harmonious; only five major aspects.
7. Synchronize premium Simulation Lab to the same provider, house conventions and calibration, then validate its historical fixtures and 100000-game batch.
8. Run npm run check and npm test, plus Dallas November 20 1986 10:06 CST end-to-end regression; check houses, nodes, lunar parallax, aspect wraps, retrogrades, DST, and displayed overlays.
9. Merge only after real app API charts (not synthetic test vectors) use the new engine and both repositories pass validation.

Do not describe the current branch as complete until these gates pass.