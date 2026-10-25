import { describe, expect, it } from "vitest";
import { IMPORTED_CELESTIAL_DOCTRINES, findImportedCelestialDoctrine } from "./importedCelestialDoctrineIndex";
describe("62-record civilization doctrine research index",()=>{
  it("indexes all 62 source record IDs without duplicates",()=>{
    expect(IMPORTED_CELESTIAL_DOCTRINES).toHaveLength(62);
    expect(new Set(IMPORTED_CELESTIAL_DOCTRINES.map(x=>x.id)).size).toBe(62);
    expect(new Set(IMPORTED_CELESTIAL_DOCTRINES.map(x=>x.tradition)).size).toBe(9);
  });
  it("keeps all imported research non-executable until rule verification",()=>{
    expect(IMPORTED_CELESTIAL_DOCTRINES.every(x=>x.executable===false && x.verification==="requires-source-audit")).toBe(true);
    expect(findImportedCelestialDoctrine("jy.shadbala")?.tradition).toBe("jyotish");
    expect(findImportedCelestialDoctrine("my.venus-table")?.tradition).toBe("maya");
  });
});
