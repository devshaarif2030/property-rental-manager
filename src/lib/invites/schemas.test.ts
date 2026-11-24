import { describe, expect, it } from "vitest";

import { acceptInviteSchema, createInviteSchema, rolesInvitableBy } from "./schemas";

describe("rolesInvitableBy", () => {
  it("lets admins invite every role", () => {
    expect(rolesInvitableBy("admin")).toEqual(["admin", "manager", "tenant", "staff"]);
  });

  it("limits managers to tenants and staff", () => {
    expect(rolesInvitableBy("manager")).toEqual(["tenant", "staff"]);
  });

  it("gives tenants and staff nothing", () => {
    expect(rolesInvitableBy("tenant")).toEqual([]);
    expect(rolesInvitableBy("staff")).toEqual([]);
  });
});

describe("createInviteSchema", () => {
  it("normalizes the email", () => {
    expect(createInviteSchema.parse({ email: " New@Tenant.Test ", role: "tenant" }).email).toBe(
      "new@tenant.test",
    );
  });

  it("rejects unknown roles", () => {
    expect(createInviteSchema.safeParse({ email: "a@b.co", role: "owner" }).success).toBe(false);
  });
});

describe("acceptInviteSchema", () => {
  it("rejects malformed tokens", () => {
    const result = acceptInviteSchema.safeParse({
      token: "../../etc",
      fullName: "Ana",
      password: "long-enough",
    });
    expect(result.success).toBe(false);
  });
});
