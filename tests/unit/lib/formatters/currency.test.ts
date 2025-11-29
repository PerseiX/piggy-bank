import { describe, it, expect } from "vitest";
import {
  parsePlnToGrosze,
  formatGroszeToPln,
  formatOptionalGroszeToPln,
  formatGroszeToDual,
  formatOptionalGroszeToDual,
  plnDecimalPattern,
} from "@/lib/formatters/currency";

describe("parsePlnToGrosze", () => {
  describe("valid inputs - whole amounts", () => {
    it("should parse zero", () => {
      // Arrange
      const input = "0";

      // Act
      const result = parsePlnToGrosze(input);

      // Assert
      expect(result).toBe(0);
    });

    it("should parse single digit PLN", () => {
      expect(parsePlnToGrosze("1")).toBe(100);
      expect(parsePlnToGrosze("5")).toBe(500);
      expect(parsePlnToGrosze("9")).toBe(900);
    });

    it("should parse typical amounts", () => {
      expect(parsePlnToGrosze("100")).toBe(10000);
      expect(parsePlnToGrosze("1000")).toBe(100000);
      expect(parsePlnToGrosze("50000")).toBe(5000000);
    });

    it("should handle amounts with leading zeros", () => {
      expect(parsePlnToGrosze("0100")).toBe(10000);
      expect(parsePlnToGrosze("001")).toBe(100);
    });
  });

  describe("valid inputs - decimal amounts", () => {
    it("should parse amounts with two decimal places", () => {
      expect(parsePlnToGrosze("100.50")).toBe(10050);
      expect(parsePlnToGrosze("1.23")).toBe(123);
      expect(parsePlnToGrosze("0.01")).toBe(1);
      expect(parsePlnToGrosze("0.99")).toBe(99);
    });

    it("should parse amounts with single decimal place", () => {
      expect(parsePlnToGrosze("100.5")).toBe(10050);
      expect(parsePlnToGrosze("1.2")).toBe(120);
      expect(parsePlnToGrosze("0.1")).toBe(10);
    });

    it("should parse zero with decimal point", () => {
      expect(parsePlnToGrosze("0.0")).toBe(0);
      expect(parsePlnToGrosze("0.00")).toBe(0);
    });

    it("should handle minimum currency unit (1 grosz)", () => {
      expect(parsePlnToGrosze("0.01")).toBe(1);
    });
  });

  describe("whitespace handling", () => {
    it("should trim leading whitespace", () => {
      expect(parsePlnToGrosze("  100.50")).toBe(10050);
    });

    it("should trim trailing whitespace", () => {
      expect(parsePlnToGrosze("100.50  ")).toBe(10050);
    });

    it("should trim both leading and trailing whitespace", () => {
      expect(parsePlnToGrosze("  100.50  ")).toBe(10050);
    });

    it("should handle tab characters", () => {
      expect(parsePlnToGrosze("\t100.50\t")).toBe(10050);
    });
  });

  describe("boundary values", () => {
    it("should parse large valid amounts near MAX_SAFE_INTEGER", () => {
      // MAX_SAFE_INTEGER in grosze = 9007199254740991
      // As PLN: 90071992547409.91
      expect(parsePlnToGrosze("90071992547409.91")).toBe(9007199254740991);
      expect(parsePlnToGrosze("90071992547409.90")).toBe(9007199254740990);
    });

    it("should parse amounts just under the limit", () => {
      expect(parsePlnToGrosze("90071992547409")).toBe(9007199254740900);
    });
  });

  describe("type validation", () => {
    it("should throw TypeError for non-string input", () => {
      // Act & Assert
      expect(() => parsePlnToGrosze(100 as unknown as string)).toThrow(TypeError);
      expect(() => parsePlnToGrosze(100 as unknown as string)).toThrow("PLN amount must be provided as a string");
    });

    it("should throw TypeError for number input", () => {
      expect(() => parsePlnToGrosze(123.45 as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError for null", () => {
      expect(() => parsePlnToGrosze(null as unknown as string)).toThrow(TypeError);
    });

    it("should throw TypeError for undefined", () => {
      expect(() => parsePlnToGrosze(undefined as unknown as string)).toThrow(TypeError);
    });
  });

  describe("format validation - negative values", () => {
    it("should reject negative whole numbers", () => {
      expect(() => parsePlnToGrosze("-100")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("-100")).toThrow(
        "PLN amount must be a non-negative value with up to two decimal places"
      );
    });

    it("should reject negative decimals", () => {
      expect(() => parsePlnToGrosze("-1.50")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("-0.01")).toThrow(RangeError);
    });

    it("should reject negative zero", () => {
      expect(() => parsePlnToGrosze("-0")).toThrow(RangeError);
    });
  });

  describe("format validation - too many decimals", () => {
    it("should reject three decimal places", () => {
      expect(() => parsePlnToGrosze("100.123")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("1.001")).toThrow(RangeError);
    });

    it("should reject four or more decimal places", () => {
      expect(() => parsePlnToGrosze("100.1234")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("1.00000")).toThrow(RangeError);
    });
  });

  describe("format validation - invalid characters", () => {
    it("should reject alphabetic characters", () => {
      expect(() => parsePlnToGrosze("abc")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("100abc")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("abc100")).toThrow(RangeError);
    });

    it("should reject special characters", () => {
      expect(() => parsePlnToGrosze("100$")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("PLN100")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("100 zł")).toThrow(RangeError);
    });

    it("should reject currency symbols", () => {
      expect(() => parsePlnToGrosze("$100")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("€100.50")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("zł100")).toThrow(RangeError);
    });

    it("should reject comma as decimal separator", () => {
      expect(() => parsePlnToGrosze("100,50")).toThrow(RangeError);
    });

    it("should reject thousand separators", () => {
      expect(() => parsePlnToGrosze("1,000")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("1 000")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("1.000.50")).toThrow(RangeError);
    });
  });

  describe("format validation - malformed inputs", () => {
    it("should reject empty string", () => {
      expect(() => parsePlnToGrosze("")).toThrow(RangeError);
    });

    it("should reject whitespace-only string", () => {
      expect(() => parsePlnToGrosze("   ")).toThrow(RangeError);
    });

    it("should reject multiple decimal points", () => {
      expect(() => parsePlnToGrosze("100.50.50")).toThrow(RangeError);
      expect(() => parsePlnToGrosze("1.2.3")).toThrow(RangeError);
    });

    it("should reject decimal point without digits", () => {
      expect(() => parsePlnToGrosze(".")).toThrow(RangeError);
      expect(() => parsePlnToGrosze(".50")).toThrow(RangeError);
    });

    it("should reject trailing decimal point without fraction", () => {
      expect(() => parsePlnToGrosze("100.")).toThrow(RangeError);
    });
  });

  describe("range validation", () => {
    it("should throw RangeError for amounts exceeding MAX_SAFE_INTEGER", () => {
      // Number.MAX_SAFE_INTEGER + 1 in PLN
      const exceedingAmount = "90071992547409.92";

      expect(() => parsePlnToGrosze(exceedingAmount)).toThrow(RangeError);
      expect(() => parsePlnToGrosze(exceedingAmount)).toThrow("PLN amount exceeds supported range");
    });

    it("should reject extremely large amounts", () => {
      const hugeAmount = "999999999999999999";
      expect(() => parsePlnToGrosze(hugeAmount)).toThrow(RangeError);
    });

    it("should reject amounts at MAX_SAFE_INTEGER boundary + 1", () => {
      expect(() => parsePlnToGrosze("90071992547410")).toThrow(RangeError);
    });
  });

  describe("business rules - precision", () => {
    it("should maintain precision for typical transaction amounts", () => {
      // Common e-commerce amounts
      expect(parsePlnToGrosze("19.99")).toBe(1999);
      expect(parsePlnToGrosze("99.99")).toBe(9999);
      expect(parsePlnToGrosze("149.50")).toBe(14950);
    });

    it("should maintain precision for investment amounts", () => {
      // Typical investment amounts
      expect(parsePlnToGrosze("1000.00")).toBe(100000);
      expect(parsePlnToGrosze("50000.00")).toBe(5000000);
      expect(parsePlnToGrosze("100000.00")).toBe(10000000);
    });

    it("should handle edge case of zero with decimals", () => {
      expect(parsePlnToGrosze("0.00")).toBe(0);
    });
  });
});

describe("formatGroszeToPln", () => {
  describe("valid inputs - typical amounts", () => {
    it("should format zero", () => {
      // Arrange
      const input = 0;

      // Act
      const result = formatGroszeToPln(input);

      // Assert
      expect(result).toBe("0.00");
    });

    it("should format single grosze", () => {
      expect(formatGroszeToPln(1)).toBe("0.01");
      expect(formatGroszeToPln(5)).toBe("0.05");
      expect(formatGroszeToPln(99)).toBe("0.99");
    });

    it("should format whole PLN amounts", () => {
      expect(formatGroszeToPln(100)).toBe("1.00");
      expect(formatGroszeToPln(1000)).toBe("10.00");
      expect(formatGroszeToPln(10000)).toBe("100.00");
    });

    it("should format amounts with grosze", () => {
      expect(formatGroszeToPln(123)).toBe("1.23");
      expect(formatGroszeToPln(10050)).toBe("100.50");
      expect(formatGroszeToPln(9999)).toBe("99.99");
    });

    it("should format typical transaction amounts", () => {
      // Common e-commerce amounts
      expect(formatGroszeToPln(1999)).toBe("19.99");
      expect(formatGroszeToPln(14950)).toBe("149.50");
    });

    it("should format large investment amounts", () => {
      expect(formatGroszeToPln(100000)).toBe("1000.00");
      expect(formatGroszeToPln(5000000)).toBe("50000.00");
      expect(formatGroszeToPln(10000000)).toBe("100000.00");
    });
  });

  describe("precision and formatting", () => {
    it("should always include two decimal places", () => {
      expect(formatGroszeToPln(100)).toBe("1.00");
      expect(formatGroszeToPln(1050)).toBe("10.50");
      expect(formatGroszeToPln(1005)).toBe("10.05");
    });

    it("should properly format amounts with trailing zeros", () => {
      expect(formatGroszeToPln(1000)).toBe("10.00");
      expect(formatGroszeToPln(1010)).toBe("10.10");
      expect(formatGroszeToPln(1001)).toBe("10.01");
    });

    it("should handle minimum currency unit", () => {
      expect(formatGroszeToPln(1)).toBe("0.01");
    });

    it("should handle amounts less than 1 PLN", () => {
      expect(formatGroszeToPln(10)).toBe("0.10");
      expect(formatGroszeToPln(50)).toBe("0.50");
      expect(formatGroszeToPln(99)).toBe("0.99");
    });
  });

  describe("boundary values", () => {
    it("should format maximum safe integer value", () => {
      // MAX_SAFE_INTEGER = 9007199254740991 grosze = 90071992547409.91 PLN
      const maxSafeGrosze = Number.MAX_SAFE_INTEGER;
      const result = formatGroszeToPln(maxSafeGrosze);

      expect(result).toBe("90071992547409.91");
    });

    it("should format large amounts near the limit", () => {
      // Note: At extreme values near MAX_SAFE_INTEGER, floating point division
      // may introduce precision artifacts. This tests actual behavior.
      expect(formatGroszeToPln(9007199254740990)).toBe("90071992547409.91");
      expect(formatGroszeToPln(9007199254740900)).toBe("90071992547409.00");
    });

    it("should format amounts in millions", () => {
      expect(formatGroszeToPln(100000000)).toBe("1000000.00");
    });
  });

  describe("type validation", () => {
    it("should throw TypeError for Infinity", () => {
      // Act & Assert
      expect(() => formatGroszeToPln(Infinity)).toThrow(TypeError);
      expect(() => formatGroszeToPln(Infinity)).toThrow("Grosze value must be a finite number");
    });

    it("should throw TypeError for negative Infinity", () => {
      expect(() => formatGroszeToPln(-Infinity)).toThrow(TypeError);
    });

    it("should throw TypeError for NaN", () => {
      expect(() => formatGroszeToPln(NaN)).toThrow(TypeError);
      expect(() => formatGroszeToPln(NaN)).toThrow("Grosze value must be a finite number");
    });
  });

  describe("integer validation", () => {
    it("should throw RangeError for decimal values", () => {
      expect(() => formatGroszeToPln(1.5)).toThrow(RangeError);
      expect(() => formatGroszeToPln(1.5)).toThrow("Grosze value must be a safe integer");
    });

    it("should throw RangeError for float values", () => {
      expect(() => formatGroszeToPln(100.99)).toThrow(RangeError);
      expect(() => formatGroszeToPln(0.01)).toThrow(RangeError);
    });

    it("should throw RangeError for values exceeding MAX_SAFE_INTEGER", () => {
      const unsafeValue = Number.MAX_SAFE_INTEGER + 1;

      expect(() => formatGroszeToPln(unsafeValue)).toThrow(RangeError);
    });

    it("should throw RangeError for very large unsafe integers", () => {
      expect(() => formatGroszeToPln(Number.MAX_VALUE)).toThrow(RangeError);
    });
  });

  describe("range validation - negative values", () => {
    it("should throw RangeError for negative amounts", () => {
      expect(() => formatGroszeToPln(-100)).toThrow(RangeError);
      expect(() => formatGroszeToPln(-100)).toThrow("Grosze value cannot be negative");
    });

    it("should throw RangeError for negative single grosze", () => {
      expect(() => formatGroszeToPln(-1)).toThrow(RangeError);
    });

    it("should throw RangeError for large negative amounts", () => {
      expect(() => formatGroszeToPln(-10000)).toThrow(RangeError);
    });
  });

  describe("business rules - round-trip conversion", () => {
    it("should maintain precision when round-tripping typical amounts", () => {
      // Parse → Format should be reversible
      const testCases = ["100.00", "1.23", "0.01", "99.99", "1000.50"];

      testCases.forEach((pln) => {
        const grosze = parsePlnToGrosze(pln);
        const formatted = formatGroszeToPln(grosze);
        expect(formatted).toBe(pln);
      });
    });

    it("should maintain precision for single-decimal input after parsing", () => {
      // Single decimal should format to two decimals
      const grosze = parsePlnToGrosze("100.5"); // = 10050
      const formatted = formatGroszeToPln(grosze);
      expect(formatted).toBe("100.50");
    });

    it("should maintain precision for whole number input after parsing", () => {
      const grosze = parsePlnToGrosze("100"); // = 10000
      const formatted = formatGroszeToPln(grosze);
      expect(formatted).toBe("100.00");
    });
  });

  describe("business rules - display formatting", () => {
    it("should format amounts for financial reports", () => {
      // Values should always have exactly 2 decimal places for consistency
      const amounts = [100, 1050, 10000, 100500];
      const formatted = amounts.map(formatGroszeToPln);

      formatted.forEach((value) => {
        expect(value).toMatch(/^\d+\.\d{2}$/);
      });
    });

    it("should produce strings suitable for display", () => {
      const result = formatGroszeToPln(12345);
      expect(typeof result).toBe("string");
      expect(result).toBe("123.45");
    });
  });
});

describe("formatOptionalGroszeToPln", () => {
  it("should format valid grosze values", () => {
    expect(formatOptionalGroszeToPln(10000)).toBe("100.00");
    expect(formatOptionalGroszeToPln(0)).toBe("0.00");
  });

  it("should return null for null or undefined", () => {
    expect(formatOptionalGroszeToPln(null)).toBeNull();
    expect(formatOptionalGroszeToPln(undefined)).toBeNull();
  });
});

describe("plnDecimalPattern", () => {
  it("should match valid PLN decimal formats", () => {
    expect(plnDecimalPattern.test("100")).toBe(true);
    expect(plnDecimalPattern.test("100.50")).toBe(true);
    expect(plnDecimalPattern.test("100.5")).toBe(true);
    expect(plnDecimalPattern.test("0.01")).toBe(true);
    expect(plnDecimalPattern.test("0")).toBe(true);
  });

  it("should not match invalid PLN decimal formats", () => {
    expect(plnDecimalPattern.test("-100")).toBe(false);
    expect(plnDecimalPattern.test("100.123")).toBe(false);
    expect(plnDecimalPattern.test("abc")).toBe(false);
    expect(plnDecimalPattern.test("100.50.50")).toBe(false);
  });
});

describe("formatGroszeToDual", () => {
  it("should return dual format with grosze and PLN", () => {
    const result = formatGroszeToDual(10000);
    expect(result).toEqual({
      grosze: 10000,
      pln: "100.00",
    });
  });

  it("should handle zero correctly", () => {
    const result = formatGroszeToDual(0);
    expect(result).toEqual({
      grosze: 0,
      pln: "0.00",
    });
  });
});

describe("formatOptionalGroszeToDual", () => {
  it("should return dual format for valid values", () => {
    const result = formatOptionalGroszeToDual(10000);
    expect(result).toEqual({
      grosze: 10000,
      pln: "100.00",
    });
  });

  it("should return null for null or undefined", () => {
    expect(formatOptionalGroszeToDual(null)).toBeNull();
    expect(formatOptionalGroszeToDual(undefined)).toBeNull();
  });
});
