import { describe, expect, it } from "vitest";

import { collectionByMonth, monthsEnding, percent } from "./summary";

describe("monthsEnding", () => {
  it("lists month starts oldest first, across a year boundary", () => {
    expect(monthsEnding(new Date("2027-02-15T12:00:00Z"), 4)).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
  });
});

describe("collectionByMonth", () => {
  it("sums billed and paid rent per month and fills empty months", () => {
    const result = collectionByMonth(
      [
        { periodMonth: "2027-01-01", amountCents: 1000, status: "paid" },
        { periodMonth: "2027-01-01", amountCents: 500, status: "overdue" },
        { periodMonth: "2027-02-01", amountCents: 700, status: "due" },
      ],
      ["2026-12-01", "2027-01-01", "2027-02-01"],
    );
    expect(result).toEqual([
      { month: "2026-12-01", billedCents: 0, collectedCents: 0 },
      { month: "2027-01-01", billedCents: 1500, collectedCents: 1000 },
      { month: "2027-02-01", billedCents: 700, collectedCents: 0 },
    ]);
  });
});

describe("percent", () => {
  it("rounds and avoids dividing by zero", () => {
    expect(percent(2, 3)).toBe(67);
    expect(percent(1, 0)).toBe(0);
  });
});
