import type { CurrencyDualFormat } from "../../../types";
import { toCurrencyDualFormat } from "../../currency";

export function formatCurrencyFromGrosze(grosze: number): CurrencyDualFormat {
  return toCurrencyDualFormat(grosze);
}

export function formatOptionalCurrencyFromGrosze(value: number | null | undefined): CurrencyDualFormat | null {
  if (value === null || value === undefined) {
    return null;
  }

  return toCurrencyDualFormat(value);
}
