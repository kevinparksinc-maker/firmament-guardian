import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { env, generateContent } = vi.hoisted(() => ({
  env: { geminiApiKey: "private-gemini", geminiModel: "configured-gemini", groqApiKey: "private-groq", groqModel: "configured-groq", openrouterApiKey: "private-router", openrouterModel: "configured-router", anthropicApiKey: "unused-legacy-key" },
  generateContent: vi.fn(),
}));
vi.mock("./_core/env", () => ({ ENV: env, DEFAULT_GEMINI_MODEL: "gemini-3.5-flash" }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; }, ThinkingLevel: { MINIMAL: "MINIMAL" } }));
import { invokeLLM } from "./_core/llm";

const fetchMock = vi.fn();
const messages = [{ role: "system" as const, content: "Canon" }, { role: "user" as const, content: "Complete private chart" }];
const answer = { model: "configured-router", choices: [{ message: { role: "assistant", content: "A complete interpretation." }, finish_reason: "stop" }] };
beforeEach(() => { generateContent.mockReset(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("interpreter provider failover", () => {
  it("starts with configured Gemini and forwards the output budget", async () => {
    generateContent.mockResolvedValue({ text: "Reading", candidates: [{ finishReason: "STOP" }] });
    await invokeLLM({ messages, model: "claude-obsolete", maxTokens: 6500 });
    expect(generateContent.mock.calls[0][0]).toMatchObject({ model: env.geminiModel, config: { maxOutputTokens: 6500 } });
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15_000);

  it("falls from Gemini through Groq to OpenRouter without losing evidence", async () => {
    generateContent.mockRejectedValue(new Error("secret key and chart must never escape"));
    fetchMock.mockResolvedValueOnce(new Response("private body", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(answer)));
    await expect(invokeLLM({ provider: "gemini", messages, model: "claude-obsolete", maxTokens: 6500 })).resolves.toMatchObject(answer);
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(["https://api.groq.com/openai/v1/chat/completions", "https://openrouter.ai/api/v1/chat/completions"]);
    for (const [, init] of fetchMock.mock.calls) expect(JSON.parse(init.body).messages).toEqual(messages);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ model: env.openrouterModel, max_tokens: 6500 });
  });

  it("rejects truncated or empty output and tries the next provider", async () => {
    generateContent.mockResolvedValue({ text: "Partial", candidates: [{ finishReason: "MAX_TOKENS" }] });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ...answer, choices: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(answer)));
    await expect(invokeLLM({ messages })).resolves.toMatchObject(answer);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports each failed provider and status without exposing private bodies", async () => {
    generateContent.mockRejectedValue(new Error("private-gemini Complete private chart"));
    fetchMock.mockImplementation(async () => new Response("private-groq Complete private chart", { status: 401 }));
    const error = await invokeLLM({ messages }).catch(error => error as Error);
    expect(error.message).toMatch(/gemini.*groq.*HTTP 401.*openrouter.*HTTP 401/);
    expect(error.message).not.toMatch(/private-|Complete private chart/);
  });

  it("stops immediately when the caller cancels", async () => {
    const controller = new AbortController(); controller.abort(new Error("Cancelled by caller"));
    await expect(invokeLLM({ messages, signal: controller.signal })).rejects.toThrow("Cancelled by caller");
    expect(generateContent).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("moves past a Gemini timeout within the configured deadline", async () => {
    generateContent.mockImplementation(() => new Promise(() => {}));
    fetchMock.mockResolvedValue(new Response(JSON.stringify(answer)));
    await expect(invokeLLM({ messages, timeoutMs: 20 })).resolves.toMatchObject(answer);
    expect(fetchMock.mock.calls[0][0]).toContain("api.groq.com");
  });

  it("moves past a quota error with a long cooldown", async () => {
    generateContent.mockRejectedValue({ status: 429, message: "Quota exceeded; retry in 30s" });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(answer)));
    await expect(invokeLLM({ messages })).resolves.toMatchObject(answer);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("never uses a legacy paid key when the free-provider chain is unconfigured", async () => {
    const keys = { geminiApiKey: env.geminiApiKey, groqApiKey: env.groqApiKey, openrouterApiKey: env.openrouterApiKey };
    try {
      Object.assign(env, { geminiApiKey: "", groqApiKey: "", openrouterApiKey: "" });
      await expect(invokeLLM({ messages })).rejects.toThrow("AI_FREE_PROVIDER_UNCONFIGURED");
      expect(fetchMock).not.toHaveBeenCalled(); expect(generateContent).not.toHaveBeenCalled();
    } finally { Object.assign(env, keys); }
  });
});
