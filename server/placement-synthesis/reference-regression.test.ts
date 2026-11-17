import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateMasterChart } from "../masterChart/entry";
import { synthesizePlacement } from "./orchestrator";
import { invokeLLM } from "../_core/llm";

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

const text =
  "You hold back your first impression until you have watched what someone actually does. People trust you with the part of a problem that requires patience and discretion.\n\nYou can keep watching long after you know enough to speak. When that happens, people have to guess what you need while you are waiting for them to show you that they mean what they say.";
const birth = {
  location: "Dallas, Texas",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
  worldview: "agent" as const,
  transitLocation: "Las Vegas",
  transitLatitude: 36.1699,
  transitLongitude: -115.1398,
  transitTimezone: "America/Los_Angeles",
  transitDate: "2026-11-06",
  transitTime: "16:22",
};
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

afterEach(() => vi.useRealTimers());

describe("November 16 placement reference", () => {
  // Captured by running the original ZIP's orchestrator against the same
  // chart, clock and mocked provider response.
  const reference = [
    {
      body: "Sun",
      readingScope: "natal",
      request:
        "a6ce97d2cbd300b1dad4eb8b3de618f2525c6c65353772c63d214b0e05ef0faf",
      output:
        "fd45c037afb326a306c67f7d44610680cbd1bd936aa00ecb7e5d24dbfaa3aa63",
    },
    {
      body: "Moon",
      readingScope: "combined",
      request:
        "d66a869fd476026351615d51bc2567e29e3d7c97ab652e1d29ffe1eb83980a37",
      output:
        "f023547ad09519f7c7af1eee6a0cb491b985967c3660e27c59eff60653f01567",
    },
  ] as const;

  it.each(reference)(
    "preserves the provider request and returned $body $readingScope reading",
    async fixture => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-07T00:22:00Z"));
      const chart = await calculateMasterChart({
        ...birth,
        readingScope: fixture.readingScope,
      });
      vi.mocked(invokeLLM)
        .mockClear()
        .mockResolvedValue({
          choices: [{ message: { content: text }, finish_reason: "stop" }],
        } as never);
      const result = await synthesizePlacement(chart, fixture.body);
      const request = vi.mocked(invokeLLM).mock.calls[0][0];
      expect(hash(request.messages)).toBe(fixture.request);
      expect(hash(result)).toBe(fixture.output);
      expect(request).toMatchObject({ maxTokens: 900, timeoutMs: 60_000 });
      expect(result.synthesis).toBe(text);
    },
    12000
  );

  it("rejects a one-paragraph placement even when the provider reports success", async () => {
    const chart = await calculateMasterChart({
      ...birth,
      readingScope: "natal",
    });
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        { message: { content: text.split("\n\n")[0] }, finish_reason: "stop" },
      ],
    } as never);
    await expect(synthesizePlacement(chart, "Sun")).rejects.toThrow(
      "PLACEMENT_SYNTHESIS_INCOMPLETE"
    );
  });
});
