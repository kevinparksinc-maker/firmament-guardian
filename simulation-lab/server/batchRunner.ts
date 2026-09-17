import { runSimulationEvent, type SimulationEventInput } from "./engine/simulationAdapter";
import { getSimulationEvents, insertSimulationResult, updateSimulationRun } from "./simulationDb";

export async function executeSimulationRun(runId: number, datasetId: number) {
  const events = await getSimulationEvents(datasetId);
  let completedEvents = 0;
  let failedEvents = 0;
  const results: ReturnType<typeof runSimulationEvent>[] = [];

  for (const event of events) {
    try {
      const result = runSimulationEvent(event.input as SimulationEventInput);
      results.push(result);
      await insertSimulationResult(runId, event.dbId, result);
      completedEvents += 1;
    } catch (error) {
      failedEvents += 1;
      await insertSimulationResult(runId, event.dbId, null, error instanceof Error ? error.message : "Unknown calculation error");
    }
    await updateSimulationRun(runId, { completedEvents, failedEvents });
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  const verified = results.filter((result) => result.comparison.verified);
  const baselineHits = verified.filter((result) => result.baseline.verdict === "hit").length;
  const summary = {
    total: results.length,
    verified: verified.length,
    unverified: results.length - verified.length,
    baselineHits,
    baselineMisses: verified.length - baselineHits,
    baselineAccuracy: verified.length ? Number(((baselineHits / verified.length) * 100).toFixed(1)) : null,
  };
  await updateSimulationRun(runId, {
    status: failedEvents > 0 ? "partial" : "complete",
    completedEvents,
    failedEvents,
    summaryJson: JSON.stringify(summary),
    finishedAt: new Date(),
  });
  return summary;
}
