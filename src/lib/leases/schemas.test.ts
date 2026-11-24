import { describe, expect, it } from "vitest";

import { createLeaseSchema, updateLeaseSchema } from "./schemas";

const valid = {
  tenantId: "10000000-0000-0000-0000-0000000000a3",
  startDate: "2026-12-01",
  endDate: "",
  rent: "1250",
  deposit: "0",
  dueDay: "1",
};

describe("createLeaseSchema", () => {
  it("parses a rolling lease with no deposit", () => {
    expect(createLeaseSchema.parse(valid)).toEqual({
      tenantId: valid.tenantId,
      startDate: "2026-12-01",
      endDate: null,
      rent: 125000,
      deposit: 0,
      dueDay: 1,
    });
  });

  it("requires the end date to be after the start date", () => {
    const result = createLeaseSchema.safeParse({ ...valid, endDate: "2026-11-30" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["endDate"]);
  });

  it.each(["0", "29", "1.5"])("rejects due day %s", (dueDay) => {
    expect(createLeaseSchema.safeParse({ ...valid, dueDay }).success).toBe(false);
  });

  it("rejects zero rent and impossible dates", () => {
    expect(createLeaseSchema.safeParse({ ...valid, rent: "0" }).success).toBe(false);
    expect(createLeaseSchema.safeParse({ ...valid, startDate: "2026-02-30" }).success).toBe(false);
  });

  it("requires a tenant", () => {
    expect(createLeaseSchema.safeParse({ ...valid, tenantId: "" }).success).toBe(false);
  });
});

describe("updateLeaseSchema", () => {
  it("does not accept a new tenant or start date", () => {
    const parsed = updateLeaseSchema.parse({
      ...valid,
      endDate: "2027-11-30",
      rent: "1300",
      deposit: "1300",
      dueDay: "5",
    });
    expect(parsed).toEqual({ endDate: "2027-11-30", rent: 130000, deposit: 130000, dueDay: 5 });
  });
});
