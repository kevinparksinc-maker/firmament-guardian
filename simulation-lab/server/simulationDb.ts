import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { simulationDatasets, simulationEvents, simulationResults, simulationRuns } from "../drizzle/schema";
import type { SimulationEventInput } from "./engine/simulationAdapter";

export async function createSimulationDataset(input: {
  name: string;
  sourceFileName?: string;
  sourceDescription?: string;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const status = input.validRowCount === 0 ? "rejected" : input.invalidRowCount > 0 ? "partial" : "validated";
  const inserted = await db.insert(simulationDatasets).values({ ...input, status }).$returningId();
  return inserted[0]?.id ?? null;
}

export async function insertSimulationEvents(datasetId: number, events: SimulationEventInput[]) {
  const db = await getDb();
  if (!db || events.length === 0) return;
  await db.insert(simulationEvents).values(events.map((event, index) => ({
    datasetId,
    rowNumber: index + 2,
    eventId: event.id ?? `row-${index + 2}`,
    teamA: event.teamA,
    teamB: event.teamB,
    sport: event.sport,
    location: event.location,
    latitude: event.latitude?.toString(),
    longitude: event.longitude?.toString(),
    startTime: new Date(event.startTime),
    actualWinner: event.actualWinner,
    validationStatus: "valid" as const,
  })));
}

export async function getSimulationEvents(datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(simulationEvents).where(eq(simulationEvents.datasetId, datasetId)).orderBy(simulationEvents.rowNumber);
  return rows.map((row) => ({
    dbId: row.id,
    input: {
      id: row.eventId,
      teamA: row.teamA,
      teamB: row.teamB,
      sport: row.sport as SimulationEventInput["sport"],
      location: row.location,
      latitude: row.latitude === null ? undefined : Number(row.latitude),
      longitude: row.longitude === null ? undefined : Number(row.longitude),
      startTime: row.startTime.toISOString(),
      actualWinner: row.actualWinner as SimulationEventInput["actualWinner"],
    },
  }));
}

export async function createSimulationRun(datasetId: number, totalEvents: number) {
  const db = await getDb();
  if (!db) return null;
  const inserted = await db.insert(simulationRuns).values({ datasetId, totalEvents, status: "running", startedAt: new Date() }).$returningId();
  return inserted[0]?.id ?? null;
}

export async function updateSimulationRun(runId: number, values: Partial<typeof simulationRuns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(simulationRuns).set(values).where(eq(simulationRuns.id, runId));
}

export async function getSimulationRun(runId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(simulationRuns).where(eq(simulationRuns.id, runId)).limit(1);
  return rows[0] ?? null;
}

export async function insertSimulationResult(runId: number, eventId: number, output: unknown, errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(simulationResults).values({
    runId,
    eventId,
    status: errorMessage ? "failed" : "complete",
    outputJson: errorMessage ? null : JSON.stringify(output),
    errorMessage,
  });
}

export async function listSimulationDatasets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simulationDatasets).orderBy(simulationDatasets.createdAt);
}
