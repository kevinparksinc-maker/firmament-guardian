import { describe, expect, it } from "vitest";
import { parseSimulationCsv } from "./simulationData";

describe("simulation CSV validation", () => {
  it("normalizes a sourced event row into the engine input contract", () => {
    const parsed = parseSimulationCsv([
      "event_id,home_team,away_team,sport,venue,date_time,lat,lng,winner",
      "mlb-001,Dodgers,Giants,MLB,Dodger Stadium,2024-06-15T19:10:00Z,34.0522,-118.2437,A",
    ].join("\n"));

    expect(parsed.valid).toHaveLength(1);
    expect(parsed.invalid).toHaveLength(0);
    expect(parsed.valid[0]).toMatchObject({ id: "mlb-001", teamA: "Dodgers", teamB: "Giants", sport: "MLB", actualWinner: "A" });
    expect(parsed.valid[0]?.latitude).toBe(34.0522);
  });

  it("keeps invalid rows and their source row numbers instead of inventing data", () => {
    const parsed = parseSimulationCsv([
      "teamA,teamB,sport,location,startTime,actualWinner",
      "Dodgers,Giants,MLB,Los Angeles,not-a-date,A",
      "Yankees,Red Sox,MLB,Boston,2024-04-01T19:10:00Z,B",
    ].join("\n"));

    expect(parsed.valid).toHaveLength(1);
    expect(parsed.invalid).toHaveLength(1);
    expect(parsed.invalid[0]?.rowNumber).toBe(2);
    expect(parsed.invalid[0]?.error).toContain("valid date");
  });
});
