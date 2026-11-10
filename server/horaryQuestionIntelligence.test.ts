import { describe, expect, it } from "vitest";
import { resolveHoraryQuestion } from "./horaryQuestionIntelligence";

const houses = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
].map((ruler, index) => ({ house: index + 1, ruler }));
const resolve = (question: string) => resolveHoraryQuestion(question, houses);
const get = (result: ReturnType<typeof resolve>, id: string) => result.assignments.find(row => row.id.startsWith(id));

describe("Horary question intelligence", () => {
  it("assigns a partner and turns the career house from the partner, preserving evidence wording", () => {
    const result = resolve("Will my partner get the new job offer?");
    expect(result.status).toBe("resolved");
    expect(get(result, "person:partner")).toMatchObject({ house: 7, wording: "my partner" });
    expect(get(result, "matter:career")).toMatchObject({ house: 4, relativeHouse: 10, radicalHouse: 7, wording: "new job" });
    expect(result.questionIntent).toMatchObject({ action: "get", desiredOutcome: "Will my partner get the new job offer", querent: "person asking the question" });
    expect(result.questionIntent.people[0]).toMatchObject({ label: "the partner", house: 7 });
    expect(result.questionIntent.objects).toContain("new job");
  });

  it("assigns a child and the child's turned health house plus the querent's body", () => {
    const result = resolve("Will my child's health improve after treatment?");
    expect(get(result, "person:child")?.house).toBe(5);
    expect(get(result, "matter:health")).toMatchObject({ house: 10, relativeHouse: 6, radicalHouse: 5 });
    expect(get(result, "body:querent")?.house).toBe(1);
  });

  it.each([
    ["Will my mother recover from her illness?", "person:mother", 4, "matter:health", 9],
    ["Will my sibling find a new job?", "person:sibling", 3, "matter:career", 12],
    ["Will I receive the salary increase?", "querent", 1, "matter:money", 2],
    ["Will I recover my missing wallet?", "querent", 1, "matter:money", 2],
    ["Should I buy this house?", "querent", 1, "matter:property", 4],
    ["Will my long-distance trip and visa succeed?", "querent", 1, "matter:travel_study", 9],
    ["Will I win my court case against the contractor?", "querent", 1, "matter:travel_study", 9],
  ])("resolves doctrine for %s", (question, personId, personHouse, matterId, matterHouse) => {
    const result = resolve(question);
    expect(result.status).toBe("resolved");
    expect(get(result, personId as string)?.house).toBe(personHouse);
    expect(get(result, matterId as string)?.house).toBe(matterHouse);
    expect(get(result, matterId as string)?.ruler).toBe(houses[(matterHouse as number) - 1].ruler);
  });

  it("keeps opponent, law, and ruling distinct in a legal dispute", () => {
    const result = resolve("Will I win my lawsuit against my former business partner?");
    expect(get(result, "matter:travel_study")?.house).toBe(9);
    expect(get(result, "matter:legal_opponent")?.house).toBe(7);
    expect(get(result, "matter:legal_outcome")?.house).toBe(10);
  });

  it("turns a relationship chain instead of forcing it into House 7", () => {
    const result = resolve("Will my sister's child get into college?");
    expect(get(result, "person:child:turned")).toMatchObject({ house: 7, radicalHouse: 3, relativeHouse: 5 });
    expect(get(result, "matter:travel_study")).toMatchObject({ house: 3, radicalHouse: 7, relativeHouse: 9 });
  });

  it("returns rulers, reasoning, and exact supporting wording for every assignment", () => {
    const result = resolve("Will my father sell his property?");
    expect(result.significators.some(row => row.planet === "Moon" && row.roles.includes("natural co-significator of the question and unfolding circumstances"))).toBe(true);
    expect(result.assignments.every(row => row.ruler && row.reasoning && row.wording)).toBe(true);
  });

  it("asks one brief clarification for an ambiguous third-person pronoun instead of silently assigning House 7", () => {
    const result = resolve("Will they return the money to me?");
    expect(result.status).toBe("clarification_needed");
    expect(result.clarificationQuestion).toBe("Who does “they” refer to in your question?");
    expect(result.assignments.some(row => row.house === 7 && row.role === "person")).toBe(false);
  });

  it("clarifies an unspecified parent because maternal and paternal assignments differ", () => {
    const result = resolve("Will my parent recover from illness?");
    expect(result.status).toBe("clarification_needed");
    expect(result.clarificationQuestion).toBe("Could you clarify: are you asking about your mother or your father?");
  });

  it("does not repeat the clarification after the querent specifies the father", () => {
    const result = resolve("Will my parent recover from illness? [Clarification: my father]");
    expect(result.status).toBe("resolved");
    expect(result.assignments.some(row => row.relationship === "parent")).toBe(false);
    expect(get(result, "person:father")).toMatchObject({ house: 10 });
  });

  it("accepts an optional expert-selected subject and relative matter house", () => {
    const result = resolveHoraryQuestion("What will happen next?", houses, { enabled: true, subjectHouse: 5, topicHouse: 9 });
    expect(get(result, "person:expert-override")).toMatchObject({ house: 5, ruler: "Sun" });
    expect(get(result, "matter:expert-topic")).toMatchObject({ house: 1, relativeHouse: 9, ruler: "Mars" });
  });
});
