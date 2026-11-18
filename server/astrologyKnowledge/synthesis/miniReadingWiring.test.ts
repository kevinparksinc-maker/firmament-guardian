import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("canonical mini-reading wiring", () => {
  it("uses the same canonical reading bridge and final-stage depth", () => {
    const router = source("../../routers.ts");
    const bridge = source("./readingBridge.ts");
    expect(router).toContain("miniReading: publicProcedure");
    expect(router).toContain("synthesizeChartForReading(\n          input.chart, input.mode, input.focus, input.outputDepth");
    expect(bridge).toContain("getCanonicalReadingChart({ ...chart.input, mode })");
    expect(bridge).toContain("synthesizeMasterReading({ snapshot, readingMode: mode, userQuestion: question, outputDepth })");
  });

  it("does not use canned contact interpretation in Energy Read", () => {
    const energy = source("../../../client/src/pages/EnergyPage.tsx");
    expect(energy).toContain("trpc.interpretation.miniReading.useMutation()");
    expect(energy).toContain("contactReading.mutate(");
    expect(energy).not.toContain("function interpretContact(");
    expect(energy).not.toContain("const PLANET_THEMES:");
  });

  it("keeps long focused contact prompts and honest audit labels", () => {
    const router = source("../../routers.ts");
    const mini = source("../../../client/src/components/CanonicalMiniReadings.tsx");
    expect(router).toContain('focus: z.string().trim().min(1).max(2000)');
    expect(mini).toContain("reading.reset()");
    expect(mini).toContain("AI narrative coverage not independently verified");
    expect(mini).not.toContain('Theme coverage: {reading.data.qualityAudit.passed ? "complete"');
  });

  it("shows only the interpretation for the selected planet or contact", () => {
    const mini = source("../../../client/src/components/CanonicalMiniReadings.tsx");
    const energy = source("../../../client/src/pages/EnergyPage.tsx");
    expect(mini).toContain("reading.data?.focus === activeFocus");
    expect(energy).toContain("contactReading.data?.focus === contactFocus(c)");
  });

  it("reuses calculated event snapshots for repeated requests", () => {
    const builder = source("../../masterChart/builder.ts");
    expect(builder).toContain("eventSnapshotCache.get(key)");
    expect(builder).toContain("return existing.pending");
    expect(builder).toContain("computeSnapshotId(input,");
  });
});
