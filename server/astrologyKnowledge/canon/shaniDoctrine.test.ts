import { describe, expect, it } from "vitest";
import type { ChartResult } from "../../astronomy";
import { evaluateShaniDoctrine } from "./shaniDoctrine";

function fixture(asc:number,moon:number,saturn:number):ChartResult {
  return {utc:"2026-10-24T12:00:00.000Z",readingScope:"combined",agentViewAvailable:true,
    ascendant:{longitude:asc},movingBodies:[{name:"Moon",longitude:moon}],transits:[{name:"Saturn",longitude:saturn}] } as ChartResult;
}
describe("Shani doctrine from chart data",()=>{
  it("identifies Taurus and Libra yogakaraka lordships in explicit hybrid mode",()=>{
    expect(evaluateShaniDoctrine(fixture(40,10,10),"firmament-tropical-hybrid").lordship).toEqual([9,10]);
    expect(evaluateShaniDoctrine(fixture(40,10,10),"firmament-tropical-hybrid").yogakaraka).toBe(true);
    expect(evaluateShaniDoctrine(fixture(190,10,10),"firmament-tropical-hybrid").lordship).toEqual([4,5]);
    expect(evaluateShaniDoctrine(fixture(190,10,10),"firmament-tropical-hybrid").yogakaraka).toBe(true);
  });
  it("distinguishes Sade Sati phases and Dhaiya from natal Moon",()=>{
    expect(evaluateShaniDoctrine(fixture(40,40,10),"firmament-tropical-hybrid").sadeSati).toBe("rising");
    expect(evaluateShaniDoctrine(fixture(40,40,40),"firmament-tropical-hybrid").sadeSati).toBe("middle");
    expect(evaluateShaniDoctrine(fixture(40,40,70),"firmament-tropical-hybrid").sadeSati).toBe("setting");
    expect(evaluateShaniDoctrine(fixture(40,40,130),"firmament-tropical-hybrid").dhaiya).toBe("fourth-from-moon");
    expect(evaluateShaniDoctrine(fixture(40,40,250),"firmament-tropical-hybrid").dhaiya).toBe("eighth-from-moon");
  });
  it("does not invent results for natal-only charts",()=>{
    const natal=fixture(40,40,40);natal.readingScope="natal";
    expect(evaluateShaniDoctrine(natal,"firmament-tropical-hybrid").sadeSati).toBe("unavailable");
  });
});
