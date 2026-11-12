# Guardian Canon and synthesis audit

Audited Guardian main at `c596e34012ac54aec9575cb30b3ce56fbc9aa348` and Simulation Lab Premium main at `80bc659d449a135b65c0347a9da6b8e053c7fc12`. Guardian's historical binding at `d7f01ec` identifies the established adapters that disappeared from the current Master Chart builder. The repositories use separate ephemeris providers. Premium's result is an experimental contest interpretation.

## Implementation sequence

1. Inventory meaning records, rule owners, and executable chart outputs. Bind the existing 20-method registry to all three in `server/astrologyKnowledge/canon/methodCatalog.ts`.
2. Restore dropped Guardian adapters and the deterministic judgment-to-synthesis path. Keep distinct base and event ledgers and carry calculation status, evidence IDs, and source provenance through the bridge.
3. Export a versioned doctrine projection for Premium. Build a local graph, rank directional testimony, and detect disagreements from Premium's existing chart and scoring ledgers.
4. Replace the duplicated provider input with a compact evidence package. Validate citations and the declared baseline comparison locally after one primary request.
5. Compare tests, typechecks, and builds with the starting revisions. Leave both branches available for review.

## Calculation and transport inventory

| Stage | Entry points | Observed behavior |
| --- | --- | --- |
| Chart input and projection | `server/astronomy.ts` and `server/astrologyCore.ts` | The public calculator projects Swiss Ephemeris Moshier geocentric J2000 Cartesian vectors through XY bearing. It computes the Agent Ascendant from the sunrise Sun vector and elapsed UTC hours, builds Equal Houses, and keeps the fixed star anchors separate. An observer-dependent Moon correction is carried separately. |
| Alternative calculation sources | `server/fixed-chart-pipeline.ts`, `server/invariant-xyz-provider.ts`, `server/sunrise-ascendant.ts`, and `server/historical-sunrise-provider.ts` | Separate source paths exist. Their presence alone does not prove use by the public Master Chart. External vector and explicit historical sunrise overrides expected by older tests remain disconnected from the live chart entry. |
| Master formation | `server/masterChart/{entry,builder,chartDataBus,registry,types}.ts` | The audited builder emitted 16 layers although the registry declared 20, and had lost transit formation binding. The branch uses the registered roster, restores Sumerian associations, planetary lordship connections, Shadbala, and Bhava Bala, and builds the event formation from the recorded transit instant. |
| Canon retrieval | `server/astrologyKnowledge/calculations/retriever.ts`, `canon/retriever.ts`, and `synthesis/canonApplications.ts` | The active reading bridge calls the calculation-side dossier and binds Canon evidence IDs to calculated IDs. Archived paths contain historical variants and overlapping exports. The branch uses the elemental-family decan lookup for the active dossier and preserves historical decan records. |
| Deterministic judgment | `server/astrologyKnowledge/synthesis/{readingBridge,methodOutcomes,methodRules,normalizer,clustering,synthesizer}.ts` | The audited synthesizer returned generic prose and omitted fields its consumers required. The branch reconnects method outcomes and Canon applications to local propositions, themes, and reported conflicts. Raw values remain in the transport even when a rule cannot interpret them. |
| AI transport | `server/chartMethodOutcomes.ts`, `server/astrologyKnowledge/synthesis/{context,evidenceTransport,narrativePacket,narrative}.ts` | The method endpoint is local. The narrative endpoint ships the source snapshot, raw method outputs, rule judgments, and coverage. Coverage measures local synthesis and can still be incomplete. |
| Sports entry in Guardian | `server/simulationLab/{masterGameChart,sportsPredictor}.ts` and `shared/simulationLab` | Guardian has its own contest occupancy baseline and scorer. Premium uses its established sports path with the exported Guardian reference data. The two scorers remain distinct. |

## Master registry mapping

Each row also has its exact source paths in the typed catalog. The binding references the live layer status, frame, version, source IDs, and evidence IDs. The results remain in the corresponding calculation record.

| Registry method | Meaning and rules | Output and scope |
| --- | --- | --- |
| Western planets and signs | Planet, sign, and planet-in-house Canon | Recorded bodies, degrees, signs, speed and motion |
| Sumerian celestial foundations | Attested Sun, Moon, Venus associations and explicitly modern interpretive lenses | Three associations attached to actual placements |
| Western houses and angles | House meanings, God/Agent definitions and Equal House rule | Local angles and cusps where observer inputs exist |
| Western aspects and orbs | Aspect meanings, contact policy and local method rules | Recorded planetary pairs and orbs. Wider builder contacts remain contextual outside the 5° synthesis policy. |
| Essential dignities | Planet rulership and bounds Canon | Sign condition and rulership from recorded longitudes |
| Royal and fixed stars | Frozen symbolic anchors and historical reference catalogs | Recorded conjunctions by the builder's existing orb |
| Hermetic Lots | Sect variants and individual Lot doctrine | Sect-selected formulas applied to the actual chart |
| Arabic Manazil | 28-sector Manzil teachings | Sector identity and name per body, node and available angle |
| Nakshatras and Padas | 27 mansions and four padas per mansion | Mansion, pada, ruler and shakti per body, node and available angle |
| Vedic Vargas | Parashari division definitions | Existing fixed-frame D1/D2/D3/D9/D10 adapter and divisional houses |
| Dasha and Ashtakavarga | Vimshottari periods and BAV/SAV doctrine | Structured active periods and validated seven-row BAV plus 337-total SAV from existing calculation intermediates |
| Planetary lordship | House topics, traditional cusp rulers and placement Canon | Existing nine-body occupancy, rulership and cross-house connections |
| Graha Drishti | Traditional planetary special aspects | Builder's Mars, Jupiter and Saturn sign offsets |
| Shadbala | BPHS strength doctrine and local fixed-frame variants | Existing sixfold planetary strength adapter |
| Bhava Bala | House strengths and local BPHS variants | Twelve house strengths from the same strength computation |
| Chinese Xiu | Historical determinative-star catalog and Four Symbols | Guardian Master Chart reference-only. Premium calculates its separately labeled right-ascension variant as evidence only. |
| Elemental Decans | 36 same-element sign-family subdivisions | Elemental decan and ruler per body, node and available angle |
| Sefer Yetzirah | Three Mothers, Seven Doubles, Twelve Simples and provenance | Existing correspondence evidence from the chart |
| Genesis patterns and Yogas | Pattern engines, behavioral Canon and configured Yoga detector | Observed participants, houses, normalized strength and explicit Yoga conditions |
| Transit activation | Local transit contacts and contact meanings | Recorded transit-to-base evidence. Event sky also carries its own 20-layer roster. |

The wider knowledge gateway has a 12-family inventory in `server/astrologyKnowledge/methodCoverage.ts`. It covers Western, Genesis Astro, Genesis Patterns, behavior, life events, Canon, Kabbalah, Vedic, Arabic/Persian, lunar, fixed-star, and timing evidence. Auxiliary coverage includes planetary hours, sect, receptions and other horary mechanisms, bounds, twelfth parts, Firdaria and other Arabic/Persian techniques, and research-only civilization references. Those can appear as evidence or judgments inside a registered method. The family inventory, auxiliary technique list, and 20 executable slots describe different levels of coverage. `server/astrologyKnowledge/registry.ts` also contains a duplicate Ashtakavarga rule ID and coordinate descriptions older than the fixed-frame implementation. Code provenance and actual calculation records take precedence.

## Premium handoff

Run `node --import tsx scripts/export-sports-canon.ts` from Guardian. Premium commits the resulting JSON for local runtime lookup. It contains method references and a compact projection of Guardian planetary, sign, house, and Sumerian meanings. Guardian calculation code stays in Guardian. The two repos have no runtime fetch dependency on each other.

Premium consumes its own 21 core methods in each of God, Agent, and their existing joint blend, its full registered per-frame roster, the available supplemental blend, and the experimental ledgers. It records explicit Guardian-only gaps. It retains differences such as Chaldean versus elemental decans, variant frozen star anchors, the archived conjunction scorer, and the geometric translation-of-light proxy.

## Open items

- Guardian's wider legacy suite contains API, auth, provider, transport, and historical geometry failures that predate this branch. Its wider-orb Master Chart and five-degree energy rules remain separately labeled. Some local themes still miss Canon applications.
- Guardian and Premium have separate ephemeris, sunrise, nodes, and fixed-star configurations. Establish identical-input parity before treating the calculations as interchangeable. Premium does not execute Guardian-only Vedic strengths, Graha Drishti, Sefer Yetzirah, Genesis, or transit calculations.
- Guardian's narrative provider and Premium's Gemini service need deployed end-to-end verification. The local single-attempt tests use mocked provider responses.

## Local validation

| Check | Starting revision | Development branch |
| --- | --- | --- |
| Guardian full Vitest suite | 370 passed, 113 failed, 21 skipped | 414 passed, 90 failed |
| Guardian targeted Master Chart, Canon outcomes, reading bridge, and Vedic strength suites | The baseline Master Pipeline lacked four registered layers and event binding | 33 passed, 2 failed across six suites |
| Guardian TypeScript | 187 diagnostics | 72 diagnostics |
| Guardian production build | — | Vite and server bundle passed |
| Premium full Vitest suite | 130 passed, 4 failed | 138 passed |
| Premium TypeScript | 40 legacy Forge environment diagnostics | Same 40 diagnostics |
| Premium production build | — | Vite and server bundle passed |

Guardian's two remaining focused failures concern externally supplied vector/sunrise overrides and parity between the inline Master Chart transit contacts and the separate energy ledger. The complete Guardian suite also exposes two placement-mini request-contract assertions that were previously skipped when suite setup failed. Those paths are outside the Premium sports interpreter. The Guardian export was regenerated and compared byte-for-byte with Premium's committed projection. Every reference path in all 20 exported methods exists in Guardian.
