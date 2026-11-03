# ACIF coordinate integrity — implementation status

## Authoritative measured coordinate layer
- Swiss Ephemeris Moshier, geocentric equatorial Cartesian XYZ, mean equator/equinox of date.
- Right ascension = normalize(atan2(Y,X) * 180/pi), declination = atan2(Z,hypot(X,Y)).
- No sidereal flag, Aldebaran mode, ayanamsha, or arbitrary rotation.
- Counterclockwise display: x=cx-R*sin(RA), y=cy-R*cos(RA).
- Reference regression: Dallas 1986-11-20 16:06 UTC, ten bodies.

## Unresolved integration boundaries — DO NOT CLAIM COMPLETE
1. **Fixed stars**: shared/hybrid.ts FIXED_STARS is a symbolic longitude catalog, NOT equatorial XYZ/RA. Wheel now withholds false star RA placements pending verified catalog and matching epoch/frame. Other consumers still use symbolic values and require migration.
2. **Houses and angles**: fallback Swiss houses_ex is an ecliptic angle, not equatorial RA. sunriseAscendant.ts accepts external sunrise XYZ but is not supplied automatically by calculateChart. Need historical sunrise provider and explicit equatorial horizon alignment. House occupancy currently mixes RA with legacy ecliptic ASC when no sunriseAnchor exists; DO NOT represent as verified.
3. **Zodiac, nakshatras, decans, mansions, strengths**: shared/hybrid.ts interprets numbers as ecliptic zodiac longitude; passing RA directly is not equivalent. These must be separated by typed coordinate frames and an explicitly approved mapping. Current overlays are legacy, not verified under ACIF.
4. **Nodes**: Swiss equatorial node output requires independent verification of the chosen mean/true model.
5. **Transits and synthesis**: downstream interpretation consumers require a frame audit and traceable evidence.
6. **Validation**: execute pnpm check, pnpm test, pnpm build on CI before merging. These were not run by the connector.

This change is deliberately a **review PR**, not a production deployment. Do not merge until downstream frame mismatches are corrected and the tests pass.
