import { Bell, LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { homePathForRole, NOTIFICATIONS_PATH } from "@/lib/auth/paths";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { initials } from "@/lib/names";
import { countUnreadNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

/** Display only. Each page enforces its own access with requireRole. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await countUnreadNotifications(await createClient());

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href={NOTIFICATIONS_PATH}
        className="relative flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-card">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <Link href={homePathForRole(user.role)} className="flex items-center gap-3 rounded-full py-1 pr-1 sm:pr-3">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white"
        >
          {initials(user.fullName)}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-semibold">{user.fullName}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
        </span>
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="icon" aria-label="Sign out" title="Sign out">
          <LogOut className="size-[18px]" />
        </Button>
      </form>
    </div>
  );
}
