import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODEL, ENV } from "./env";
import { invokeLLM } from "./llm";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ThinkingLevel: { MINIMAL: "MINIMAL" },
}));

const originalEnv = { ...ENV };
afterEach(() => {
  Object.assign(ENV, originalEnv);
  vi.resetAllMocks();
});

describe("Gemini model recovery", () => {
  const request = { messages: [{ role: "user" as const, content: "Generate a reading." }] };

  it("retries a model 404 on the default Gemini model with only a Gemini key", async () => {
    Object.assign(ENV, { geminiModel: "gemini-2.5-flash", geminiApiKey: "test-key", groqApiKey: "", openrouterApiKey: "" });
    generateContent
      .mockRejectedValueOnce(Object.assign(new Error("Model unavailable"), { status: 404 }))
      .mockResolvedValueOnce({ text: "Recovered reading" });

    const result = await invokeLLM(request);

    expect(result.model).toBe(DEFAULT_GEMINI_MODEL);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: "gemini-2.5-flash" }));
    expect(generateContent).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: DEFAULT_GEMINI_MODEL }));
  });

  it("does not retry the same model when the default returns 404", async () => {
    Object.assign(ENV, { geminiModel: DEFAULT_GEMINI_MODEL, geminiApiKey: "test-key", groqApiKey: "", openrouterApiKey: "" });
    generateContent.mockRejectedValueOnce(Object.assign(new Error("Model unavailable"), { status: 404 }));

    await expect(invokeLLM(request)).rejects.toThrow("GEMINI_REQUEST_FAILED: HTTP 404");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
