import { describe, expect, it } from "vitest";

import { demoRoleSchema } from "./roles";

describe("demoRoleSchema", () => {
  it.each(["manager", "tenant"])("accepts %s", (role) => {
    expect(demoRoleSchema.safeParse(role).success).toBe(true);
  });

  it.each(["admin", "staff", "", "MANAGER", null])("rejects %s", (role) => {
    expect(demoRoleSchema.safeParse(role).success).toBe(false);
  });
});
