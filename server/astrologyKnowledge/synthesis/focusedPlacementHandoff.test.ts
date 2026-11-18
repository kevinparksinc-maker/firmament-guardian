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

it("keeps both bodies of a transit contact and the full method registry without sending unrelated Mars detail", async () => {
  vi.mocked(invokeLLM).mockClear();
  const bodies = ["Moon", "Mercury", "Mars"];
  const synthesis = {
    snapshotId: "contact-snapshot",
    methodOutcomes: [
      {
        methodId: "planetary-aspects", methodName: "Aspects",
        status: "computed-with-result", frame: "agent",
        findingJudgments: bodies.map(name => ({
          id: `judgment-${name}`, subject: name,
          evidenceIds: [`evidence-${name}`],
          judgment: `Interpret ${name} based on its calculated position.`,
        })),
        calculatedFindings: bodies.map(name => ({
          evidenceId: `evidence-${name}`,
          label: `${name} placement`, calculatedValue: `${name} chart coordinates`,
        })),
      },
      {
        methodId: "fixed-stars-royal-watchers", methodName: "Fixed Stars",
        status: "not-calculated", frame: "agent",
        findingJudgments: [], calculatedFindings: [],
      },
    ],
    sourceSnapshot: { methodExecutionLedger: [
      { id: "planetary-aspects", status: "computed-with-result" },
      { id: "fixed-stars-royal-watchers", status: "not-calculated" },
    ] },
  } as unknown as SynthesisResult;

  await runInterpretation("FOCUSED_MINI", synthesis, {
    messages: [{ role: "user", content: "Moon trine natal Mercury" }],
  }, { focusedPlacement: "Moon|Mercury" });
  const messages = vi.mocked(invokeLLM).mock.calls.at(-1)![0].messages;
  const serialized = messages.map(m => m.content).find(
    value => typeof value === "string" && value.startsWith("FOCUSED PLACEMENT DOSSIER.")
  );
  if (typeof serialized !== "string") throw new Error("Missing contact dossier");
  const [packet] = decodeEvidence(JSON.parse(serialized.slice(serialized.indexOf("\n") + 1))) as Array<{
    coverage: { methodsIncluded: number };
    methods: Array<[string, string, string, string, Array<[string]>, Array<[string]>]>;
  }>;
  expect(packet.coverage.methodsIncluded).toBe(2);
  expect(packet.methods.map(method => method[0])).toEqual([
    "planetary-aspects", "fixed-stars-royal-watchers",
  ]);
  expect(packet.methods[0][4].map(j => j[0])).toEqual(["judgment-Moon", "judgment-Mercury"]);
  expect(packet.methods[0][5].map(c => c[0])).toEqual(["evidence-Moon", "evidence-Mercury"]);
  expect(serialized).not.toContain("judgment-Mars");
  expect(serialized.length).toBeLessThan(16_000);
});
