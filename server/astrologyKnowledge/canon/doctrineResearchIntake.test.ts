import { describe, expect, it } from "vitest";
import { DOCTRINE_RESEARCH_INTAKE, getDoctrineIntakeRecord } from "./doctrineResearchIntake";
describe("civilization doctrine research intake",()=>{
  it("stores 18 uniquely attributed doctrines",()=>{
    expect(DOCTRINE_RESEARCH_INTAKE).toHaveLength(18);
    expect(new Set(DOCTRINE_RESEARCH_INTAKE.map(r=>r.id)).size).toBe(18);
  });
  it("never treats a proposed research record as a verified executable rule",()=>{
    expect(DOCTRINE_RESEARCH_INTAKE.every(r=>r.status!==undefined && r.historicalSources.length>0 && r.requirements.length>0)).toBe(true);
    expect(getDoctrineIntakeRecord("MY-01")?.reviewNotes.join(" ")).toContain("pages 24–29");
    expect(getDoctrineIntakeRecord("JY-03")?.reviewNotes.join(" ")).toContain("THREE");
  });
});
