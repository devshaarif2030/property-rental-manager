import { describe, expect, it } from "vitest";

import { magicLinkSchema, passwordSignInSchema } from "./schemas";

describe("passwordSignInSchema", () => {
  it("normalizes the email", () => {
    const parsed = passwordSignInSchema.parse({ email: "  Tenant@Demo.Test ", password: "12345678" });
    expect(parsed.email).toBe("tenant@demo.test");
  });

  it("rejects a bad email and a short password", () => {
    const result = passwordSignInSchema.safeParse({ email: "not-an-email", password: "short" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["email", "password"]);
  });

  it("rejects passwords longer than bcrypt accepts", () => {
    const result = passwordSignInSchema.safeParse({ email: "a@b.co", password: "x".repeat(73) });
    expect(result.success).toBe(false);
  });
});

describe("magicLinkSchema", () => {
  it("requires an email", () => {
    expect(magicLinkSchema.safeParse({ email: "" }).success).toBe(false);
    expect(magicLinkSchema.safeParse({ email: "staff@demo.test" }).success).toBe(true);
  });
});
