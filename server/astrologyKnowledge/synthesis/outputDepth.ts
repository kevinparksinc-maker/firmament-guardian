/**
 * Presentation-only reading depth. Never use this to filter chart methods,
 * propositions, or evidence before synthesis.
 */
export const OUTPUT_DEPTH_INSTRUCTIONS = {
  quick: "Write 2–4 substantive sentences.",
  mini: "Write 1–2 connected paragraphs.",
  standard: "Write 3–5 connected paragraphs.",
  full: "Write a detailed multi-section synthesis.",
} as const;

export type OutputDepth = keyof typeof OUTPUT_DEPTH_INSTRUCTIONS;
