import { FlaskConical } from "lucide-react";
import Link from "next/link";

import { BottomNav, SidebarNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { DASHBOARD_PATH } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { navItemsForRole } from "@/lib/navigation";

/** Display only. Each page enforces its own access with requireRole. */
export async function AppSidebar() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <aside className="sticky top-4 hidden h-[calc(100svh-4.5rem)] w-64 shrink-0 flex-col gap-8 rounded-2xl border border-border/70 bg-card p-4 shadow-card lg:flex">
      <Link href={DASHBOARD_PATH} className="px-2 pt-2">
        <Logo />
      </Link>
      <div className="flex flex-col gap-2">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Menu</p>
        <SidebarNav items={navItemsForRole(user.role)} />
      </div>
      <div className="bg-brand-gradient mt-auto flex flex-col gap-3 overflow-hidden rounded-2xl p-4 text-white">
        <span aria-hidden className="glass flex size-9 items-center justify-center rounded-full">
          <FlaskConical className="size-4" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Portfolio build</p>
          <p className="text-xs leading-relaxed text-brand-100">
            Fictional client and sample data. Payments run in Stripe test mode, so no real money moves.
          </p>
        </div>
      </div>
    </aside>
  );
}

export async function MobileNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <BottomNav items={navItemsForRole(user.role)} />;
}
