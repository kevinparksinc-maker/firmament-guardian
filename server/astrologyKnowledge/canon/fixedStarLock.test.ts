import { describe, expect, it } from "vitest";
import { FIXED_STARS } from "../../../shared/hybrid";
import { FIXED_STAR_HISTORICAL_RESEARCH_QUEUE } from "./historicalStarCatalog";
import { FIXED_STAR_CANON_RECORDS } from "./fixedStarsAndLots";
describe("permanent fixed-star reference",()=>{
 it("locks every active star to one constant longitude",()=>{
  expect(FIXED_STARS.length).toBe(10);
  for(const [name,degree] of FIXED_STARS){
   const record=FIXED_STAR_CANON_RECORDS.find(x=>x.name===name);
   expect(record?.firmamentLockedLongitude).toBe(degree);
  }
 });
 it("does not assign moving positions to the historical research names",()=>{
  expect(FIXED_STAR_HISTORICAL_RESEARCH_QUEUE.length).toBe(30);
  expect(FIXED_STAR_HISTORICAL_RESEARCH_QUEUE).toContain("Bellatrix");
 });
});