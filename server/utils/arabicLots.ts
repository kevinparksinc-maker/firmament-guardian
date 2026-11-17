import { normalizeLongitude } from "../../shared/hybrid";
import { ArabicSnapshotSchema, type ArabicSnapshot } from "../patterns/types";

export type Sect = "day" | "night";
export type LotFormula = { name: string; add: string; subtract: string };

export type LotInputs = {
  ascendant: number;
  sun: number;
  moon: number;
  venus?: number;
  mercury?: number;
  mars?: number;
  jupiter?: number;
  sect: Sect;
};

export const LOT_FORMULAS: Record<string, LotFormula> = {
  fortune: { name: "Lot of Fortune", add: "moon", subtract: "sun" },
  spirit: { name: "Lot of Spirit", add: "sun", subtract: "moon" },
  eros: { name: "Lot of Eros", add: "venus", subtract: "spirit" },
  necessity: { name: "Lot of Necessity", add: "fortune", subtract: "mercury" },
};

function requireValue(inputs: Record<string, number | undefined>, key: string) {
  const value = inputs[key];
  if (value == null || !Number.isFinite(value))
    throw new Error(`Arabic Lot calculation requires ${key}.`);
  return normalizeLongitude(value);
}

/**
 * Calculates a traditional Lot from Ascendant + addend - subtractend.
 * Fortune and Spirit swap their luminary order by sect; callers may pass an
 * explicit formula for other Lots so the convention remains visible and testable.
 */
export function calculateLot(inputs: LotInputs, formula: LotFormula): number {
  const values: Record<string, number | undefined> = {
    ascendant: inputs.ascendant,
    sun: inputs.sun,
    moon: inputs.moon,
    venus: inputs.venus,
    mercury: inputs.mercury,
    mars: inputs.mars,
    jupiter: inputs.jupiter,
  };
  if (formula.add === "spirit")
    values.spirit = calculateSectLot(inputs, LOT_FORMULAS.spirit);
  if (formula.add === "fortune")
    values.fortune = calculateSectLot(inputs, LOT_FORMULAS.fortune);
  if (formula.subtract === "spirit")
    values.spirit = values.spirit ?? calculateSectLot(inputs, LOT_FORMULAS.spirit);
  if (formula.subtract === "fortune")
    values.fortune =
      values.fortune ?? calculateSectLot(inputs, LOT_FORMULAS.fortune);
  return normalizeLongitude(
    requireValue(values, "ascendant") +
      requireValue(values, formula.add) -
      requireValue(values, formula.subtract)
  );
}

function calculateSectLot(inputs: LotInputs, formula: LotFormula): number {
  const { add, subtract } = formula;
  return calculateLot(inputs, inputs.sect === "day" ? formula : { ...formula, add: subtract, subtract: add });
}

export function calculateArabicLots(inputs: LotInputs): Record<string, number> {
  const results: Record<string, number> = {
    fortune: calculateSectLot(inputs, LOT_FORMULAS.fortune),
    spirit: calculateSectLot(inputs, LOT_FORMULAS.spirit),
  };
  if (Number.isFinite(inputs.venus))
    results.eros = calculateSectLot(inputs, LOT_FORMULAS.eros);
  if (Number.isFinite(inputs.mercury))
    results.necessity = calculateSectLot(inputs, LOT_FORMULAS.necessity);
  return Object.fromEntries(
    Object.entries(results).map(([name, longitude]) => [
      name,
      Number(longitude.toFixed(6)),
    ])
  );
}

export interface ArabicProvider {
  readonly name: string;
  getAnalysis(input: LotInputs): Promise<ArabicSnapshot>;
}

export class MockArabicProvider implements ArabicProvider {
  readonly name = "mock-canopy";
  async getAnalysis(input: LotInputs): Promise<ArabicSnapshot> {
    return ArabicSnapshotSchema.parse({
      provider: this.name,
      lots: calculateArabicLots(input),
      signals: [],
    });
  }
}
