import { describe, expect, it } from "vitest";

import { activeNavHref, navItemsForRole } from "./navigation";

describe("activeNavHref", () => {
  const items = navItemsForRole("manager");

  it("marks the dashboard on its own path", () => {
    expect(activeNavHref(items, "/manager")).toBe("/manager");
  });

  it("marks the section, not the dashboard, on nested paths", () => {
    expect(activeNavHref(items, "/manager/properties/abc/units/def")).toBe("/manager/properties");
  });

  it("does not match a path that only shares a prefix", () => {
    expect(activeNavHref(items, "/managers")).toBeNull();
  });

  it("marks the tenant's report page, not home", () => {
    expect(activeNavHref(navItemsForRole("tenant"), "/tenant/requests/new")).toBe("/tenant/requests/new");
  });
});

describe("navItemsForRole", () => {
  it("gives every role a notifications link", () => {
    for (const role of ["admin", "manager", "tenant", "staff"] as const) {
      expect(navItemsForRole(role).some((item) => item.href === "/notifications")).toBe(true);
    }
  });
});
