import { normalizeHoraryReading } from "./services/groqHoraryService";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { aspectBetween, calculateHoraryChart, horaryFollowUp, openHoraryQuestion, type HoraryInput } from "./horary";
import { calculateTraditionalHorary } from "./horaryTraditional";

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
    choices: [{ message: { role: "assistant", content: [
      "## The Answer\n\nA detailed, evidence-led horary reading for the synthetic test question.",
      "## What Is Happening\n\nThe matter has a distinct pressure point.",
      "## What Happens Next\n\nThe sequence depends on the conditions already present.",
      "## What This Means for You\n\nKeep the scope of the question in focus.",
    ].join("\n\n") } }],
  });
});

describe("traditional Horary doctrine", () => {
  it("uses exact ephemeris timestamps for future perfection instead of constant-speed estimates", () => {
    const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const rulers = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
    const houses = signs.map((sign, i) => ({ house: i + 1, longitude: i * 30, sign, ruler: rulers[i] }));
    const placements = [
      { name: "Sun", longitude: 120, house: 5, speed: 0.95, sign: "Leo" },
      { name: "Moon", longitude: 100, house: 4, speed: 13, sign: "Cancer" },
      { name: "Mercury", longitude: 70, house: 3, speed: 1, sign: "Gemini" },
      { name: "Venus", longitude: 50, house: 1, speed: 1.2, sign: "Taurus" },
      { name: "Mars", longitude: 0, house: 1, speed: 0.5, sign: "Aries" },
      { name: "Jupiter", longitude: 250, house: 9, speed: 0.08, sign: "Sagittarius" },
      { name: "Saturn", longitude: 280, house: 10, speed: 0.03, sign: "Capricorn" },
    ];
    const evidence = calculateTraditionalHorary({
      ascendant: { name: "Ascendant", longitude: 0, house: 1 },
      houses,
      placements,
      querentRuler: "Mars",
      subjectRuler: "Mars",
      topicRuler: "Venus",
      questionRuler: "Mars",
      referenceUtc: "2024-01-01T00:00:00.000Z",
      lookahead: {
        windowDays: 90,
        moonWindowDays: 3,
        upcomingAspects: [{
          first: "Mars",
          second: "Venus",
          aspect: "sextile",
          exactAtUtc: "2024-01-03T00:00:00.000Z",
          exactAtLocal: "Jan 2, 2024, 4:00 PM",
        }],
        stations: [],
      },
    });

    expect(evidence.perfection).toContainEqual(expect.objectContaining({
      type: "direct",
      planets: ["Mars", "Venus"],
      aspect: "sextile",
      description: expect.stringContaining("approximately 2.00 days"),
    }));
  });

  it("records reception from the host planet to the guest occupying its dignity", () => {
    const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const rulers = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
    const houses = signs.map((sign, i) => ({ house: i + 1, longitude: i * 30, sign, ruler: rulers[i] }));
    const placements = [
      { name: "Sun", longitude: 120, house: 5, speed: 0.95, sign: "Leo" },
      { name: "Moon", longitude: 100, house: 4, speed: 13, sign: "Cancer" },
      { name: "Mercury", longitude: 70, house: 3, speed: 1, sign: "Gemini" },
      { name: "Venus", longitude: 10, house: 1, speed: 1.2, sign: "Aries" },
      { name: "Mars", longitude: 40, house: 2, speed: 0.5, sign: "Taurus" },
      { name: "Jupiter", longitude: 250, house: 9, speed: 0.08, sign: "Sagittarius" },
      { name: "Saturn", longitude: 280, house: 10, speed: 0.03, sign: "Capricorn" },
    ];
    const evidence = calculateTraditionalHorary({
      ascendant: { name: "Ascendant", longitude: 0, house: 1 },
      houses,
      placements,
      querentRuler: "Mars",
      subjectRuler: "Mars",
      topicRuler: "Venus",
      questionRuler: "Mars",
    });
    expect(evidence.receptions).toContainEqual(expect.objectContaining({
      from: "Mars",
      to: "Venus",
      by: "domicile",
      mutual: true,
      description: "Mars receives Venus by domicile; the reception is mutual.",
    }));
  });
});

describe("horary astrology", () => {
  it("calculates one question-time chart and assigns both significators from house cusps", async () => {
    const chart = await calculateHoraryChart(sampleInput);

    expect(chart.question).toBe(sampleInput.question);
    expect(chart.askedAt).toMatch(/^2024-07-15T16:34:00/);
    expect(chart.houseSystem).toBe("Equal House");
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
    expect(typeof chart.traditional.moonStatus.voidOfCourse).toBe("boolean");
    expect(["LEANING YES", "LEANING NO", "MIXED / CONDITIONAL", "INSUFFICIENT TESTIMONY"]).toContain(chart.traditional.judgment.verdict);
    expect(chart.traditional.judgment.testimonies.length).toBeGreaterThan(0);
    expect(chart.evidenceText).toContain("PERFECTION / INTERRUPTION TESTIMONY");
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

  it("uses the child's turned house when the question names the querent's child", async () => {
    const chart = await calculateHoraryChart({
      ...sampleInput,
      subject: "other",
      question: "Will my child get into college?",
      topicHouse: 9,
    });
    expect(chart.subjectHouse).toBe(5);
    expect(chart.subjectRuler).toBe(chart.houses[4].ruler);
    expect(chart.actualTopicHouse).toBe(1); // 9th from the 5th
  });

  it("sends calculated astrology evidence and the translated clarity standard to the existing LLM adapter", async () => {
    const result = await openHoraryQuestion(sampleInput);
    const messages = mocked.invokeLLM.mock.calls[0][0].messages as Array<{ role: string; content: string }>;

    expect(result.reading).toContain("evidence-led horary reading");
    expect(messages[0].content).toContain("THE FIRMAMENT — MASTER AI HORARY INTERPRETER");
    expect(messages[0].content).toContain("CARE-CENTERED IMPERATIVE — NON-NEGOTIABLE");
    expect(messages[0].content).toContain("CARE-FIRST DELIVERY STANDARD — NON-NEGOTIABLE");
    expect(messages[0].content).toContain("Never write as though a loved one is merely a significator");
    expect(messages[0].content).toContain("HORARY VISIBLE ANSWER CONTRACT — REQUIRED");
    expect(messages[0].content).toContain("## What I hear beneath your question");
    expect(messages[0].content).toContain("what it means for this specific person");
    expect(messages[0].content).toContain("CALCULATE DEEPLY. JUDGE HIERARCHICALLY. INTERPRET HUMANLY.");
    expect(messages[0].content).toContain("The user should feel that the entire relevant chart was considered.");
    expect(messages[0].content).toContain("Do not expose hidden chain-of-thought");
    expect(messages[0].content).toContain("WHAT IS THE ANSWER?");
    expect(messages[1].content).toContain(sampleInput.question);
    expect(messages[1].content).toContain(result.chart.querentRuler);
    expect(messages[1].content).toContain(result.chart.subjectRuler);
    expect(messages[1].content).toContain(result.chart.topicRuler);
    expect(messages[1].content).toContain("Roles:");
    expect(messages[1].content).toContain("LOCAL FIRMAMENT CANON / DETERMINISTICALLY RETRIEVED");
    expect(messages[1].content).toContain("GOD VIEW / AGENT VIEW RELATIONSHIP SYNTHESIS");
    expect(messages[1].content).toContain("Synthesis shown in the box:");
    expect(messages[1].content).toContain("FULL 16/20-LAYER SYNTHESIS REPORT");
    expect(messages[1].content).toContain("16 SELF-KNOWLEDGE DIMENSIONS");
    expect(messages[1].content).toContain("16-SYSTEM CONVERGENCE AUDIT");
    expect(messages[1].content).toContain("PLANET INTERACTION MATRIX");
    expect(messages[1].content).toContain("LANGUAGE SAFETY RESTRICTIONS");
    expect(messages[1].content).toContain("This is the compact judgment evidence");
    expect(messages[1].content).toContain("FULL TECHNICAL EVIDENCE");
    expect(messages[1].content).toContain("TRADITIONAL MOON STATUS");
    expect(result.chart.canonEvidenceText).toContain("Condition:");
  });

  it("retains the calculated judgment and flags unavailable narrative when the provider fails", async () => {
    mocked.invokeLLM.mockRejectedValueOnce(new Error("provider unavailable"));
    const result = await openHoraryQuestion(sampleInput);
    expect(result.synthesisStatus).toBe("ai_unavailable");
    expect(result.reading).toBeNull();
    expect(result.chart.traditional.judgment.verdict).toBeTruthy();
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
    expect(messages.some(message => message.content.includes("Original horary judgment evidence"))).toBe(true);
    expect(messages.some(message => message.content.includes("Will the hypothetical applicant accept the new role?"))).toBe(true);
    expect(messages[0].content).toContain("Keep the original chart and question fixed");
  });
});


describe("instantaneous Horary contact phase", () => {
  const body = (name: string, longitude: number, speed: number) => ({ name, longitude, speed, display: "test", sign: "Aries", house: 1, retrograde: speed < 0 });
  it.each([
    [59, 13, 60, 0.1, "conjunction", "applying"],
    [61, 13, 60, 0.1, "conjunction", "separating"],
    [359, 13, 0, 0.1, "conjunction", "applying"],
    [59, 13, 0, 0.1, "sextile", "applying"],
    [181, -1, 0, 0, "opposition", "applying"],
    [179, 1, 0, 0, "opposition", "applying"],
    [60, 1, 0, 0, "sextile", "unclear"],
    [59, 1, 0, 1, "sextile", "unclear"],
  ] as const)("classifies %s° moving %s°/day against %s°", (a, speedA, b, speedB, aspect, phase) => {
    const first = body("Moon", a, speedA), second = body("Mars", b, speedB);
    expect(aspectBetween(first, second)).toMatchObject({ aspect, phase });
    expect(aspectBetween(second, first)).toMatchObject({ aspect, phase });
  });
});


describe("Horary edited inputs and natal separation", () => {
  it("recalculates question-time houses and positions while preserving the birth layer", async () => {
    const natal = { location: "Dallas, TX, USA", latitude: 32.7767, longitude: -96.797,
      timezone: "America/Chicago", date: "1986-11-20", time: "10:06" };
    const first = await calculateHoraryChart({ ...sampleInput, natal });
    const edited = await calculateHoraryChart({ ...sampleInput, natal, time: "15:34" });
    expect(first.natalChart!.movingBodies).toEqual(edited.natalChart!.movingBodies);
    expect(first.transitChart.transits.find(row => row.name === "Moon")!.longitude)
      .not.toBe(edited.transitChart.transits.find(row => row.name === "Moon")!.longitude);
    expect(first.ascendant.longitude).not.toBe(edited.ascendant.longitude);
    expect(first.askedAt).not.toBe(edited.askedAt);
    for (const chart of [first, edited]) {
      for (const placement of chart.placements) {
        const transit = chart.transitChart.transits.find(row => row.name === placement.name);
        if (transit) expect(transit.longitude).toBeCloseTo(placement.longitude, 8);
      }
    }
  });
  it("reports a child's actual relationship house consistently in the interpretation packet", async () => {
    const chart = await calculateHoraryChart({ ...sampleInput, subject: "other", subjectHouse: 5, topicHouse: 9 });
    expect(chart.evidenceText).toContain("another person (House 5)");
    expect(chart.evidenceText).not.toContain("another person (House 7)");
  });

  it("frames solo creative/project horary questions around the project instead of a two-person dispute", async () => {
    const soloInput: HoraryInput = {
      question: "Im thinking of creating me my own YouTube page full of my own divination created apps",
      subject: "querent",
      topicHouse: 5,
      location: "Las Vegas, NV, USA",
      latitude: 36.1699,
      longitude: -115.1398,
      timezone: "America/Los_Angeles",
      date: "2026-11-14",
      time: "15:09",
      natal: {
        location: "Dallas, Texas, USA",
        latitude: 32.7767,
        longitude: -96.797,
        timezone: "America/Chicago",
        date: "1986-11-20",
        time: "10:06",
      },
    };

    const result = await openHoraryQuestion(soloInput);
    expect(result.synthesisStatus).toBe("ai_completed");
    expect(result.chart.questionAnalysis.isInterpersonal).toBe(false);
    const request = mocked.invokeLLM.mock.calls.at(-1)![0];
    expect(request.messages[1].content).toContain("SUBJECT FRAMING: The querent is asking for themselves");

    mocked.invokeLLM.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(horaryFollowUp(result.chart, [], "What should I do next?")).rejects.toThrow("provider unavailable");
  });

  it("includes solo SUBJECT FRAMING and clean TONE AND LANGUAGE MANDATE in LLM prompt for querent questions", async () => {
    await openHoraryQuestion({
      ...sampleInput,
      question: "Should I launch my astrology app YouTube channel this winter?",
      subject: "querent",
      topicHouse: 5,
    });
    const messages = mocked.invokeLLM.mock.calls[0][0].messages as Array<{ role: string; content: string }>;
    expect(messages[1].content).toContain("SUBJECT FRAMING: The querent is asking for themselves");
    expect(messages[1].content).toContain("Do NOT assume this is a two-person argument or romance");
    expect(messages[1].content).toContain("TONE AND LANGUAGE MANDATE:");
  });

  it("automatically classifies 'What does this app need to make it complete?' without manual house/subject steps", async () => {
    mocked.invokeLLM.mockRejectedValueOnce(new Error("provider unavailable"));

    const result = await openHoraryQuestion({
      question: "What does this app need to make it complete?",
      location: sampleInput.location,
      latitude: sampleInput.latitude,
      longitude: sampleInput.longitude,
      timezone: sampleInput.timezone,
      date: sampleInput.date,
      time: sampleInput.time,
    });

    expect(result.chart.subject).toBe("querent");
    expect(result.chart.subjectHouse).toBe(1);
    expect(result.chart.topicHouse).toBe(5);
    expect(result.chart.actualTopicHouse).toBe(5);
    expect(result.chart.additionalTopicHouses.map(h => h.actualHouse)).toEqual(expect.arrayContaining([6, 10]));
    expect(result.chart.questionAnalysis.isInterpersonal).toBe(false);
    expect(result.chart.questionAnalysis.questionType).toBe("open_explanatory");
    expect(result.synthesisStatus).toBe("ai_unavailable");
    expect(result.reading).toBeNull();
  });

  it("turns brother's marriage automatically from House 3 to chart House 9 without user house input", async () => {
    const chart = await calculateHoraryChart({
      question: "Will my brother get married?",
      location: sampleInput.location,
      latitude: sampleInput.latitude,
      longitude: sampleInput.longitude,
      timezone: sampleInput.timezone,
      date: sampleInput.date,
      time: sampleInput.time,
    });

    expect(chart.subject).toBe("other");
    expect(chart.subjectHouse).toBe(3);
    expect(chart.topicHouse).toBe(7);
    expect(chart.actualTopicHouse).toBe(9);
    expect(chart.subjectRuler).toBe(chart.houses[2].ruler);
    expect(chart.topicRuler).toBe(chart.houses[8].ruler);
  });
});


describe("Horary four-section output contract", () => {
  const complete = [
    "**The Answer:**",
    "The evidence supports a specific outcome, with clear conditions for success.",
    "### What Is Happening",
    "You are confronting a practical obstacle that requires direct action.",
    "## What Happens Next",
    "The next stage depends on fulfilling the necessary conditions.",
    "## What This Means for You:",
    "Take the next concrete step, and observe the response before deciding.",
  ].join("\n\n");

  it("accepts equivalent markdown heading styles and canonicalizes the four sections", () => {
    const normalized = normalizeHoraryReading(complete);
    for (const heading of ["The Answer", "What Is Happening", "What Happens Next", "What This Means for You"]) {
      expect(normalized).toContain(`## ${heading}\n\n`);
    }
    expect(normalized).not.toContain("**The Answer:**");
  });

  it("rejects a missing final section instead of reporting a completed AI reading", () => {
    expect(() => normalizeHoraryReading(complete.split("## What This Means for You:")[0]))
      .toThrow("HORARY_READING_INCOMPLETE");
  });
});
