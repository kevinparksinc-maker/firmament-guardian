import { describe, it, expect } from "vitest";
import { parseLocalToUtc } from "./astronomy";
describe("global local-time to UTC conversion", () => {
  it("retains standard Dallas time", () => {
    expect(parseLocalToUtc("2026-01-15", "10:00", "America/Chicago").toISOString()).toBe("2026-01-15T16:00:00.000Z");
  });
  it("retains daylight Dallas time", () => {
    expect(parseLocalToUtc("2026-07-15", "10:00", "America/Chicago").toISOString()).toBe("2026-07-15T15:00:00.000Z");
  });
  it("supports Indian half-hour offsets", () => {
    expect(parseLocalToUtc("2026-10-24", "10:00", "Asia/Kolkata").toISOString()).toBe("2026-10-24T04:30:00.000Z");
  });
  it("supports Nepal quarter-hour offsets", () => {
    expect(parseLocalToUtc("2026-10-24", "10:00", "Asia/Kathmandu").toISOString()).toBe("2026-10-24T04:15:00.000Z");
  });
  it("rejects spring-forward non-existent Dallas wall time", () => {
    expect(() => parseLocalToUtc("2026-03-08", "02:30", "America/Chicago")).toThrow(/does not exist/);
  });
  it("rejects fall-back repeated Dallas wall time", () => {
    expect(() => parseLocalToUtc("2026-11-01", "01:30", "America/Chicago")).toThrow(/ambiguous/);
  });
});
