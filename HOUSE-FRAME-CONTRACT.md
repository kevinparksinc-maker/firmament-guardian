# 12 Gates of the Firmament — House Frame Contract

## Agent View: reverse-numbered equal houses

User-approved rule: an Ascendant in Scorpio places **Sagittarius behind Scorpio in House 12**, Capricorn in House 11, Aquarius in House 10, etc.

`server/astrologyCore.ts` is authoritative:
- Normalize `relative = longitude - ascendant` into [0,360).
- Sector `s = floor(relative / 30)`.
- House = 1 if s=0; otherwise `13-s`.
- House 1 cusp = Ascendant; for house n>1, cusp = `ascendant + 30*(13-n)` modulo 360.

Example Scorpio 0° (210°): Scorpio 1, Sagittarius 12, Capricorn 11, Aquarius 10, Pisces 9, Aries 8, Taurus 7, Gemini 6, Cancer 5, Leo 4, Virgo 3, Libra 2.

## God View intentionally separate

God View remains **fixed Aries-zero**, with forward sectors 1=Aries to 12=Pisces; this is a permanent symbolic background grid and **not** the Agent View personal Ascendant scheme.

## Simulation Lab alignment

`firmament-simulation-lab-premium/server/engine/houseFrameFoundation.ts` already uses reverse house numbering. The Guardian Agent View now shares that numbering contract. The two applications can still differ in Ascendant calculation, coordinate frames, or reference epochs; those MUST be checked before comparing results.

`translateHouseLabelBetweenFrameworks()` remains a legacy utility converting *forward labels to reverse labels*, NOT a required conversion from current Guardian Agent to current Lab. No planet longitude, Ascendant, or zodiac sign should be moved by label conversion.

## Visual and downstream caution

`server/astronomy.ts` uses Swiss Ephemeris to compute an astronomical Ascendant; it does not use the Simulation Lab sunrise approximation. All renderers must consume the reversed `chart.houses` values with corresponding house labels; a separate loop that recomputes `ascendant + i*30` may visually conflict with the numbers.

Run `server/houseFrameContract.test.ts`, `server/hybrid.test.ts` and regression tests before deployment. No tests are certified passing until actually executed.
