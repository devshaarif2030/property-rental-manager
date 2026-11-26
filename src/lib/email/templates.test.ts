import { describe, expect, it } from "vitest";

import { absoluteLink, escapeHtml, notificationEmail } from "./templates";

describe("absoluteLink", () => {
  it("joins the site and an in-app path", () => {
    expect(absoluteLink("https://app.example.com/", "/manager/maintenance/1")).toBe(
      "https://app.example.com/manager/maintenance/1",
    );
  });

  it.each([null, "https://evil.example", "//evil.example"])("falls back to the site root for %s", (path) => {
    expect(absoluteLink("https://app.example.com", path)).toBe("https://app.example.com/");
  });
});

describe("notificationEmail", () => {
  it("escapes tenant text in the HTML and keeps the subject on one line", () => {
    const email = notificationEmail(
      { title: 'Emergency: "<script>alert(1)</script>\nleak"', link: "/manager/maintenance/1" },
      "manager@example.com",
      "https://app.example.com",
    );
    expect(email.to).toBe("manager@example.com");
    expect(email.subject).not.toContain("\n");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain(escapeHtml("<script>"));
    expect(email.html).toContain('href="https://app.example.com/manager/maintenance/1"');
    expect(email.text).toContain("https://app.example.com/manager/maintenance/1");
  });
});
