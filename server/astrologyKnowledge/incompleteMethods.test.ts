import {describe,it,expect} from "vitest";
import {vargaPlacement} from "./vedic/vargas";
import {twelfthPart,solarEvents,planetaryHour} from "./arabic/subdivisions";
import {ASTROLOGY_RULES} from "./registry";

describe("formerly incomplete traditional methods",()=>{
 it("projects D2 Hora odd/even halves correctly",()=>{
  expect(vargaPlacement(14.9,"D2").sign).toBe("Leo");
  expect(vargaPlacement(15,"D2").sign).toBe("Cancer");
  expect(vargaPlacement(30,"D2").sign).toBe("Cancer");
  expect(vargaPlacement(45,"D2").sign).toBe("Leo");
 });
 it("derives D3 D9 D10 with explicit source sign preservation",()=>{
  expect(vargaPlacement(0,"D3").sign).toBe("Aries");
  expect(vargaPlacement(10,"D3").sign).toBe("Leo");
  expect(vargaPlacement(20,"D3").sign).toBe("Sagittarius");
  expect(vargaPlacement(0,"D9").sign).toBe("Aries");
  expect(vargaPlacement(30,"D9").sign).toBe("Capricorn");
  expect(vargaPlacement(0,"D10").sign).toBe("Aries");
  expect(vargaPlacement(30,"D10").sign).toBe("Capricorn");
 });
 it("computes twelfth-parts with source sign start and 2.5 degree divisions",()=>{
  expect(twelfthPart(33).derivedSign).toBe("Gemini");
  expect(twelfthPart(33).degree).toBeCloseTo(6,7);
  expect(twelfthPart(287).derivedSign).toBe("Cancer");
  expect(twelfthPart(287).degree).toBeCloseTo(24,7);
 });
 it("finds finite approximate sun events and Chaldean ruler in a normal latitude",()=>{
  const d=new Date("2026-10-22T17:00:00.000Z");
  const e=solarEvents(d,36.17,-115.14);
  expect(e).not.toBeNull();
  expect(e!.sunrise.getTime()).toBeLessThan(e!.sunset.getTime());
  const h=planetaryHour(d,36.17,-115.14);
  expect(h).not.toBeNull();
  expect(h!.ruler).toMatch(/Saturn|Jupiter|Mars|Sun|Venus|Mercury|Moon/);
 });
 it("makes registry implementation status match actual pathways",()=>{
  for(const id of ["vedic-varga-architecture","arabic-planetary-hours","arabic-twelfth-parts"]){
   expect(ASTROLOGY_RULES.find(x=>x.id===id)?.status).toBe("implemented");
  }
 });
});
