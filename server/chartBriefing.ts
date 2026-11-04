import type { ChartResult } from "./astronomy";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";

/** Audio reuses the calculated synthesis; it never supplies a prewritten daily script. */
export async function buildChartBriefing(chart: ChartResult) {
  const { synthesis } = await synthesizeChartForReading(
    chart,
    chart.readingScope,
    "Explain the selected chart's strongest patterns, their mechanisms, strengths and challenges for an audio reading."
  );
  const chapters = synthesis.themes
    .map(theme => ({
      id: theme.id,
      title: theme.humanTheme,
      subtitle: `${theme.evidenceIds.length} linked evidence records · ${synthesis.mode}`,
      text: [
        theme.primaryConclusion,
        theme.consequences.replace(/Evidence:[^\n]*/g, "").trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
      evidenceIds: theme.evidenceIds,
    }))
    .filter(chapter => chapter.text.trim() && chapter.evidenceIds.length > 0);
  if (!chapters.length)
    throw new Error(
      "The selected chart produced no source-backed briefing chapters."
    );
  return { snapshotId: synthesis.snapshotId, chapters };
}
