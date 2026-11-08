import type { SynthesisResult } from "./types";

/** Direct, lossless handoff of the calculated chart to the AI. No interpretation gating or selection. */
export function buildNarrativePacket(synthesis: SynthesisResult, question: string) {
  return {
    packet: {
      question,
      mode: synthesis.mode,
      snapshot: synthesis.sourceSnapshot,
      calculatedMethodOutcomes: synthesis.sourceSnapshot.methodExecutionLedger,
      // Send calculated evidence and Canon references, not prewritten method judgments.
      canonApplications: synthesis.canonApplications.map(({ judgments, interpretation, ...application }: any) => application),
    },
  };
}
