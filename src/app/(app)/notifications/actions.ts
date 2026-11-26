"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { NOTIFICATIONS_PATH } from "@/lib/auth/paths";
import { safeNotificationLink } from "@/lib/notifications/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

/** Marks one notification read and opens what it points to. RLS limits the update to the user's own rows. */
export async function openNotification(notificationId: string) {
  await requireUser(NOTIFICATIONS_PATH);
  const id = idSchema.safeParse(notificationId);
  if (!id.success) redirect(NOTIFICATIONS_PATH);

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("link")
    .maybeSingle();

  revalidatePath("/", "layout");
  redirect(safeNotificationLink(data?.link ?? null) ?? NOTIFICATIONS_PATH);
}

export async function markAllNotificationsRead() {
  await requireUser(NOTIFICATIONS_PATH);
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}
