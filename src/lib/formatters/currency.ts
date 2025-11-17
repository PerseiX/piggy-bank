import type { CurrencyDualFormat } from "../../types"
import { formatGroszeToPlnString } from "../currency"

const PLN_DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/

const MAX_SAFE_GROSZE = BigInt(Number.MAX_SAFE_INTEGER)

export function parsePlnToGrosze(value: string): number {
  if (typeof value !== "string") {
    throw new TypeError("PLN amount must be provided as a string")
  }

  const normalized = value.trim()

  if (!PLN_DECIMAL_PATTERN.test(normalized)) {
    throw new RangeError(
      "PLN amount must be a non-negative value with up to two decimal places",
    )
  }

  const [unitsPart, fractionPart = ""] = normalized.split(".")
  const units = BigInt(unitsPart)
  const cents = BigInt(`${fractionPart}00`.slice(0, 2))
  const total = units * 100n + cents

  if (total > MAX_SAFE_GROSZE) {
    throw new RangeError("PLN amount exceeds supported range")
  }

  return Number(total)
}

export function formatGroszeToPln(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("Grosze value must be a finite number")
  }

  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Grosze value must be a safe integer")
  }

  if (value < 0) {
    throw new RangeError("Grosze value cannot be negative")
  }

  return formatGroszeToPlnString(value)
}

export function formatOptionalGroszeToPln(
  value: number | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return formatGroszeToPln(value)
}

export const plnDecimalPattern = PLN_DECIMAL_PATTERN

export function formatGroszeToDual(value: number): CurrencyDualFormat {
  return {
    grosze: value,
    pln: formatGroszeToPln(value),
  }
}

export function formatOptionalGroszeToDual(
  value: number | null | undefined,
): CurrencyDualFormat | null {
  if (value === null || value === undefined) {
    return null
  }

  return formatGroszeToDual(value)
}

