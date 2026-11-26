import { describe, expect, it } from "vitest";

import { safeNotificationLink } from "./queries";

describe("safeNotificationLink", () => {
  it("keeps same-site paths", () => {
    expect(safeNotificationLink("/tenant/requests/abc")).toBe("/tenant/requests/abc");
  });

  it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "tenant"])(
    "drops %s",
    (link) => {
      expect(safeNotificationLink(link)).toBeNull();
    },
  );
});
