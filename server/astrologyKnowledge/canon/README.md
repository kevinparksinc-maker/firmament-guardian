# Canon reference library

This directory is the static meaning and provenance layer. It contains hard-coded traditional records, index metadata, source notes, and epistemic labels.

It must not calculate chart positions, normalize longitudes, detect aspects, evaluate patterns, build lots, or synthesize chart judgments. Those operations belong under `../calculations/`, which consumes chart facts and looks up these Canon records.

The pipeline is:

```text
Swiss Ephemeris / chart calculators
  -> calculated chart facts
  -> calculations adapters
  -> static Canon records in this directory
  -> method-specific judgments
  -> Master Synthesizer
```
