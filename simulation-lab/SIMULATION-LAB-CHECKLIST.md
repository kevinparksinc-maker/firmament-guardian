# Firmament Simulation Lab Checklist

## 1. Project foundation

- [x] Separate browser-based Simulation Lab project created independently from the Firmament engine.
- [x] Private GitHub repository created for the Simulation Lab.
- [x] Dark observatory-style dashboard interface implemented.
- [x] Responsive layout implemented for desktop and smaller screens.
- [x] Persistent sidebar navigation implemented.
- [x] Dashboard sections created for overview, simulation runs, frame inspection, event library, engine versions, validation rules, and the future AI Pattern Lab.
- [x] Engine boundary clearly labeled so the separate simulator does not silently replace or modify the authoritative Firmament formulas.
- [x] WebDev server, database, user, and authentication capability added to the project.

## 2. Existing Firmament engine connection

- [x] Authoritative Firmament calculation modules copied into the separate simulator engine boundary.
- [x] Existing prediction logic reused rather than replaced with invented formulas.
- [x] Fixed-background calculation path preserved.
- [x] Tropical ephemeris input preserved.
- [x] Fixed J2000 ecliptic compatibility frame preserved.
- [x] Hamal configuration boundary represented as 13° Aries.
- [x] Fixed-star background is treated as non-drifting within the current adapter boundary.
- [x] God View calculation connected.
- [x] AgentView calculation connected.
- [x] Baseline fixed-background prediction connected.
- [x] Territorial prediction output preserved.
- [x] KP Stellar prediction output preserved.
- [x] Combined baseline prediction preserved.
- [x] Chart placements preserved.
- [x] House placements preserved.
- [x] Planetary placements preserved.
- [x] Ascendant and local sidereal time preserved.
- [x] Lunar mansion, star lord, sub-lord, retrograde, and house metadata preserved.

## 3. Input workflows

### Current fixture workflow

- [x] Built-in terminal fixtures available for repeatable tests.
- [x] Browser fixture button available for a quick single-game calculation.
- [x] Current built-in browser fixture is New York Yankees versus Houston Astros.
- [x] The fixture includes sport, date, time, location, latitude, longitude, teams, and actual winner.

### CSV workflow

- [x] CSV upload control added to the dashboard.
- [x] CSV rows normalized into the engine input contract.
- [x] Accepted column aliases supported for common fields such as team names, venue, date, latitude, longitude, and winner.
- [x] Required fields validated.
- [x] Sport values validated for MLB, NBA, NFL, and boxing.
- [x] Date and time values validated.
- [x] Latitude and longitude ranges validated.
- [x] Actual winner values validated as A, B, or TIE.
- [x] Invalid rows retained with their original row number and validation error.
- [x] Valid and invalid row totals reported after import.
- [x] Source filename and source description supported.
- [x] Dataset version metadata stored.
- [ ] Downloadable sample CSV template not yet added.

### Planned live schedule workflow

- [ ] Choose a date in the interface.
- [ ] Choose a sport in the interface.
- [ ] Retrieve games for that date and sport from a sports-data provider.
- [ ] Display the retrieved games as selectable cards.
- [ ] Simulate one selected game without requiring CSV preparation.
- [ ] Store the provider and source metadata for each retrieved game.

## 4. Database and persistence

- [x] Dataset table created for imported or retrieved event collections.
- [x] Normalized event table created.
- [x] Simulation run table created.
- [x] Per-event simulation result table created.
- [x] Dataset row counts stored.
- [x] Dataset validation status stored.
- [x] Run status stored as queued, running, complete, partial, or failed.
- [x] Completed event count stored.
- [x] Failed event count stored.
- [x] Run summary stored as JSON.
- [x] Per-event raw calculation output stored as JSON.
- [x] Per-event calculation errors stored.
- [x] Run progress can be polled through the API.
- [ ] User-facing run history page not yet added.
- [ ] Resume and cancellation controls not yet added.

## 5. Simulation execution

- [x] Single-event simulation procedure implemented.
- [x] Batch simulation procedure implemented.
- [x] Batch size supports up to 10,000 events through the API contract.
- [x] Asynchronous persisted batch runner implemented.
- [x] Each event is calculated independently.
- [x] Each event result is persisted independently.
- [x] Failed events are recorded instead of silently disappearing.
- [x] Progress updates are persisted as events complete.
- [x] Unverified games remain separate from accuracy calculations.
- [x] Historical actual winners can be used to score methods.
- [x] Future games without actual winners can be simulated without being scored.

## 6. The two calculation frames

| Frame | Plain-language meaning | Current purpose |
|---|---|---|
| **God View** | The fixed-background perspective using the permanent chart reference and the Hamal/13° Aries configuration boundary. | Tests whether the fixed-background reading supports the actual outcome. |
| **AgentView** | The event-local perspective using the moving observer or local horizon. | Tests whether the local event environment supports the actual outcome. |

- [x] God View output preserved separately.
- [x] AgentView output preserved separately.
- [x] Each frame receives its own method results.
- [x] Each frame receives its own hit total.
- [x] Each frame receives its own miss total.
- [x] Frame agreement is reported as strong agreement, split decision, or no clear call.
- [x] Frame-specific methods are labeled in the Game Brief and terminal report.

## 7. Current method checklist

The engine currently exposes **20 method families per frame**. Because each method is evaluated in both God View and AgentView, a game currently produces **40 frame-method evaluations**: 20 in God View and 20 in AgentView. A method name appearing in both frames is not automatically a duplicate calculation; it represents that method evaluated in two different chart perspectives.

| # | Method | What it examines in plain language |
|---:|---|---|
| 1 | **Cluster territory & house-lord placement** | Examines territorial control, relevant houses, and the placement or strength of the ruling house lords associated with each competitor. |
| 2 | **Nakshatra influence** | Examines lunar-mansion influence and the associated stellar rulership relationships affecting the event chart. |
| 3 | **Essential dignity** | Examines traditional planetary strength or weakness based on the sign and condition of the planets involved. |
| 4 | **Chaldean Decans** | Examines the decan subdivisions of signs and their Chaldean rulership associations. |
| 5 | **Planetary war** | Checks whether close planetary competition or equal-strength planetary conflict affects the result. |
| 6 | **Arabic Lots** | Examines calculated points derived from chart positions and relationships, including competitive or outcome-related lots. |
| 7 | **Nine-planet influence** | Combines the influence of the nine tracked planetary bodies used by the engine, including the node axis. |
| 8 | **Fixed-star amplifications** | Examines whether fixed-star contacts or amplifications strengthen or weaken a side. |
| 9 | **Retrograde condition** | Checks whether retrograde status changes the strength or interpretation of relevant planets. |
| 10 | **Lunar flow** | Examines the Moon’s movement, condition, and relationship to the event and competing sides. |
| 11 | **Chart-wide aspects** | Examines broader aspect relationships across the chart rather than a single isolated placement. |
| 12 | **Moon phase / VOC** | Checks the Moon phase and whether the Moon is void of course or otherwise limited in its normal signaling. |
| 13 | **Nodes (Rahu/Ketu)** | Examines the north and south lunar nodes and their chart relationships. |
| 14 | **Upachaya growth** | Examines growth-oriented houses and whether their condition supports development, improvement, or competitive advantage. |
| 15 | **Via Combusta** | Checks whether relevant placements fall within the traditionally difficult Via Combusta zone. |
| 16 | **Besiegement** | Checks whether a planet or relevant significator is constrained between difficult influences. |
| 17 | **Mutual reception** | Checks whether planets occupy one another’s signs or otherwise exchange rulership support. |
| 18 | **Translation of light** | Checks whether an intermediary planet transfers or connects influence between relevant significators. |
| 19 | **Harmonious vs friction aspects** | Compares supportive aspects against stressful or conflicting aspects. |
| 20 | **KP Star → Sub → Sub–Sub chain** | Examines the layered KP stellar chain from star lord through sub-lord and sub-sub-level relationships. |

### Per-method implementation inventory

Every method below is **implemented and connected to the vendored Firmament engine** in both chart frames. Each method receives the generated event chart, planetary placements, house placements, fixed-background coordinates, relevant stellar data, and the competitor-side mapping required by that method. Each method outputs a side-A score, side-B score, selected side or tie, method detail, source, and a verification status when an actual result is available.

| Method | Current status | Primary inputs used | Current outputs |
|---|---|---|---|
| Cluster territory & house-lord placement | Implemented — connected | Event houses, house lords, territorial clusters, competitor mapping | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Nakshatra influence | Implemented — connected | Lunar mansions, star lords, planetary placements, competitor mapping | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Essential dignity | Implemented — connected | Planet signs, dignity state, relevant significators | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Chaldean Decans | Implemented — connected | Sign decans, Chaldean rulers, relevant planetary placements | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Planetary war | Implemented — connected | Close planetary relationships, comparative strength, competitor mapping | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Arabic Lots | Implemented — connected | Calculated lots, chart positions, house relationships | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Nine-planet influence | Implemented — connected | Nine tracked bodies, signs, houses, stellar relationships | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Fixed-star amplifications | Implemented — connected | Fixed-star contacts, fixed-background longitudes, relevant planets | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Retrograde condition | Implemented — connected | Planet retrograde flags, affected significators, chart context | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Lunar flow | Implemented — connected | Moon longitude, lunar condition, movement, event chart | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Chart-wide aspects | Implemented — connected | Cross-chart aspects, planetary positions, competitor mapping | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Moon phase / VOC | Implemented — connected | Moon phase, void-of-course state, lunar relationships | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Nodes (Rahu/Ketu) | Implemented — connected | Node positions, houses, signs, stellar relationships | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Upachaya growth | Implemented — connected | Growth-house placements, house lords, planetary condition | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Via Combusta | Implemented — connected | Planet longitudes, fixed-background zone checks, affected significators | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Besiegement | Implemented — connected | Neighboring planetary influences, significators, chart context | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Mutual reception | Implemented — connected | Planet signs, rulership relationships, relevant significators | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Translation of light | Implemented — connected | Intermediary planet relationships, aspect paths, significators | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| Harmonious vs friction aspects | Implemented — connected | Supportive and stressful aspects, planetary relationships | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |
| KP Star → Sub → Sub–Sub chain | Implemented — connected | Star lord, sub-lord, sub-sub chain, house allegiance, stellar placements | Side scores, selected side, detail, HIT/MISSED/NOT EVALUABLE |

### Method result fields

- [x] Method name retained.
- [x] Method source retained.
- [x] Score for side A retained.
- [x] Score for side B retained.
- [x] Method winner retained as A, B, or TIE.
- [x] Method verdict retained as HIT, MISS, TIE, or UNVERIFIED internally.
- [x] Terminal output distinguishes HIT, MISSED, and NOT EVALUABLE instead of hiding ties or unverified results inside the miss count.
- [x] Method detail text retained.
- [x] Frame source retained.

## 8. Game Brief interface

- [x] Plain-language result appears before technical chart details.
- [x] System call displayed using team names.
- [x] Actual result displayed using team names.
- [x] Baseline HIT or MISS displayed.
- [x] God View selection displayed.
- [x] AgentView selection displayed.
- [x] Frame agreement displayed.
- [x] Evidence-strength label displayed.
- [x] Evidence score displayed.
- [x] “Why did the system say that?” explanation displayed.
- [x] Supporting HIT methods listed.
- [x] Conflicting MISS methods listed.
- [x] Every listed method labeled as God View or AgentView.
- [x] Hit count badge displayed.
- [x] Miss count badge displayed.
- [ ] NOT EVALUABLE count and status badge displayed in the browser Game Brief.
- [x] Technical chart audit remains available below the Game Brief.
- [x] Planetary placement table displayed.
- [x] Houses displayed.
- [x] Ascendant displayed.
- [x] Actual result verification displayed.
- [ ] Individual method expanders with detailed explanations not yet added.
- [ ] Sorting and filtering of methods not yet added.
- [ ] Printable Game Brief report not yet added.

## 9. Terminal simulation runner

- [x] `npm run simulate` command added.
- [x] `pnpm run simulate` command added.
- [x] Terminal command runs without opening the browser UI.
- [x] Each game receives a game number.
- [x] Each game prints its matchup, sport, location, and start time.
- [x] Each game prints the final simulated result using team names.
- [x] Each game prints baseline HIT or MISS.
- [x] Each game prints all 20 God View methods.
- [x] Each game prints all 20 Agent View methods.
- [x] Each method prints HIT, MISSED, or NOT EVALUABLE.
- [x] Each method prints its prediction.
- [x] Each method prints its A and B scores.
- [x] Each game prints total hits out of 40.
- [x] Each game prints total hit percentage.
- [x] Each game prints God View hits out of 20.
- [x] Each game prints Agent View hits out of 20.
- [x] Aggregate method ranking printed from highest hit rate to lowest hit rate.
- [x] Aggregate method rows include method name.
- [x] Aggregate method rows include view.
- [x] Aggregate method rows include HIT count.
- [x] Aggregate method rows include MISS count.
- [x] Aggregate method rows include NOT EVALUABLE count.
- [x] Aggregate method rows include hit rate.
- [x] Aggregate method rows include games tested.
- [x] Average total hits per game printed.
- [x] Average God View hits per game printed.
- [x] Average Agent View hits per game printed.
- [x] Overall hit percentage printed.
- [x] Best-performing method printed.
- [x] Worst-performing method printed.
- [x] Methods with zero hits printed.
- [x] Unusually high hit-rate methods printed.

## 10. Automatic exports

- [x] JSON export generated after every terminal simulation run.
- [x] CSV export generated after every terminal simulation run.
- [x] Filenames include a UTC timestamp.
- [x] JSON contains the complete report.
- [x] JSON contains raw engine results for every game.
- [x] JSON contains every method result in both frames.
- [x] CSV contains one row per method per game per frame.
- [x] CSV includes game number.
- [x] CSV includes game ID.
- [x] CSV includes view.
- [x] CSV includes method.
- [x] CSV includes HIT or MISS result.
- [x] CSV includes Boolean hit value.
- [x] CSV includes prediction.
- [x] CSV includes actual result.
- [x] CSV includes side A and side B scores.
- [x] CSV includes method detail text.
- [x] Generated exports are stored in the `simulation-results/` directory.
- [x] Generated exports are excluded from source checkpoints so repeated runs do not clutter the repository.

Example output filenames:

```text
simulation-results-2026-09-14-232001.json
simulation-results-2026-09-14-232001.csv
```

## 11. Testing and validation

- [x] Authentication logout test passes.
- [x] CSV validation tests pass.
- [x] Engine adapter tests pass.
- [x] Terminal report tests pass.
- [x] All current automated tests pass.
- [x] TypeScript check passes.
- [x] Production build passes.
- [x] Live single-event API test passes.
- [x] Live method-level Yankees–Astros test passes.
- [x] Terminal two-game report test passes.
- [x] JSON export generation verified.
- [x] CSV export generation verified.

The current verified terminal run contains **2 games**, **80 total frame-method evaluations**, **40 aggregate view-method rows**, and timestamped JSON and CSV exports.

## 12. Not yet implemented

- [ ] Automatic date-and-sport game lookup from an external sports-data provider.
- [ ] Sports-data provider credentials and provider selection.
- [ ] Daily games selection screen.
- [ ] One-click simulation of a selected live schedule game.
- [ ] Sample CSV download button.
- [ ] Manual single-game entry form.
- [ ] Full run history interface.
- [ ] Dataset management interface.
- [ ] Run cancellation and resume controls.
- [ ] Method-level score expanders in the browser.
- [ ] Method filtering and sorting in the browser.
- [ ] Download buttons for reports from the browser.
- [ ] AI Pattern Lab for discovering recurring conditions across many games.
- [ ] Statistical significance, confidence intervals, and calibration analysis.
- [ ] Large historical dataset ingestion and 10,000-plus-game backtest.
- [ ] Cross-sport method comparison dashboard.

## 13. Quick commands

Run the complete terminal report:

```bash
cd /home/ubuntu/firmament-simulation-lab
npm run simulate
```

Run the test suite:

```bash
pnpm test
```

Run TypeScript validation:

```bash
pnpm check
```

Build the application:

```bash
pnpm build
```

## References

[1]: https://github.com/kevinparksinc-maker/firmament-simulation-lab "Firmament Simulation Lab source repository"
