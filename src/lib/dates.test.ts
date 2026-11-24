import { describe, expect, it } from "vitest";

import { formatIsoDate } from "./dates";

describe("formatIsoDate", () => {
  it("formats a calendar day without shifting it by time zone", () => {
    expect(formatIsoDate("2026-12-01")).toBe("1 Dec 2026");
    expect(formatIsoDate("2027-01-31")).toBe("31 Jan 2027");
  });
});
