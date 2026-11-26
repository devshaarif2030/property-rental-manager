import { describe, expect, it } from "vitest";

import { demoRoleSchema } from "./roles";

describe("demoRoleSchema", () => {
  it.each(["manager", "tenant", "staff"])("accepts %s", (role) => {
    expect(demoRoleSchema.safeParse(role).success).toBe(true);
  });

  it.each(["admin", "", "MANAGER", null])("rejects %s", (role) => {
    expect(demoRoleSchema.safeParse(role).success).toBe(false);
  });
});
