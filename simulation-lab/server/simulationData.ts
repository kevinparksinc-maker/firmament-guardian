import type { SimulationEventInput } from "./engine/simulationAdapter";

export type InvalidCsvRow = { rowNumber: number; raw: Record<string, string>; error: string };
export type ParsedSimulationCsv = {
  valid: SimulationEventInput[];
  invalid: InvalidCsvRow[];
  headers: string[];
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function value(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const found = row[key] ?? row[key.toLowerCase()] ?? row[key.replaceAll("_", "").toLowerCase()];
    if (found !== undefined && found !== "") return found;
  }
  return undefined;
}

function parseNumber(raw: string | undefined, label: string, min: number, max: number) {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return parsed;
}

function normalizeRow(row: Record<string, string>, rowNumber: number): SimulationEventInput {
  const teamA = value(row, "teamA", "team_a", "home", "home_team");
  const teamB = value(row, "teamB", "team_b", "away", "away_team");
  const sportRaw = value(row, "sport", "gameType", "game_type")?.toUpperCase();
  const location = value(row, "location", "venue", "city");
  const startTime = value(row, "startTime", "start_time", "dateTime", "date_time", "datetime", "date");
  const actualRaw = value(row, "actualWinner", "actual_winner", "winner")?.toUpperCase();
  if (!teamA || !teamB || !location || !startTime) throw new Error("teamA, teamB, location, and startTime are required");
  if (!sportRaw || !["MLB", "NBA", "NFL", "BOXING"].includes(sportRaw)) throw new Error("sport must be MLB, NBA, NFL, or boxing");
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) throw new Error("startTime must be a valid date/time");
  if (actualRaw && !["A", "B", "TIE"].includes(actualRaw)) throw new Error("actualWinner must be A, B, or TIE");
  return {
    id: value(row, "id", "eventId", "event_id") ?? `row-${rowNumber}`,
    teamA,
    teamB,
    sport: sportRaw === "BOXING" ? "boxing" : sportRaw as SimulationEventInput["sport"],
    location,
    latitude: parseNumber(value(row, "latitude", "lat"), "latitude", -90, 90),
    longitude: parseNumber(value(row, "longitude", "lon", "lng"), "longitude", -180, 180),
    startTime: date.toISOString(),
    actualWinner: actualRaw as SimulationEventInput["actualWinner"],
  };
}

export function parseSimulationCsv(csv: string): ParsedSimulationCsv {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV must include a header row and at least one event row");
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("CSV contains an empty header");
  const valid: SimulationEventInput[] = [];
  const invalid: InvalidCsvRow[] = [];
  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = parseCsvLine(line);
    const raw = Object.fromEntries(headers.map((header, headerIndex) => [header, cells[headerIndex] ?? ""]));
    try {
      valid.push(normalizeRow(raw, rowNumber));
    } catch (error) {
      invalid.push({ rowNumber, raw, error: error instanceof Error ? error.message : "Invalid row" });
    }
  });
  return { valid, invalid, headers };
}
