import { Button } from "@/components/ui/button";
import { NOTIFICATIONS_PATH } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";
import { formatIsoDate } from "@/lib/dates";
import { listNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { markAllNotificationsRead, openNotification } from "./actions";

export default async function NotificationsPage() {
  await requireUser(NOTIFICATIONS_PATH);
  const supabase = await createClient();
  const notifications = await listNotifications(supabase);
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">{unread === 0 ? "You are all caught up." : `${unread} unread`}</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <form action={openNotification.bind(null, notification.id)}>
                <button
                  type="submit"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="flex flex-col">
                    <span className={cn(!notification.read && "font-medium")}>
                      {notification.title}
                      {!notification.read && <span className="sr-only"> (unread)</span>}
                    </span>
                    <span className="text-muted-foreground">
                      {formatIsoDate(notification.createdAt.slice(0, 10))}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
