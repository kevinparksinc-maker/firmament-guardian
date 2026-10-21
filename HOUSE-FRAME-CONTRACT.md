# 12 Gates of the Firmament — Natal House Integrity

## Guardian's canonical natal Equal House numbering

Guardian's astronomical Ascendant is calculated by Swiss Ephemeris in `server/astronomy.ts`.
Its natal/Agent house numbers must remain zodiac-forward:

- House cusp n: `(Ascendant + 30*(n-1)) mod 360`
- House assignment: `floor(((longitude-Ascendant) mod 360)/30)+1`
- Planet longitudes are never adjusted to achieve a layout.

**Regression fixture:** Dallas natal chart with Ascendant Capricorn 07°22′ and
Sun Scorpio 28°02′ has **Sun in House 11**, not House 3.

## Visual geometry is NOT a house-numbering operation

A user describing Sagittarius as *behind* Scorpio describes the presentation,
not permission to renumber their natal houses. Orient the chart as desired in SVG
or CSS while preserving the canonical house labels.

## Simulation Lab

Simulation Lab Premium currently has an intentional reverse-numbered experimental
house framework. Its labels may be converted explicitly with
`translateHouseLabelBetweenFrameworks()` only when genuinely comparing the
same longitude and Ascendant in the same frame. Guardian MUST NOT inherit
Lab house numbering for natal interpretation.

Regression tests: `server/houseFrameContract.test.ts` and
`server/astrology-rules.test.ts`. Verify all tests and live rendering before release.
