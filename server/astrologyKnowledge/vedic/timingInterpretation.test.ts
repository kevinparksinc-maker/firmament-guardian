import {describe,it,expect} from "vitest";
import {interpretDashaLord,interpretBindus,DASHA_THEMES} from "./timingAndAshtakavarga";
describe("Dasha and Ashtakavarga human translation",()=>{
 it("explains all nine dasha lords in ordinary life",()=>{
  expect(Object.keys(DASHA_THEMES)).toHaveLength(9);
  for(const lord of Object.keys(DASHA_THEMES)){
   const result=interpretDashaLord(lord);
   expect(result).toContain(lord);
   expect(result).toContain("Potential friction");
   expect(result).toContain("Reflection");
  }
 });
 it("explains both planetary and total bindu meaning",()=>{
  expect(interpretBindus(5,"BAV","Taurus")).toContain("one planet");
  expect(interpretBindus(3,"BAV","Cancer")).toContain("moderate");
  expect(interpretBindus(32,"SAV","Gemini")).toContain("comparatively supported");
  expect(interpretBindus(19,"SAV","Virgo")).toContain("more effort");
 });
});