import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const simulationDatasets = mysqlTable("simulation_datasets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  sourceDescription: text("sourceDescription"),
  schemaVersion: varchar("schemaVersion", { length: 32 }).notNull().default("events-v1"),
  rowCount: int("rowCount").notNull().default(0),
  validRowCount: int("validRowCount").notNull().default(0),
  invalidRowCount: int("invalidRowCount").notNull().default(0),
  status: mysqlEnum("status", ["validated", "partial", "rejected"]).notNull().default("validated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const simulationEvents = mysqlTable("simulation_events", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  rowNumber: int("rowNumber").notNull(),
  eventId: varchar("eventId", { length: 180 }).notNull(),
  teamA: varchar("teamA", { length: 180 }).notNull(),
  teamB: varchar("teamB", { length: 180 }).notNull(),
  sport: varchar("sport", { length: 24 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  startTime: timestamp("startTime").notNull(),
  actualWinner: varchar("actualWinner", { length: 8 }),
  validationStatus: mysqlEnum("validationStatus", ["valid", "invalid"]).notNull().default("valid"),
  validationError: text("validationError"),
});

export const simulationRuns = mysqlTable("simulation_runs", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  status: mysqlEnum("status", ["queued", "running", "complete", "partial", "failed"]).notNull().default("queued"),
  totalEvents: int("totalEvents").notNull().default(0),
  completedEvents: int("completedEvents").notNull().default(0),
  failedEvents: int("failedEvents").notNull().default(0),
  summaryJson: text("summaryJson"),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const simulationResults = mysqlTable("simulation_results", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  eventId: int("eventId").notNull(),
  status: mysqlEnum("status", ["complete", "failed"]).notNull(),
  outputJson: text("outputJson"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SimulationDataset = typeof simulationDatasets.$inferSelect;
export type SimulationEvent = typeof simulationEvents.$inferSelect;
export type SimulationRun = typeof simulationRuns.$inferSelect;
export type SimulationResult = typeof simulationResults.$inferSelect;
