import "dotenv/config";
import { calculateMasterChart } from "../server/masterChart/entry";
import { generateInterpretation, generateChapter, READING_MODES } from "../server/interpretation";
import { getLLMProviderStatus } from "../server/_core/llm";

// Run on the configured server: node --import tsx scripts/test-master-interpreter-live.ts
// Real provider calls; no fixture responses or credentials are printed.
async function main() {
  const status = getLLMProviderStatus();
  if (!status.configured) throw new Error("LIVE_TEST_BLOCKED: No provider credentials are configured in this environment.");
  const chart = await calculateMasterChart({
    location: "Dallas", latitude: 32.7767, longitude: -96.797,
    timezone: "America/Chicago", date: "1986-11-20", time: "10:06",
    worldview: "agent", readingScope: "combined",
    transitLocation: "Las Vegas", transitLatitude: 36.1699, transitLongitude: -115.1398,
    transitTimezone: "America/Los_Angeles", transitDate: "2026-11-17", transitTime: "06:08",
  });
  let failed = false;
  for (const mode of READING_MODES) {
    const started = Date.now();
    try {
      const result = await generateInterpretation(chart, mode, "What pattern should I understand and how can I respond to it?");
      const plan = JSON.parse(result.analysis);
      const chapter = await generateChapter(chart, mode, result.intelligence, "identity", [], result.analysis);
      console.log(JSON.stringify({ mode, passed: true, elapsedMs: Date.now() - started, threads: plan.threads.length, chapters: Object.keys(plan.chapters).length, methods: result.masterSynthesis.methodOutcomes.length, readingCharacters: result.reading.length, chapterCharacters: chapter.length }));
    } catch (error) {
      failed = true;
      console.error(JSON.stringify({ mode, passed: false, elapsedMs: Date.now() - started, error: error instanceof Error ? error.message : "Unknown failure" }));
    }
  }
  if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
