import Link from "next/link";

import { Button } from "@/components/ui/button";
import { homePathForRole, NOTIFICATIONS_PATH } from "@/lib/auth/paths";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

/** Display only. Each page enforces its own access with requireRole. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await countUnreadNotifications(await createClient());

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href={homePathForRole(user.role)} className="hidden sm:block">
        <span className="font-medium">{user.fullName}</span>
        <span className="text-muted-foreground"> · {ROLE_LABELS[user.role]}</span>
      </Link>
      {(user.role === "admin" || user.role === "manager") && (
        <nav className="flex items-center gap-4">
          <Link href="/manager/properties" className="text-muted-foreground hover:text-foreground">
            Properties
          </Link>
          <Link href="/manager/maintenance" className="text-muted-foreground hover:text-foreground">
            Maintenance
          </Link>
          <Link href="/manager/people" className="text-muted-foreground hover:text-foreground">
            People
          </Link>
        </nav>
      )}
      <Link
        href={NOTIFICATIONS_PATH}
        className="text-muted-foreground hover:text-foreground"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        Notifications
        {unread > 0 && (
          <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
