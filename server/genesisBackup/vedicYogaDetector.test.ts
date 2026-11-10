import { describe, expect, it } from "vitest";
import { detectAllYogas } from "./vedicYogaDetector";
describe("Genesis Yoga detector",()=>{
 it("recognizes all five Mahapurusha configurations",()=>{
  const placements=[
   {name:"Mars",sign:"Capricorn",house:1,degree:3},
   {name:"Mercury",sign:"Gemini",house:4,degree:4},
   {name:"Jupiter",sign:"Cancer",house:7,degree:5},
   {name:"Venus",sign:"Pisces",house:10,degree:6},
   {name:"Saturn",sign:"Libra",house:1,degree:7},
  ];
  const yogas=detectAllYogas(placements);
  expect(yogas.map(y=>y.name)).toEqual(expect.arrayContaining(["Ruchaka Yoga","Bhadra Yoga","Hamsa Yoga","Malavya Yoga","Shasha Yoga"]));
 });
 it("does not assert Mahapurusha yoga for a non-angular body",()=>{
  expect(detectAllYogas([{name:"Jupiter",sign:"Pisces",house:6,degree:8}]).some(y=>y.name==="Hamsa Yoga")).toBe(false);
 });
 it("recognizes Moon-Jupiter sign kendra and Sun-Mercury same-sign cases with qualified labels",()=>{
  const r=detectAllYogas([
   {name:"Moon",sign:"Aries",house:1,degree:1},
   {name:"Jupiter",sign:"Cancer",house:4,degree:2},
   {name:"Sun",sign:"Virgo",house:6,degree:13},
   {name:"Mercury",sign:"Virgo",house:6,degree:20},
  ]);
  expect(r.some(y=>y.name.startsWith("Gaja Kesari"))).toBe(true);
  expect(r.some(y=>y.name.startsWith("Budha-Aditya"))).toBe(true);
 });
});