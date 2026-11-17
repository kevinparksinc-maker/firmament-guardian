export function readingProse(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^Question:\s*(?:Compact individual placement card summaries|the chart's overall configuration)\.?\s*/i, "")
    .replace(
      /\[(?:TRADITION|MODERN_SYNTHESIS|FIRMAMENT CANON|TRADITION\s*\/[^\]]*)[^\]]*\]\s*/gi,
      ""
    )
    .replace(
      /\b(?:Psychological dynamic|Healthy expression|Defensive risk under pressure|Psychological field)\s*:\s*/gi,
      ""
    )
    .replace(/;?\s*evaluated\s+\d{4}-\d{2}-\d{2}T[\d:.]+Z?/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "")
    .replace(/;?\s*configured flow\s*-?\d+/gi, "")
    .replace(/([^\n])\s+•\s+/g, "$1\n- ")
    .replace(/^\s*[“"]([\s\S]*)[”"]\s*$/, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
