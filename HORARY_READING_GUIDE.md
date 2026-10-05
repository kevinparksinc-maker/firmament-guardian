# Horary Reading Guide

## What happens when a question is submitted

1. **The question is fixed.** The app uses the date, local time, timezone, and resolved location where the question was asked.
2. **One question chart is calculated.** The astronomy engine calculates the Ascendant, Equal House cusps, planetary longitudes, speeds, retrogrades, and the canonical geocentric Moon position.
3. **Roles are assigned.**
   - The person asking is the **querent**, represented by House 1 and its traditional ruler.
   - If the question is about another person, that person is represented by House 7.
   - The selected topic house is counted from the person the question is about. For example, a career question about another person uses that person's 10th house, which becomes actual chart House 4 after turning from House 7.
   - The Moon is treated as a general co-significator and sequence-of-events indicator.
4. **The engine selects relevant testimony.** It checks only the supplied major aspects among the querent ruler, subject ruler, topic ruler, and Moon. It labels each contact as applying, separating, or unclear using the calculated planetary speeds.
5. **Traditional support is calculated separately.** Lots, dignity/debility indicators, receptions, radicality cautions, fixed-star contacts, timing aids, and lunar divisions are calculated as supporting evidence. They are not allowed to become an automatic answer by themselves.
6. **The AI receives compact judgment evidence.** The first judgment now receives the question, roles, Moon, core placements, relevant aspects, radicality cautions, and configured reception support. It does not receive the full technical appendix as the primary writing material.
7. **The AI writes the answer first.** The first response must use:
   - `Judgment`
   - `Why`
   - `What complicates it`
   - `Practical next step`

   It should state a provisional yes/no/mixed/insufficient-testimony leaning immediately, explain only the strongest two or three factors, and avoid planet-by-planet inventories, degree lists, house-cusp lists, or calculation logs.

## Why the old reading felt like a calculation dump

The previous Horary prompt required the model to explain nearly every supplied layer, including:

- all significator roles;
- all three Natal/Transit/God View evidence sets;
- every God View/Agent View relationship row;
- upcoming exact contacts and planetary stations;
- Lots and Arabic Parts;
- dignity and debility scores;
- reception;
- fixed stars;
- radicality considerations;
- traditional timing;
- lunar mansion, Manzil, and Decan overlays.

That produced technically rich output, but it placed the evidence ahead of the human answer and encouraged the model to repeat calculations inside the interpretation. The general-purpose Master Interpreter prompt also added a large amount of instructional text and encouraged deep symbolic elaboration.

## What changed

- The first AI request now uses a **compact Horary-specific prompt** rather than the oversized general interpreter prompt.
- The first judgment is limited to the strongest testimony and normally 350–700 words.
- Technical panels remain available after the answer for readers who want to inspect the calculations.
- The UI now places **Your answer** before chart evidence, frame translation, the orrery, and follow-up tools.
- The technical evidence is explicitly labeled optional.
- The same question chart remains fixed for follow-up questions; follow-ups do not silently recast the chart.

## What the judgment does not claim

Horary is presented as symbolic interpretation, not certainty or scientific proof. The system should not claim a guaranteed event, invent an absent traditional doctrine, assign a missing placement, or turn an exact planetary contact into a guaranteed real-world date.
