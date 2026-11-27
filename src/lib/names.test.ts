import { describe, expect, it } from "vitest";

import { firstName, initials } from "./names";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("morgan lee manager")).toBe("ML");
  });

  it("handles one word and extra spaces", () => {
    expect(initials("  Sam  ")).toBe("S");
  });
});

describe("firstName", () => {
  it("returns the first word", () => {
    expect(firstName(" Taylor Tenant")).toBe("Taylor");
  });
});
