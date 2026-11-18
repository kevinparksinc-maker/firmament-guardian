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
  expect(dossier).toMatchObject([{ methods: [[null, null, null, null, judgments, calculations, null]] }]);
});
