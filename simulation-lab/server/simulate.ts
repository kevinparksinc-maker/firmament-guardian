import { formatSimulationReport, runAndBuildSimulationReport, writeSimulationExports } from "./simulationReport";

const fixtures = [
  {
    id: "terminal-game-001-dodgers-giants",
    teamA: "Los Angeles Dodgers",
    teamB: "San Francisco Giants",
    sport: "MLB" as const,
    location: "Los Angeles, CA",
    latitude: 34.0522,
    longitude: -118.2437,
    startTime: "2024-06-15T19:10:00.000Z",
    actualWinner: "A" as const,
  },
  {
    id: "terminal-game-002-yankees-astros",
    teamA: "New York Yankees",
    teamB: "Houston Astros",
    sport: "MLB" as const,
    location: "Houston, TX",
    latitude: 29.7604,
    longitude: -95.3698,
    startTime: "2024-04-01T19:10:00.000Z",
    actualWinner: "B" as const,
  },
  {
    id: "terminal-game-003-red-sox-yankees",
    teamA: "Boston Red Sox",
    teamB: "New York Yankees",
    sport: "MLB" as const,
    location: "Boston, MA",
    latitude: 42.3467,
    longitude: -71.0972,
    startTime: "2024-04-09T19:10:00.000Z",
    actualWinner: "A" as const,
  },
  {
    id: "terminal-game-004-cubs-cardinals",
    teamA: "Chicago Cubs",
    teamB: "St. Louis Cardinals",
    sport: "MLB" as const,
    location: "Chicago, IL",
    latitude: 41.9484,
    longitude: -87.6553,
    startTime: "2024-05-04T13:20:00.000Z",
    actualWinner: "B" as const,
  },
];

async function main() {
  const report = runAndBuildSimulationReport(fixtures);
  console.log(formatSimulationReport(report));
  const exports = await writeSimulationExports(report);
  console.log(`JSON export: ${exports.jsonPath}`);
  console.log(`CSV export:  ${exports.csvPath}`);
}

void main();
