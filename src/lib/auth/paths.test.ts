import { describe, expect, it } from "vitest";

import { homePathForRole, isProtectedPath, safeNextPath, signInPathFor } from "./paths";

describe("homePathForRole", () => {
  it("maps every role to its own area", () => {
    expect(homePathForRole("admin")).toBe("/admin");
    expect(homePathForRole("manager")).toBe("/manager");
    expect(homePathForRole("tenant")).toBe("/tenant");
    expect(homePathForRole("staff")).toBe("/staff");
  });
});

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/admin", "/manager/properties", "/tenant", "/staff/jobs/1", "/leases/1/document", "/notifications"])(
    "protects %s",
    (path) => expect(isProtectedPath(path)).toBe(true),
  );

  it.each(["/", "/sign-in", "/auth/callback", "/managers", "/tenantx", "/leasesx"])(
    "leaves %s public",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/tenant?tab=rent")).toBe("/tenant?tab=rent");
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
  ])("falls back to the dashboard for %s", (next) => {
    expect(safeNextPath(next)).toBe("/dashboard");
  });
});

describe("signInPathFor", () => {
  it("encodes the return path", () => {
    expect(signInPathFor("/manager?x=1&y=2")).toBe("/sign-in?next=%2Fmanager%3Fx%3D1%26y%3D2");
  });
});
