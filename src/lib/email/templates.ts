import type { EmailMessage } from "./resend";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

/** Absolute link for an in-app path, or the site root when the path is not same-site. */
export function absoluteLink(siteUrl: string, path: string | null): string {
  const base = siteUrl.replace(/\/+$/, "");
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return `${base}/`;
  return `${base}${path}`;
}

/** The email a manager gets when a request is flagged as an emergency. Tenant text is escaped. */
export function notificationEmail(
  notification: { title: string; link: string | null },
  to: string,
  siteUrl: string,
): EmailMessage {
  const url = absoluteLink(siteUrl, notification.link);
  const subject = notification.title.replace(/[\r\n]+/g, " ").slice(0, 150);
  const text = `${notification.title}\n\nOpen it: ${url}\n\nProperty Rental Manager`;
  const html = [
    `<p style="font-size:16px"><strong>${escapeHtml(notification.title)}</strong></p>`,
    `<p><a href="${escapeHtml(url)}">Open the request</a></p>`,
    `<p style="color:#666;font-size:12px">Property Rental Manager</p>`,
  ].join("\n");
  return { to, subject, text, html };
}
