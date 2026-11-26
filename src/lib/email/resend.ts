import { z } from "zod";

// Sends one email through the Resend REST API. Server only: the key goes in
// the Authorization header and never reaches the browser or a URL.

const RESEND_URL = "https://api.resend.com/emails";
export const RESEND_TIMEOUT_MS = 8000;

export type EmailConfig = { apiKey: string; from: string; siteUrl: string };

export type EmailMessage = { to: string; subject: string; text: string; html: string };

const sentSchema = z.object({ id: z.string().min(1) });

/** Returns true when Resend accepted the email. Never throws. */
export async function sendEmail(
  config: Pick<EmailConfig, "apiKey" | "from">,
  message: EmailMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, ...message }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    return sentSchema.safeParse(await response.json()).success;
  } catch {
    return false;
  }
}
