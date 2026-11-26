import { describe, expect, it, vi } from "vitest";

import { sendEmail } from "./resend";

const config = { apiKey: "re_test_key", from: "App <app@example.com>" };
const message = { to: "manager@example.com", subject: "Hi", text: "Hi", html: "<p>Hi</p>" };

function fetchReturning(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("sendEmail", () => {
  it("posts to Resend with the key in the header only", async () => {
    const fetchImpl = fetchReturning(200, { id: "email_1" });
    expect(await sendEmail(config, message, fetchImpl)).toBe(true);

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(String(url)).not.toContain(config.apiKey);
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init!.body as string)).toEqual({ from: config.from, ...message });
  });

  it.each([
    [422, { message: "domain not verified" }],
    [429, { message: "rate limited" }],
    [200, { unexpected: true }],
  ])("returns false on status %i", async (status, body) => {
    expect(await sendEmail(config, message, fetchReturning(status, body))).toBe(false);
  });

  it("returns false when the network fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await sendEmail(config, message, fetchImpl)).toBe(false);
  });
});
