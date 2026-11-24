import Link from "next/link";

import { Button } from "@/components/ui/button";
import { homePathForRole } from "@/lib/auth/paths";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/app/sign-in/actions";

/** Display only. Each page enforces its own access with requireRole. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href={homePathForRole(user.role)} className="hidden sm:block">
        <span className="font-medium">{user.fullName}</span>
        <span className="text-muted-foreground"> · {ROLE_LABELS[user.role]}</span>
      </Link>
      {(user.role === "admin" || user.role === "manager") && (
        <Link href="/manager/people" className="text-muted-foreground hover:text-foreground">
          People
        </Link>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
