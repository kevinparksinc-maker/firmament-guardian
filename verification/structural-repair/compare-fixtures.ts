import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import sweph from "sweph";
import { calculateChart } from "./server/astronomy";
import { calculateMasterChart } from "./server/masterChart/entry";
import { synthesizeChartForReading } from "./server/astrologyKnowledge/synthesis/readingBridge";
import { retrieveChartCanonDossier } from "./server/astrologyKnowledge/canon/retriever";
import { runGenesisAstroPipeline, runGenesisPatternPipeline } from "./server/genesisBackup";
import { calculateHoraryChart } from "./server/horary";

async function main() {
  const fixedNow = Date.parse("2026-11-21T12:00:00.000Z");
  const RealDate = Date;
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args) {
      return Reflect.construct(target, args.length ? args : [fixedNow]);
    },
    get(target, key) { return key === "now" ? () => fixedNow : Reflect.get(target, key); },
  });
  const base = {
    location: "Alexandria, Egypt", latitude: 31.2001, longitude: 29.9187,
    timezone: "Africa/Cairo", date: "1988-08-08", time: "12:00",
    transitLocation: "Alexandria, Egypt", transitLatitude: 31.2001,
    transitLongitude: 29.9187, transitTimezone: "Africa/Cairo",
    transitDate: "2026-11-21", transitTime: "12:00",
  };
  const timed = { ...base, instantUtc: "1988-08-08T10:00:00.000Z",
    transitInstantUtc: "2026-11-21T10:00:00.000Z" };
  let calls = 0;
  const nativeCalc = sweph.calc_ut;
  sweph.calc_ut = (...args: Parameters<typeof nativeCalc>) => {
    calls++;
    return nativeCalc(...args);
  };
  const work = [
    ["natal-agent", { ...base, readingScope: "natal", worldview: "agent-vs-god" }],
    ["combined-agent", { ...base, readingScope: "combined", worldview: "agent-vs-god" }],
    ["transit-agent", { ...base, readingScope: "transit", worldview: "agent" }],
    ["date-only-god", { ...base, readingScope: "natal", worldview: "god", birthTimeKnown: false, time: "" }],
    ["supplied-xyz", { ...base, readingScope: "combined", worldview: "agent-vs-god",
      xyzPositions: { Sun: { x: -2, y: -1, z: -1 } },
      transitXYZPositions: { Sun: { x: -2, y: -1, z: -1 } } }],
  ] as const;
  const outputs: Record<string, unknown> = {};
  for (const [name, input] of work) {
    calls = 0;
    const raw = await calculateChart(input);
    process.stderr.write(name + " calc_ut=" + calls + "\n");
    const chart = await calculateMasterChart(input);
    const reading = await synthesizeChartForReading(chart, input.readingScope, "What should I know about my career?");
    outputs[name] = {
      raw, chart, reading,
      canon: retrieveChartCanonDossier(chart),
      genesisAstro: runGenesisAstroPipeline(chart),
      genesisPatterns: runGenesisPatternPipeline(chart),
    };
  }
  outputs.horary = await calculateHoraryChart({
    ...base, date: "2026-11-21", time: "12:00",
    question: "Will I receive a response about the job?",
  });
  writeFileSync(process.argv[2], JSON.stringify(outputs));
  for (let i=0; i < 30; i++) await calculateChart(timed);
  const batches = [];
  for (let n = 0; n < 5; n++) {
    calls = 0;
    const start = performance.now();
    for (let i=0; i < 150; i++) await calculateChart(timed);
    batches.push({ ms: performance.now() - start, calls });
  }
  process.stderr.write(JSON.stringify(batches) + "\n");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
