import { describe, expect, it } from "vitest";
import { UNIVERSAL_METHOD_FAMILIES, methodCoverage, formatUniversalMethodCoverage } from "./methodCoverage";
import type { AstrologyEvidencePacket, EvidenceItem } from "./types";
const item: EvidenceItem = { id: "sy-four-worlds",tradition:"firmament",category:"source-correspondence",technique:"four-worlds",subject:"Four Worlds",statement:"Symbolic formation and action",concepts:["kabbalah"],sourceId:"sy",sourceTrace:{sourceId:"sy",tradition:"firmament",technique:"four-worlds",sourceTitle:"Four Worlds",retrievedAt:"2026-10-22T00:00:00.000Z",confidence:"reference-only"} };
describe("universal method registry", () => {
 it("declares each distinct core family once", () => {
   expect(UNIVERSAL_METHOD_FAMILIES.length).toBeGreaterThanOrEqual(12);
   expect(new Set(UNIVERSAL_METHOD_FAMILIES.map(x=>x[0])).size).toBe(UNIVERSAL_METHOD_FAMILIES.length);
 });
 it("does not mislabel absent methods as calculated and preserves Kabbalah separately", () => {
   const empty: any = {westernEvidence:[],genesisAstroEvidence:[],patternEvidence:[],behavioralEvidence:[],lifeEventEvidence:[],canonEvidence:[item],vedicEvidence:[],arabicEvidence:[],lunarEvidence:[],fixedStarEvidence:[],timingEvidence:[],incomplete:["Varga not configured"]};
   const coverage=methodCoverage(empty as AstrologyEvidencePacket);
   expect(coverage.find(x=>x.id==="kabbalah")?.count).toBe(1);
   expect(coverage.find(x=>x.id==="canon")?.count).toBe(0);
   expect(coverage.find(x=>x.id==="vedic")?.status).toBe("no-result-supplied");
   expect(formatUniversalMethodCoverage(empty as AstrologyEvidencePacket)).toContain("Varga not configured");
 });
});