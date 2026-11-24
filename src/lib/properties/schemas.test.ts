import { describe, expect, it } from "vitest";

import { propertySchema, unitSchema } from "./schemas";

describe("propertySchema", () => {
  it("trims and accepts a UK address", () => {
    const parsed = propertySchema.parse({
      name: " Elm House ",
      addressLine: "1 Elm Street",
      city: "Leeds",
      postcode: "LS1 1AA",
      country: "GB",
    });
    expect(parsed.name).toBe("Elm House");
  });

  it("rejects blank fields and unsupported countries", () => {
    const result = propertySchema.safeParse({
      name: "  ",
      addressLine: "",
      city: "Paris",
      postcode: "75001",
      country: "FR",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "addressLine",
      "country",
      "name",
    ]);
  });
});

describe("unitSchema", () => {
  it("converts form strings to numbers and rent to cents", () => {
    expect(unitSchema.parse({ label: "Flat 1", bedrooms: "2", bathrooms: "1", rent: "1250.50" })).toEqual({
      label: "Flat 1",
      bedrooms: 2,
      bathrooms: 1,
      rent: 125050,
    });
  });

  it.each(["0", "abc", "-100", ""])("rejects rent %j", (rent) => {
    expect(unitSchema.safeParse({ label: "Flat 1", bedrooms: "1", bathrooms: "1", rent }).success).toBe(
      false,
    );
  });

  it("rejects fractional and out of range room counts", () => {
    expect(unitSchema.safeParse({ label: "A", bedrooms: "1.5", bathrooms: "1", rent: "900" }).success).toBe(
      false,
    );
    expect(unitSchema.safeParse({ label: "A", bedrooms: "21", bathrooms: "1", rent: "900" }).success).toBe(
      false,
    );
  });
});
