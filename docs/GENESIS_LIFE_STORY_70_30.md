# Genesis Life Story implementation instructions for Google AI Studio

Start from current main. This brief applies to Genesis Life Story. Target roughly 70% Vedic-led life journey and 30% behavior across a chapter. Judge the balance by what the reader learns. Counting astrology terms or enforcing a word quota misses the purpose.

## Implement in the existing reading path

1. In server/lifeStoryEngine.ts, derive the requested chapter’s date range and reuse buildVimshottariTimeline from server/astrologyKnowledge/vedic/timingAndAshtakavarga.ts. Pass the Mahadashas and Antardashas overlapping that range, including periods spanning a chapter boundary. Give those windows stable evidence references the chapter parser recognizes. Honor the calculator’s unknown-time result and record the resulting timing gap.
2. Use the Genesis 72-question inquiry to choose a coherent chronological journey. For each major development ask what opens or changes in the person’s life, when, and with what consequence. Connect the period lord to houses it rules, occupies and aspects. Weigh applicable yogas, drishti, nakshatra and pada, planetary and house strengths, and Ashtakavarga. Use independent witnesses and counterevidence to judge the domain and scale. Preserve every available method in the shared dossier, the fixed-firmament chart, and the single generation call.
3. Integrate behavior inside the turning point. Show how a specific choice or response affects work, relationships, opportunity, responsibility, or the outcome. For infancy, emphasize surrounding circumstances. Write in second person. Discard any claim that could describe almost anybody. Frame unverified events as possibilities and reserve exact timing for supplied windows.
4. Extend the existing beat structure to identify the leading Vedic evidence, applicable timing window, corroboration or limitations, and behavioral response where supported. Preserve the technical plan and gaps with the chapter when saved. Keep the displayed chapter readable as connected prose.

## Verify what readers receive

Update the stale prose mock in server/lifeStoryEngine.test.ts to exercise the structured JSON contract. Test period overlap at chapter boundaries, unknown birth time, and traceable evidence IDs through the normal chapter route.

Run the Michael Jackson chart blind with identity and biography withheld. Compare childhood against a later stage and against another person’s childhood. Examine whether the supplied evidence distinguishes private talent, organized work and public exposure. Record what supports the scale claimed. Score substantive claims in the delivered prose as Vedic-supported life development, behavior tied to a development, or other/unsupported. Report counts and examples. Treat 70/30 as an approximate editorial target. Discard unsupported claims even when doing so moves a chapter away from that target.
