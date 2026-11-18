# The Absolute — Interpretation Authority Hierarchy
Updated: 2026-11-18

## Purpose
Some methods supply the chart's facts, others define meaning, others describe capacity, and others activate existing meanings in time. **Priority governs narrative emphasis and reconciliation, not whether a calculated method is passed to the synthesizer.** Every applicable method remains in the evidence ledger.

## Order of operations

| Level | Role | Methods | Non-negotiable rule |
| --- | --- | --- | --- |
| 0 | Astronomical authority | Ephemeris XYZ, fixed-firmament projection, sunrise Ascendant, local horizon, equal-house geometry | Do not override or recast positions to make a symbolic rule fit. Preserve God, Agent and event provenance. |
| 1 | Structural meaning | Planet/sign/degree, house, house lordship and entwinement, dignity/sect | Establish who acts, where they act, and which houses they govern. |
| 2 | Primary symbolic intelligence | 27 Nakshatras and exact 108 Padas | Read the actual lunar mansion and quarter as meaning-bearing authority, not labels. State convergence or contradiction with structure. |
| 3 | Capacity | Seven-planet Shadbala, twelve-house Bhava Bala, supported Ashtakavarga and Ishta/Kashta results | Use exact calculated scores, component arithmetic and relative ranks. Strength measures capacity, not automatic favorability or probability. |
| 4 | Relationships and formation | Aspects, Graha/Rasi Drishti, receptions, yogas, patterns, translation/collection, planetary war, entwinement | Reconcile the strongest independent testimonies rather than count them as interchangeable votes. |
| 5 | Additional traditional perspectives | Arabic Manazil, Chinese Xiu, elemental decans, fixed stars, Lots, Sefer Yetzirah, Sumerian meanings | Use each tradition's actual documented boundaries and content. Do not pretend reference-only methods are calculated. |
| 6 | Activation and timing | Transits, dashas, nodes, retrogradation, planetary day/hour, event-sky methods | Identify when a theme is activated. Do not turn a transient event reading into a claim about natal personality. |
| 7 | Final synthesis | Integrated natal / God / event reading | Deliver one grounded, direct second-person interpretation, then optional source/evidence details. |

## Priority is dynamic
The top-level theme should be determined by **question relevance, independent corroboration, component strength, exactness, and activation**, not an arbitrary fixed percentage. A tight transiting activation can lead a transit reading while mansion and natal strength remain essential context. The house and its lord may lead a question about career, partnership, home, or finances.

Do not count the same fact under three traditions as three independent confirmations. Do not silently drop any method. Preserve disagreements, inconclusive findings and uncalculated statuses. The Chinese mansion layer must not be described as fully calculated while its method status is reference-only.

## House and planetary strength
- The authoritative implementation is `server/astrologyKnowledge/vedic/strength.ts`.
- Shadbala returns six parts (Sthana, Dig, Kala, Cheshta, Naisargika, Drik) for the seven classical planets and compares total Virupas with planet-specific traditional minimums; 60 Virupas = 1 Rupa.
- Bhava Bala returns numerical totals and rank for all 12 houses using the documented equal-house variant. House ranks are relative to the current chart, not universal pass/fail thresholds.
- Nodes and outer planets do not receive fabricated classical seven-graha Shadbala scores.
- The numerical method uses The Absolute's supplied fixed-XYZ positions and equal-house model; those values are **not asserted to match** a standard sidereal/Lahiri chart.
- Evidence views must give the numbers, components, source/version, and the specific formula variant. The reader-facing synthesis should say what those numbers change about the interpretation.

## Product surface and failure isolation
My Chart → after complete placements → **Planetary Strength & House Strength**. Show ranked planet adequacy and relative house capacity on mobile with expanders for arithmetic, and links to full method evidence. The direct `vedic.strength` query calculates deterministic values without calling an AI provider. Provider failures in method mini-readings should not hide these calculations. Display missing prerequisites and calculation errors instead of dummy numbers.

## Implementation status
- Numerical Shadbala/Bhava Bala: implemented and independently queried.
- Prominent strength overview: committed to My Chart.
- Prompt hierarchy: supplied to standard non-Horary master interpreter and full/compact synthesis packets.
- Real browser, hosted deployment, and complete end-to-end QA: **not yet verified**.
- Improving the actual richness of Nakshatra/Pada, Arabic Manzil and Chinese Xiu interpretations remains a separate content-and-calculation audit; assigning priority to a method does not manufacture missing Canon or calculations.
