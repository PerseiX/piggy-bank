import type { CurrencyDualFormat } from "../types";

const DECIMAL_PLACES = 2;

function assertIsFiniteNumber(value: number, context: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${context} must be a finite number`);
  }
}

export function formatGroszeToPlnString(grosze: number): string {
  assertIsFiniteNumber(grosze, "grosze");

  const value = grosze / 100;

  return value.toFixed(DECIMAL_PLACES);
}

export function toCurrencyDualFormat(grosze: number): CurrencyDualFormat {
  assertIsFiniteNumber(grosze, "grosze");

  return {
    grosze,
    pln: formatGroszeToPlnString(grosze),
  };
}
