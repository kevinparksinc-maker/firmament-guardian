import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODEL, ENV, resolveGroqModel } from "./env";
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

    await expect(invokeLLM(request)).rejects.toThrow("AI_PROVIDERS_FAILED: gemini GEMINI_REQUEST_FAILED: HTTP 404");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

describe("Groq model configuration", () => {
  it("replaces the retired Render model and preserves supported overrides", () => {
    expect(resolveGroqModel(" llama-3.3-70b-versatile ")).toBe("openai/gpt-oss-120b");
    expect(resolveGroqModel()).toBe("openai/gpt-oss-120b");
    expect(resolveGroqModel("openai/gpt-oss-20b")).toBe("openai/gpt-oss-20b");
  });
});

describe("Provider fallback and full-reading response integrity", () => {
  const request = { messages: [{ role: "user" as const, content: "Interpret all supplied evidence." }] };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("falls through from rejected Gemini to a successful Groq interpretation", async () => {
    Object.assign(ENV, {
      geminiApiKey: "test-gemini",
      groqApiKey: "test-groq",
      openrouterApiKey: "",
    });
    generateContent.mockRejectedValueOnce(Object.assign(new Error("Invalid request"), { status: 400 }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "groq-test",
      created: 1,
      model: "test",
      choices: [{ index: 0, message: { role: "assistant", content: "Complete joined interpretation." }, finish_reason: "stop" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await invokeLLM(request);
    expect(result.choices[0].message.content).toBe("Complete joined interpretation.");
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api.groq.com");
  });

  it("does not pass a blank Gemini reading to the user when another provider is available", async () => {
    Object.assign(ENV, {
      geminiApiKey: "test-gemini",
      groqApiKey: "test-groq",
      openrouterApiKey: "",
    });
    generateContent.mockResolvedValueOnce({ text: "", candidates: [{ finishReason: "STOP" }] });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "groq-test",
      created: 1,
      model: "test",
      choices: [{ index: 0, message: { role: "assistant", content: "Recovered from empty response." }, finish_reason: "stop" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await invokeLLM(request);
    expect(result.choices[0].message.content).toBe("Recovered from empty response.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports that no AI providers are configured rather than hanging", async () => {
    Object.assign(ENV, { geminiApiKey: "", groqApiKey: "", openrouterApiKey: "" });
    await expect(invokeLLM(request)).rejects.toThrow("AI_FREE_PROVIDER_UNCONFIGURED");
  });
});
