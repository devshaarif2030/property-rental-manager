import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Queries run as the signed-in user; RLS returns only their own notifications.

export type NotificationItem = {
  id: string;
  title: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

export async function listNotifications(supabase: Client, limit = 50): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, link, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    link: row.link,
    createdAt: row.created_at,
    read: row.read_at !== null,
  }));
}

export async function countUnreadNotifications(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** Only same-site paths are followed, so a stored link can never send someone off-site. */
export function safeNotificationLink(link: string | null): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) return null;
  return link;
}
