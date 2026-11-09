/** Provenance stays in evidence records, not in the visible reading. */
export function readingProse(text: string): string {
  return text
    .replace(
      /\[(?:TRADITION|MODERN_SYNTHESIS|FIRMAMENT CANON)[^\]]*\]\s*/gi,
      ""
    )
    .replace(
      /\b(?:Psychological dynamic|Healthy expression|Defensive risk under pressure|Psychological field)\s*:\s*/gi,
      ""
    )
    .replace(/^\s*[“"]([\s\S]*)[”"]\s*$/, "$1")
    .trim();
}
