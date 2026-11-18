import { computeSynastry } from "../shared/synastryEngine";
import { calculateIndependentEnergyRead } from "../shared/energyScoring";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { calculateMasterChart } from "./masterChart/entry";
import { calculateHoraryChart, type HoraryChart } from "./horary";
import type { ChartResult } from "./astronomy";
import { invokeLLM } from "./_core/llm";
import { decodeEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import { MASTER_METHOD_IDS } from "./masterChart/registry";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const caller = appRouter.createCaller({
  user: null,
  req: {} as never,
  res: {} as never,
});
const birth = {
  location: "Dallas, Texas",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  date: "1986-11-20",
  time: "10:06",
};
const event = {
  location: "Las Vegas",
  latitude: 36.1699,
  longitude: -115.1398,
  timezone: "America/Los_Angeles",
  date: "2026-11-06",
  time: "16:22",
};
const question = "What makes this situation hard to move forward?";
const horaryInput = {
  ...event,
  question,
  subject: "querent" as const,
  topicHouse: 10,
};
let chart: ChartResult;
let target: ChartResult;
let horary: HoraryChart;
const providerError = "Fixture provider unavailable";

beforeAll(async () => {
  [chart, target, horary] = await Promise.all([
    calculateMasterChart({
      ...birth,
      worldview: "agent",
      readingScope: "combined",
      transitLocation: event.location,
      transitLatitude: event.latitude,
      transitLongitude: event.longitude,
      transitTimezone: event.timezone,
      transitDate: event.date,
      transitTime: event.time,
    }),
    calculateMasterChart({
      ...birth,
      date: "1990-02-15",
      worldview: "agent",
      readingScope: "natal",
    }),
    calculateHoraryChart(horaryInput),
  ]);
}, 30_000);

beforeEach(() => {
  vi.mocked(invokeLLM).mockReset().mockRejectedValue(new Error(providerError));
});

type RouteCase = [name: string, scopes: number, invoke: () => Promise<unknown>];
const routes: RouteCase[] = [
  [
    "astrologyKnowledge.behavioralReport",
    1,
    () =>
      caller.astrologyKnowledge.behavioralReport({
        chart,
        question,
        mode: "natal",
      }),
  ],
  [
    "interpretation.methodOutcomes",
    1,
    () => caller.interpretation.methodOutcomes({ chart, mode: "natal" }),
  ],
  [
    "interpretation.energyReading",
    1,
    () => caller.interpretation.energyReading({ chart }),
  ],
  [
    "interpretation.chartPage natal",
    1,
    () =>
      caller.interpretation.chartPage({ chart, mode: "natal", names: ["Sun"] }),
  ],
  [
    "interpretation.chartPage transit",
    1,
    () =>
      caller.interpretation.chartPage({
        chart,
        mode: "transit",
        names: ["Sun"],
      }),
  ],
  [
    "interpretation.chartPage combined",
    1,
    () =>
      caller.interpretation.chartPage({
        chart,
        mode: "combined",
        names: ["Sun"],
      }),
  ],
  [
    "interpretation.chartBriefing",
    1,
    () => caller.interpretation.chartBriefing({ chart }),
  ],
  [
    "interpretation.focusedPlacement star",
    1,
    () =>
      caller.interpretation.focusedPlacement({
        chart,
        target: { kind: "star", name: "Sirius", layer: "natal" },
      }),
  ],
  [
    "interpretation.focusedPlacement contact",
    1,
    () => {
      const transit = chart.transits.find(row => row.natalContacts?.length)!;
      return caller.interpretation.focusedPlacement({
        chart,
        target: {
          kind: "contact",
          name: transit.name,
          otherName: transit.natalContacts![0].natalName,
          layer: "transit",
        },
      });
    },
  ],
  [
    "interpretation.host",
    1,
    () => caller.interpretation.host({ chart, question, mode: "natal" }),
  ],
  [
    "interpretation.chatWithChart",
    1,
    () => caller.interpretation.chatWithChart({ chart, question }),
  ],
  [
    "interpretation.generate",
    1,
    () => caller.interpretation.generate({ chart, question, mode: "natal" }),
  ],
  [
    "interpretation.masterSynthesize chart",
    1,
    () =>
      caller.interpretation.masterSynthesize({
        ...birth,
        chart,
        question,
        mode: "natal",
      }),
  ],
  [
    "interpretation.masterSynthesize inputs",
    1,
    () =>
      caller.interpretation.masterSynthesize({
        ...birth,
        question,
        mode: "natal",
      }),
  ],
  [
    "interpretation.chapter",
    1,
    () =>
      caller.interpretation.chapter({
        chart,
        mode: "natal",
        intelligence: "",
        chapterId: "identity",
      }),
  ],
  [
    "interpretation.followUp",
    1,
    () =>
      caller.interpretation.followUp({
        chart,
        mode: "natal",
        interpretation: { intelligence: "", reading: "" },
        history: [],
        question,
      }),
  ],
  [
    "ai.answerChartQuestion",
    1,
    () => caller.ai.answerChartQuestion({ chart, question }),
  ],
  [
    "ai.askTransitQuestion",
    1,
    () => caller.ai.askTransitQuestion({ chart, question }),
  ],
  [
    "ai.generateSoulmatePrediction",
    1,
    () => caller.ai.generateSoulmatePrediction({ chart }),
  ],
  [
    "ai.generateSynastryBreakdown",
    2,
    () =>
      caller.ai.generateSynastryBreakdown({
        userChart: chart,
        targetChart: target,
      }),
  ],
  ["ai.genesisReading", 1, () => caller.ai.genesisReading({ chart, question })],
  [
    "horary.followUp",
    1,
    () => caller.horary.followUp({ chart: horary, question, history: [] }),
  ],
  [
    "zodiacHorary.read",
    1,
    () =>
      caller.zodiacHorary.read({
        sign: "Scorpio",
        date: event.date,
        time: event.time,
        question,
      }),
  ],
  [
    "lifeStory.generateChapter",
    1,
    () => caller.lifeStory.generateChapter({ chart, chapterKey: "childhood" }),
  ],
  [
    "social.systemIntersect",
    2,
    () =>
      caller.social.systemIntersect({ userChart: chart, targetChart: target }),
  ],
  [
    "social.checkInStatus",
    1,
    () =>
      caller.social.checkInStatus({
        ...birth,
        name: "Fixture",
        relationship: "friend",
      }),
  ],
  [
    "simulationLab.predict",
    1,
    () =>
      caller.simulationLab.predict({
        id: "fixture-game",
        league: "NBA",
        scheduledDate: event.date,
        scheduledTime: event.time,
        venue: { ...event, name: event.location },
        ascTeam: "Team A",
        descTeam: "Team B",
      }),
  ],
];

function routeEvidencePacket(): string {
  const message = vi.mocked(invokeLLM).mock.calls[0][0].messages.find(
    message => message.role === "user" && String(message.content).startsWith("{")
  );
  expect(message).toBeDefined();
  return String(message!.content);
}

function expectCompleteDossiers(count: number) {
  const calls = vi.mocked(invokeLLM).mock.calls;
  expect(calls).toHaveLength(1);
  const message = calls[0][0].messages.find(message =>
    String(message.content).startsWith(
      "COMPLETE CALCULATED INTERPRETATION DOSSIER."
    )
  );
  expect(Boolean(message)).toBe(true);
  const packet = JSON.parse(String(message!.content).split("\n").at(-1)!);
  const ledgers = decodeEvidence(packet) as Array<{
    methods: Array<unknown[]>;
    calculations: Array<unknown[]>;
    canon: unknown[];
  }>;
  expect(ledgers).toHaveLength(count);
  for (const ledger of ledgers) {
    const methods = ledger.methods.map(row => row[0]);
    expect(methods).toEqual(expect.arrayContaining([...MASTER_METHOD_IDS]));
    expect(ledger.calculations.map(row => row[0])).toEqual(methods);
    expect(ledger.canon.length).toBeGreaterThan(0);
  }
}

describe("user-facing tRPC interpretation routes", () => {
  it.each(routes)(
    "%s sends the complete registry and propagates provider failure",
    async (_name, count, invoke) => {
      await expect(invoke()).rejects.toThrow(
        /Fixture provider unavailable|reading plan could not|interpretation service could not|synthesized chapter could not/i
      );
      expectCompleteDossiers(count);
    },
    20_000
  );

  it.each([
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
    "Uranus", "Neptune", "Pluto", "Ascendant", "Descendant", "North Node", "South Node",
  ])("returns a focused reading for %s in the placement inventory", async name => {
    const prose = "You notice changes in the way people respond to you, and you remember the moments when their actions line up with their words. Let those moments tell you where trust has room to grow.";
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: prose } }],
    } as Awaited<ReturnType<typeof invokeLLM>>);
    const reading = await caller.interpretation.focusedPlacement({
      chart,
      target: { kind: "placement", name, layer: "natal" },
    });
    expect(reading.title).toBe(`Natal ${name}`);
    expect(reading.miniNarrative).toBe(prose);
    expect(reading.sections.length).toBeGreaterThan(0);
    expect(reading.evidence.some(item => item.id === `placement-${name}`)).toBe(true);
    expectCompleteDossiers(1);
  }, 20_000);

  it("keeps Moon findings after a Gemini 404 and generates synthesis on retry", async () => {
    const input = { chart: target, target: { kind: "placement", name: "Moon", layer: "natal" } } as const;
    vi.mocked(invokeLLM).mockRejectedValueOnce(
      new Error("AI_PROVIDERS_FAILED: gemini GEMINI_REQUEST_FAILED: HTTP 404"),
    );
    const partial = await caller.interpretation.focusedPlacement(input);
    expect(partial.synthesisUnavailable).toBe(true);
    expect(partial.miniNarrative).toBeUndefined();
    expect(partial.sections.length).toBeGreaterThan(0);
    expect(partial.evidence.some(item => item.id === "placement-Moon")).toBe(true);
    expectCompleteDossiers(1);

    const prose = "You feel the shift when somebody stops making an effort to meet you halfway. Ask them plainly what they are willing to give before you take on the whole weight of keeping the connection alive.";
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: prose } }],
    } as Awaited<ReturnType<typeof invokeLLM>>);
    const recovered = await caller.interpretation.focusedPlacement(input);
    expect(recovered.synthesisUnavailable).toBeUndefined();
    expect(recovered.miniNarrative).toBe(prose);
    expect(recovered.evidence).toEqual(partial.evidence);
  }, 20_000);

  it("reads the selected Synastry Studio contact using both verified charts and the Studio contact list", async () => {
    const studio = computeSynastry(target, chart);
    const focus = studio.aspects[0];
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "stop",
          message: {
            role: "assistant",
            content:
              "One person may move to resolve a conversation quickly while the other needs time to understand what was said. Check what the other person heard before assuming that you agree.",
          },
        },
      ],
    } as Awaited<ReturnType<typeof invokeLLM>>);
    const result = await caller.ai.generateSynastryBreakdown({
      userChart: target,
      targetChart: chart,
      focus,
    });
    expect(result.interpretation).toContain("before assuming that you agree");
    expectCompleteDossiers(2);
    const packet = decodeEvidence(
      JSON.parse(
        routeEvidencePacket()
      )
    ) as {
      studio: typeof studio;
      selectedContact: typeof focus;
    };
    expect(packet.studio).toEqual(studio);
    expect(packet.selectedContact).toEqual(focus);
  }, 20_000);

  it("refuses to interpret a cross-chart contact that the Studio did not calculate", async () => {
    await expect(
      caller.ai.generateSynastryBreakdown({
        userChart: chart,
        targetChart: target,
        focus: { planetA: "Made up", planetB: "Moon", aspect: "Trine" },
      })
    ).rejects.toThrow("SYNASTRY_CONTACT_MISSING");
    expect(invokeLLM).not.toHaveBeenCalled();
  }, 20_000);

  it("reads both the overview and the selected contact of the independent event sky", async () => {
    const eventChart = await calculateMasterChart({
      ...event,
      worldview: "agent",
      readingScope: "natal",
      chartRole: "event",
    });
    const contact = calculateIndependentEnergyRead(eventChart)!.contacts[0];
    for (const contactId of [undefined, contact.id]) {
      vi.mocked(invokeLLM).mockClear();
      await expect(
        caller.interpretation.independentSkyReading({
          chart: eventChart,
          contactId,
        })
      ).rejects.toThrow(providerError);
      expectCompleteDossiers(1);
      const packet = decodeEvidence(
        JSON.parse(
          routeEvidencePacket()
        )
      ) as { contact?: typeof contact };
      expect(packet.contact).toEqual(contactId ? contact : undefined);
    }
    vi.mocked(invokeLLM).mockClear();
    await expect(
      caller.interpretation.independentSkyReading({
        chart: eventChart,
        contactId: "missing",
      })
    ).rejects.toThrow("absent");
    expect(invokeLLM).not.toHaveBeenCalled();
  }, 20_000);

  it("anchors the forecast-day consultation to the selected transit instant", async () => {
    const forecast = await calculateMasterChart({
      ...chart.input,
      transitDate: "2026-11-20",
      transitTime: "12:00",
      transitInstantUtc: undefined,
      worldview: "agent",
      readingScope: "combined",
    });
    await expect(
      caller.interpretation.host({ chart: forecast, mode: "transit", question })
    ).rejects.toThrow(providerError);
    expectCompleteDossiers(1);
    const system = vi.mocked(invokeLLM).mock.calls[0][0].messages
      .filter(message => message.role === "system")
      .map(message => message.content)
      .join("\n");
    expect(system).toContain(
      `Selected transit instant: ${forecast.transitDate}`
    );
    expect(forecast.transitDate).not.toEqual(chart.transitDate);
  }, 20_000);

  it("calculates the Energy barometer's independent score from the transit bodies", () => {
    const nodes = chart.transits.filter(
      row => row.name === "North Node" || row.name === "South Node"
    );
    const eventAsBase = {
      ...chart,
      movingBodies: chart.transits.filter(row => !nodes.includes(row)),
      northNode: nodes.find(row => row.name === "North Node")!,
      southNode: nodes.find(row => row.name === "South Node")!,
    };
    expect(calculateIndependentEnergyRead(chart, "transit")).toEqual(
      calculateIndependentEnergyRead(eventAsBase)
    );
    expect(calculateIndependentEnergyRead(chart, "transit")).not.toEqual(
      calculateIndependentEnergyRead(chart)
    );
    expect(
      calculateIndependentEnergyRead({ ...chart, transits: [] }, "transit")
    ).toBeNull();
  });

  it("placement uses the reference registry transport and does not substitute prose", async () => {
    await expect(
      caller.astrologyKnowledge.placementSynthesis({ chart, body: "Sun" })
    ).rejects.toThrow(providerError);
    const { messages } = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(String(messages[1].content)).toContain(
      "FULL CALCULATED CHART AND METHOD OUTCOMES"
    );
    const packed = decodeEvidence(
      JSON.parse(String(messages[1].content).split("\n").at(-1)!)
    ) as {
      methods: Array<[string, ...unknown[]]>;
      coverage: { omittedFindings: number; truncated: boolean };
    };
    expect(packed.coverage).toMatchObject({ omittedFindings: 0, truncated: false });
    expect(packed.methods.map(method => method[0])).toEqual(
      expect.arrayContaining([...MASTER_METHOD_IDS])
    );
  }, 20_000);

  it("horary keeps the verdict and chart when the canonical narration fails", async () => {
    const result = await caller.horary.open(horaryInput);
    expect(result.synthesisStatus).toBe("ai_unavailable");
    expect(result.reading).toBeNull();
    expect(result.chart.traditional.judgment.verdict).toBeTruthy();
    expectCompleteDossiers(1);
  }, 20_000);
});
