import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/layout/logo";
import { DASHBOARD_PATH } from "@/lib/auth/paths";

import { AppSidebar, MobileNav } from "./app-sidebar";
import { UserMenu } from "./user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-4 p-3 sm:p-4">
      <Suspense>
        <AppSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex h-16 items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-4 shadow-card sm:px-5">
          <Link href={DASHBOARD_PATH} className="lg:hidden" aria-label="Home">
            <Logo />
          </Link>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Fictional sample data. Resets every night at 03:00 UTC.
          </p>
          <Suspense>
            <UserMenu />
          </Suspense>
        </header>
        <main className="stagger-page flex-1 px-1 pt-2 pb-28 sm:px-2 lg:pb-8">{children}</main>
      </div>
      <Suspense>
        <MobileNav />
      </Suspense>
    </div>
  );
}
