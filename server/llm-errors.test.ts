import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./_core/env", () => ({
  DEFAULT_GEMINI_MODEL: "gemini-3.5-flash",
  ENV: { geminiApiKey: "", groqApiKey: "", openrouterApiKey: "test-router", openrouterModel: "test-model" },
}));
import { invokeLLM } from "./_core/llm";

afterEach(() => vi.unstubAllGlobals());

describe("AI request error handling", () => {
  it("does not retry a rejected 400 or leak the provider response body", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: "Your credit balance is too low" } }),
      { status: 400, statusText: "Bad Request" }
    ));
    vi.stubGlobal("fetch", fetch);
    const error = await invokeLLM({ messages: [{ role: "user", content: "Summary" }] }).catch(error => error as Error);
    expect(error.message).toContain("OPENROUTER_REQUEST_FAILED: HTTP 400");
    expect(error.message).not.toContain("Your credit balance is too low");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aborts a timed-out generation without resending the same request", async () => {
    const fetch = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    await expect(invokeLLM({
      messages: [{ role: "user", content: "Summary" }], timeoutMs: 40,
    })).rejects.toThrow(/timeout/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
