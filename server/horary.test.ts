import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { calculateHoraryChart, horaryFollowUp, openHoraryQuestion, type HoraryInput } from "./horary";

const sampleInput: HoraryInput = {
  question: "Will the hypothetical applicant accept the new role?",
  subject: "querent",
  topicHouse: 10,
  location: "New York, NY, USA",
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
  date: "2024-07-15",
  time: "12:34",
};

beforeEach(() => {
  mocked.invokeLLM.mockReset();
  mocked.invokeLLM.mockResolvedValue({
    choices: [{ message: { role: "assistant", content: "A detailed, evidence-led horary reading for the synthetic test question." } }],
  });
});

describe("horary astrology", () => {
  it("calculates one question-time chart and assigns both significators from house cusps", async () => {
    const chart = await calculateHoraryChart(sampleInput);

    expect(chart.question).toBe(sampleInput.question);
    expect(chart.askedAt).toMatch(/^2024-07-15T16:34:00/);
    expect(chart.houseSystem).toBe("Topocentric Equal House");
    expect(chart.subjectHouse).toBe(1);
    expect(chart.actualTopicHouse).toBe(10);
    expect(chart.houses).toHaveLength(12);
    expect(chart.querentRuler).toBe(chart.houses[0].ruler);
    expect(chart.subjectRuler).toBe(chart.houses[0].ruler);
    expect(chart.topicRuler).toBe(chart.houses[9].ruler);
    expect(chart.moon.name).toBe("Moon");
    expect(chart.placements.some(planet => planet.name === "Moon")).toBe(true);
    expect(chart.lookahead).toMatchObject({ windowDays: 90, moonWindowDays: 3 });
    expect(chart.natalChart).toBeUndefined();
    expect(chart.transitChart.transitDate).toBe(chart.askedAt);
    expect(chart.godChart.ascendant).toBeNull();
    expect(chart.evidenceText).toContain("NATAL / AGENT EVIDENCE SET");
    expect(chart.evidenceText).toContain("TRANSIT / QUESTION-MOMENT EVIDENCE SET");
    expect(chart.evidenceText).toContain("GOD VIEW / GEOCENTRIC EVIDENCE SET");
    expect(chart.evidenceText).toContain("Upcoming exact aspects");
    expect(chart.evidenceText).toContain("not a prediction of when an event will happen");
    expect(chart.evidenceText).toContain("Planetary stations");
    expect(chart.evidenceText).toContain("Method boundary");
    expect(chart.evidenceText).toContain("traditional layer now calculates configured Lots");
    expect(chart.traditional.lots).toHaveLength(4);
    expect(chart.traditional.dignities.length).toBeGreaterThan(0);
    expect(chart.traditional.overlays.some(row => row.nakshatra && row.manzil && row.decan)).toBe(true);
  });

  it("turns the selected topic house from the 7th when the question is about another person", async () => {
    const chart = await calculateHoraryChart({ ...sampleInput, subject: "other" });

    expect(chart.subjectHouse).toBe(7);
    expect(chart.subjectRuler).toBe(chart.houses[6].ruler);
    expect(chart.actualTopicHouse).toBe(4); // 10th from the 7th
    expect(chart.topicRuler).toBe(chart.houses[3].ruler);
    expect(chart.evidenceText).toContain("another person (House 7)");
    expect(chart.evidenceText).toContain("actual chart house 4");
  });

  it("sends calculated astrology evidence and the translated clarity standard to the existing LLM adapter", async () => {
    const result = await openHoraryQuestion(sampleInput);
    const messages = mocked.invokeLLM.mock.calls[0][0].messages as Array<{ role: string; content: string }>;

    expect(result.reading).toContain("evidence-led horary reading");
    expect(messages[0].content).toContain("WHAT → WHY → HOW → CONSEQUENCE → MEANING");
    expect(messages[0].content).toContain("Do not mention Tarot");
    expect(messages[0].content).toContain("Never switch or collapse these roles");
    expect(messages[0].content).toContain("Do not calculate or claim any aspect");
    expect(messages[0].content).toContain("NATAL / AGENT");
    expect(messages[0].content).toContain("TRANSIT / QUESTION-MOMENT");
    expect(messages[0].content).toContain("GOD VIEW / GEOCENTRIC");
    expect(messages[0].content).toContain("not as when a real-world event will happen");
    expect(messages[0].content).toContain("KNOWLEDGE IS THE MATERIAL.");
    expect(messages[0].content).toContain("ASTROLOGY DOMAIN ADAPTER");
    expect(messages[1].content).toContain(sampleInput.question);
    expect(messages[1].content).toContain(result.chart.querentRuler);
    expect(messages[1].content).toContain(result.chart.subjectRuler);
    expect(messages[1].content).toContain(result.chart.topicRuler);
    expect(messages[1].content).toContain("Significator roles");
    expect(messages[1].content).toContain("Upcoming exact aspects");
    expect(messages[1].content).toContain("Planetary stations");
    expect(messages[1].content).toContain("Do not recalculate");
  });

  it("adds a person natal layer while keeping transit and God View at the question moment", async () => {
    const chart = await calculateHoraryChart({
      ...sampleInput,
      natal: {
        location: "Dallas, Texas, USA",
        latitude: 32.7767,
        longitude: -96.797,
        timezone: "America/Chicago",
        date: "1986-11-20",
        time: "10:06",
      },
    });

    expect(chart.natalChart?.input.date).toBe("1986-11-20");
    expect(chart.natalChart?.ascendant).not.toBeNull();
    expect(chart.transitChart.transitDate).toBe(chart.askedAt);
    expect(chart.godChart.transitDate).toBe(chart.askedAt);
    expect(chart.godChart.ascendant).toBeNull();
  });

  it("keeps follow-up chat anchored to the same chart and submits the current turn only once", async () => {
    const chart = await calculateHoraryChart(sampleInput);
    const question = "Which testimony most complicates that provisional answer?";
    await horaryFollowUp(chart, [
      { role: "user", content: "Will the hypothetical applicant accept the new role?" },
      { role: "assistant", content: "The initial reading is mixed." },
      { role: "user", content: question },
    ], question);

    const messages = mocked.invokeLLM.mock.calls[0][0].messages as Array<{ role: string; content: string }>;
    expect(messages.filter(message => message.role === "user" && message.content === question)).toHaveLength(1);
    expect(messages.some(message => message.content.includes("Original horary evidence"))).toBe(true);
    expect(messages.some(message => message.content.includes("Will the hypothetical applicant accept the new role?"))).toBe(true);
    expect(messages[0].content).toContain("Keep the original chart and question fixed");
  });
});
