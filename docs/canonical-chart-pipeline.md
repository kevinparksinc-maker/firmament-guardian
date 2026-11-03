# The Absolute — canonical chart pipeline and formula contract

Status: implementation contract; do not mark fully integrated until tests, persistent storage and consumer audit pass.

## One foundation; two permanent natal projections; dynamic event snapshots

1. A UTC instant enters the single planetary engine in `server/master-planetary-positions.ts`.
2. Swiss Ephemeris returns geocentric equatorial Cartesian `(x,y,z)` for each body. For the current equatorial wheel:
   - `RA = mod360(atan2(y,x) * 180/pi)`
   - `DEC = atan2(z,sqrt(x*x+y*y)) * 180/pi`
   - `distance = sqrt(x*x+y*y+z*z)`.
   - The resulting angle is **equatorial right ascension**, not conventional ecliptic zodiac longitude. The wheel must not silently rotate it or interpret it as a different coordinate system.
3. God View draws those fixed-wheel angular positions with no sunrise or observer Ascendant.
4. Natal Agent View uses those **same natal planet positions**, plus the sunrise horizon/house stage below. Save God and Agent results together under a versioned profile/birth-data key.
5. Transit is a new timestamp: request planetary positions for that instant, and its **own** sunrise/Ascendant for the event location/time. Cache exact timestamp/location results; never substitute natal ASC.
6. Reading engines (energy, sensory, horary, synastry, simulation, life story, Kabbalah and other traditional methods) consume saved natal and selected transit/event snapshots. They may compute their own method-specific relationships, but must not calculate alternative natal planetary positions.
7. The Synthesizer consumes the same versioned chart context and method evidence. Frontend renders these results and does not independently call Swiss Ephemeris.

## The Absolute sunrise-anchored angular formula

For local event date and coordinates, resolve the sunrise timestamp and sample **Sun equatorial XYZ at sunrise** using the same planetary engine.

- `sunRA = mod360(atan2(sunY,sunX)*180/pi)`
- `sunDEC = atan2(sunZ,sqrt(sunX^2+sunY^2))*180/pi`
- `H0 = -acos(-tan(latitude)*tan(sunDEC))` (convert degrees/radians consistently).
- `sunriseAnchor = mod360(sunRA + H0)`
- `elapsedHours = (eventUTC - sunriseUTC) / 3600000`
- `eventASC = mod360(sunriseAnchor + elapsedHours*(360.98564736629/24))`
- `houseCusp(n) = mod360(eventASC + (n-1)*30)`, for `n=1..12`.
- `houseOf(body) = floor(mod360(bodyRA-eventASC)/30)+1`.

This is the app's specified fixed-equatorial sunrise model, **not** the conventional ecliptic Ascendant. If the event precedes the local sunrise, use the previous appropriate sunrise anchor. Reject impossible polar sunrise geometry rather than inventing a result. External sunrise sourcing and historical-source evidence remain unresolved; current provider is an estimate.

## Reuse contract

- On profile creation or birth-data change, compute/save one Master Natal Record: planetary XYZ, God positions, Agent ASC/houses, calculated methods, evidence, engine version.
- On profile access, fetch the saved valid natal record; recalculate only if absent, invalidated by changed birth data, or invalidated by an engine/mapping version change.
- On event access, fetch or calculate the transit snapshot keyed by UTC instant, event coordinates, sunrise anchor provenance and engine version.
- Every feature calls a shared chart-context service; **calling the calculation function is not equivalent to retrieving saved results**.
- On changes to interpretation rules, invalidate only dependent interpretations; preserve unchanged astronomical records.
- For synastry, fetch two existing natal profiles. For horary, use an event/question chart without creating a natal profile unless a new person's birth chart is actually requested.
- Process-local caches are optimizations only; durable persistence is required for true calculate-once-across-restarts behavior.

## Current integration and blockers

- `server/chart-snapshot-service.ts` now shares exact chart requests within a server process; `server/routers.ts` calls it instead of directly invoking `calculateChart` at the updated call sites.
- `server/masterChart/builder.ts` already contains `getMasterNatalChart` with a 64-entry process-local cache. Integrate it with durable profile storage rather than creating a second permanent natal engine.
- Audit and migrate all other `calculateChart` and `buildUnifiedMasterChart` callers, especially reading bridges and method pipelines.
- Verify Swiss Ephemeris planet identifiers/flags, right-ascension versus zodiac mappings, fixed-star outputs, node coordinates, sunrise sourcing, transit ASC, and validation evidence before deployment.
- Add tests: same UTC → identical God angles across locations; natal ASC stable; transit ASC changes with event time/location; same snapshot request reuses result; profile changes invalidate natal; no cross-profile cache collision; restart reads persisted natal; interpretation consumers never recalculate ephemeris.
- Run full typecheck, tests, build, CI, and verify deployed API/frontend before merge to main.

Do not silently change the formulas, frame definitions, or existing interpretation weights while migrating consumers.
