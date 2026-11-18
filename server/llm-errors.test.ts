import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    geminiApiKey: "",
    groqApiKey: "test-key",
    groqModel: "test-model",
    openrouterApiKey: "",
    anthropicApiKey: "",
  },
}));
import { invokeLLM } from "./_core/llm";

afterEach(() => vi.unstubAllGlobals());

describe("AI provider request error handling", () => {
  it("does not retry a rejected 400 or reveal provider response bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Private chart and financial details from provider" },
    }), { status: 400, statusText: "Bad Request" }));
    vi.stubGlobal("fetch", fetchMock);
    const error = await invokeLLM({
      messages: [{ role: "user", content: "Private chart details" }],
    }).catch(value => value as Error);
    expect(error.message).toContain("groq");
    expect(error.message).toContain("HTTP 400");
    expect(error.message).not.toMatch(/Private chart|financial details/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("times out a hanging provider call without retrying or leaking the prompt", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }));
    vi.stubGlobal("fetch", fetchMock);
    const error = await invokeLLM({
      messages: [{ role: "user", content: "Private chart details" }],
      timeoutMs: 40,
    }).catch(value => value as Error);
    expect(error.message).toMatch(/AI_PROVIDERS_FAILED: groq .*timeout/i);
    expect(error.message).not.toContain("Private chart");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
