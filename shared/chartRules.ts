/** Canonical major-aspect orb applied to natal/transit contact calculations and UI evidence labels. */
export const MAJOR_ASPECT_ORB_DEGREES = 5 as const;

/** Minor longitude aspects use a tighter orb to keep their testimony selective. */
export const MINOR_ASPECT_ORB_DEGREES = 2 as const;

/** Common minor longitude aspects added to transit-to-natal contact calculations. */
export const MINOR_ASPECTS = [
  "semisextile",
  "semisquare",
  "sesquiquadrate",
  "quincunx",
] as const;

/** Minor contacts contribute half the orb-based strength of a major contact. */
export const MINOR_ASPECT_WEIGHT = 0.5 as const;

export function isMinorAspect(aspect: string): boolean {
  return (MINOR_ASPECTS as readonly string[]).includes(aspect);
}

export function aspectWeightMultiplier(aspect: string): number {
  return isMinorAspect(aspect) ? MINOR_ASPECT_WEIGHT : 1;
}
