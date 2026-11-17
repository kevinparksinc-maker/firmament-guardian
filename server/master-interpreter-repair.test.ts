import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import { calculateMasterChart } from "./masterChart/entry";
import type { ChartResult } from "./astronomy";
import { generateInterpretation, generateChapter, validatePlan } from "./interpretation";
import { decodeEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import { synthesizePlacement } from "./placement-synthesis/orchestrator";

let chart: ChartResult;
const prose = "You protect your independence by choosing carefully where your time goes. You need to name the pressure before deciding how to respond. ".repeat(4);
const response = (content: string) => ({ id: "fixture", model: "fixture", created: 0, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant" as const, content } }] });
const plan = (evidence = "Sun") => ({
  threads: [
    { title: "Initiative", insight: "You choose your direction.", evidence: [evidence], chapters: ["identity"] },
    { title: "Connection", insight: "You value reciprocity.", evidence: ["Moon"], chapters: ["relationships"] },
  ], tensions: [],
  chapters: Object.fromEntries(["identity", "family-roots", "relationships", "work-purpose"].map(id => [id, { angle: "A distinct angle", evidence: [evidence] }])),
});
beforeAll(async () => {
  chart = await calculateMasterChart({ location: "Dallas", latitude: 32.7767, longitude: -96.797, timezone: "America/Chicago", date: "1986-11-20", time: "10:06", worldview: "agent", readingScope: "combined", transitLocation: "Las Vegas", transitLatitude: 36.1699, transitLongitude: -115.1398, transitTimezone: "America/Los_Angeles", transitDate: "2026-11-17", transitTime: "06:08" });
}, 30000);
beforeEach(() => { vi.mocked(invokeLLM).mockReset(); });

describe("Master Interpreter coordinated repair", () => {
  it.each(["natal", "transit", "combined"] as const)("repairs a malformed %s plan and completes reading and chapter using every method", async mode => {
    let plans = 0;
    vi.mocked(invokeLLM).mockImplementation(async request => {
      const system = String(request.messages[0].content);
      if (system.includes("silent first reader")) {
        plans++;
        if (plans === 1) return response("{broken");
        const domain = String(request.messages[1].content);
        const labels = JSON.parse(domain.split("VALID EVIDENCE LABELS (copy exact IDs; do not invent or shorten them):\n")[1].split("\n")[0]) as string[];
        // Validate a real non-point method ID from the complete dossier.
        const label = labels.find(id => id.startsWith(mode === "transit" ? "transit:" : "sy-"))!;
        expect(label).toBeTruthy();
        return response(JSON.stringify(plan(label)));
      }
      return response(prose);
    });
    const result = await generateInterpretation(chart, mode, "What is active for me?");
    expect(plans).toBe(2);
    expect(result.reading.length).toBeGreaterThan(80);
    expect(Object.keys(JSON.parse(result.analysis).chapters)).toHaveLength(4);
    for (const [request] of vi.mocked(invokeLLM).mock.calls) {
      const dossier = request.messages.find(message => String(message.content).startsWith("COMPLETE CALCULATED INTERPRETATION DOSSIER"));
      expect(dossier).toBeTruthy();
      const data = decodeEvidence(JSON.parse(String(dossier!.content).split("\n").slice(1).join("\n"))) as any[];
      expect(data[0].coverage).toMatchObject({ omittedFindings: 0, truncated: false });
      expect(data[0].coverage.methodsIncluded).toBe(result.masterSynthesis.methodOutcomes.length);
      expect(data[0].methods.map((row: any[]) => row[0])).toEqual(result.masterSynthesis.methodOutcomes.map(method => method.methodId));
      expect(data[0].coverage.findingsIncluded).toBe(result.masterSynthesis.methodOutcomes.reduce((n, method) => n + method.findingJudgments.length, 0));
    }
    await expect(generateChapter(chart, mode, result.intelligence, "identity", [], result.analysis)).resolves.toBeTruthy();
  }, 30000);

  it("rejects invalid plans after exactly one repair", async () => {
    vi.mocked(invokeLLM).mockResolvedValue(response(JSON.stringify(plan("nonexistent-evidence"))));
    await expect(generateInterpretation(chart, "transit")).rejects.toThrow("READING_PLAN_FAILED");
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });

  it("retains provider and stage details for chapter failures", async () => {
    vi.mocked(invokeLLM).mockRejectedValue(new Error("AI_PROVIDERS_FAILED: gemini HTTP 503; groq HTTP 429; openrouter HTTP 401"));
    await expect(generateChapter(chart, "combined", "", "identity")).rejects.toThrow("READING_CHAPTER_FAILED: AI_PROVIDERS_FAILED: gemini HTTP 503");
  });

  it("repairs unsupported placement IDs and parses multiple inline claims per paragraph", async () => {
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce(response("You choose your direction. [evidence: invented-id]\n\nYou need room to act. [evidence: invented-id]"))
      .mockResolvedValueOnce(response("You choose your direction. [evidence: sy-natal-double-sun] You value clear commitments. [evidence: arabic-lot-fortune]\n\nYou protect your independence. [evidence: sy-natal-double-sun] You make time for what matters. [evidence: arabic-lot-fortune]"));
    const result = await synthesizePlacement(chart, "Sun");
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(result.claimTrace).toHaveLength(4);
    expect(result.synthesis).not.toMatch(/\[evidence:|invented-id/);
  });

  it("rejects malformed data and empty chapter angles without crashing", () => {
    const invalid = plan(); invalid.chapters.identity.angle = "";
    expect(validatePlan(JSON.stringify(invalid), new Map([["sun", "Sun fact"], ["moon", "Moon fact"]]), new Map())).toBeNull();
    expect(validatePlan("[]", new Map(), new Map())).toBeNull();
    expect(validatePlan(JSON.stringify(plan("Sun square invented planet")), new Map([["sun", "Sun fact"], ["moon", "Moon fact"]]), new Map())).toBeNull();
  });
});
