import { expect, it, vi } from "vitest";
import { invokeLLM } from "../../_core/llm";
import { decodeEvidence } from "./evidenceTransport";
import { runInterpretation } from "./interpretationPipeline";
import type { SynthesisResult } from "./types";

vi.mock("../../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "reading" }, finish_reason: "stop" }] })),
}));

it("keeps every Moon finding and linked calculation in the serialized focused request", async () => {
  const judgments = Array.from({ length: 4 }, (_, i) => ({
    id: `j${i}`,
    subject: i === 3 ? "Relationship" : "Moon",
    evidenceIds: [`e${i}`],
    judgment: "Detailed finding ".repeat(24) + i,
  }));
  const calculations = judgments.map((finding, i) => ({
    label: i === 3 ? "Moon reception" : "Calculation",
    evidenceId: finding.evidenceIds[0],
    calculatedValue: finding.judgment,
  }));
  const synthesis = {
    methodOutcomes: [{
      findingJudgments: [...judgments, { subject: "Mars", evidenceIds: ["other"] }],
      calculatedFindings: calculations,
    }],
    sourceSnapshot: { methodExecutionLedger: [] },
  } as unknown as SynthesisResult;
  await runInterpretation("FOCUSED_MINI", synthesis, {
    messages: [{ role: "user", content: "Moon" }],
  }, { focusedPlacement: "Moon" });
  const messages = vi.mocked(invokeLLM).mock.calls[0][0].messages;
  const content = messages.map(message => message.content)
    .find(value => typeof value === "string" && value.startsWith("FOCUSED PLACEMENT DOSSIER"));
  if (typeof content !== "string") throw new Error("Missing Moon dossier");
  const dossier = decodeEvidence(JSON.parse(content.slice(content.indexOf("\n") + 1)));
  const [packet] = dossier as Array<{
    coverage: { omittedJudgments: number; omittedCalculations: number };
    methods: Array<[string, string, string, string, Array<[string, string, string, string, string[]]>, Array<[string, string, string]>]>;
  }>;
  const method = packet.methods[0];
  expect(method[4].map(item => item[0])).toEqual(judgments.map(item => item.id));
  expect(method[5].map(item => item[0])).toEqual(calculations.map(item => item.evidenceId));
  expect(packet.coverage).toMatchObject({ omittedJudgments: 0, omittedCalculations: 0 });
  // The scoped model packet preserves all evidence IDs but avoids repeating
  // long chart-wide prose that creates provider 413 request-size failures.
  expect(content.length).toBeLessThan(16_000);
});
