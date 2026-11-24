import { describe, expect, it } from "vitest";

import { acceptInviteSchema } from "./schemas";
import { generateInviteToken, hashInviteToken, invitePath } from "./tokens";

describe("generateInviteToken", () => {
  it("returns a URL-safe token and its sha256 hash", () => {
    const { token, tokenHash } = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(tokenHash);
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken().token));
    expect(tokens.size).toBe(100);
  });

  it("produces tokens the accept form accepts", () => {
    const { token } = generateInviteToken();
    const parsed = acceptInviteSchema.safeParse({ token, fullName: "Ana", password: "long-enough" });
    expect(parsed.success).toBe(true);
  });
});

describe("invitePath", () => {
  it("builds the accept link", () => {
    expect(invitePath("abc")).toBe("/invite/abc");
  });
});
