import { describe, expect, it } from "vitest";

import { centsToAmountInput, formatCents, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["1250", 125000],
    ["1250.5", 125050],
    ["1250.05", 125005],
    [" 1,250.00 ", 125000],
    ["0.99", 99],
  ])("parses %s", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12.345", "1e3", "12345678"])("rejects %s", (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it("avoids floating point drift", () => {
    expect(parseAmountToCents("19.99")).toBe(1999);
    expect(parseAmountToCents("0.29")).toBe(29);
  });
});

describe("centsToAmountInput", () => {
  it("round-trips with parseAmountToCents", () => {
    expect(parseAmountToCents(centsToAmountInput(125005))).toBe(125005);
  });
});

describe("formatCents", () => {
  it("formats USD and GBP", () => {
    expect(formatCents(125050, "USD")).toBe("$1,250.50");
    expect(formatCents(95000, "GBP")).toBe("£950.00");
  });
});
