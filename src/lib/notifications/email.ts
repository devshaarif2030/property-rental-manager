import "server-only";

import { getEmailConfig } from "@/lib/email/env";
import { sendEmail } from "@/lib/email/resend";
import { notificationEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails the emergency notifications that have not been emailed yet. Runs
 * after a response (via after()), never in front of the user. Each one is
 * claimed in the database before sending, so it goes out at most once; a
 * failed send is logged and not retried. Without RESEND_API_KEY it does nothing.
 */
export async function sendNotificationEmails(): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  const { data, error } = await createAdminClient().rpc("claim_notification_emails", { p_limit: 10 });
  if (error) {
    console.error("claim_notification_emails failed", error.message);
    return;
  }

  for (const notification of data) {
    const sent = await sendEmail(config, notificationEmail(notification, notification.email, config.siteUrl));
    if (!sent) console.error("Notification email was not accepted", notification.id);
  }
}
