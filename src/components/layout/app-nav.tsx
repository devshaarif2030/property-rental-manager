"use client";

import { Bell, ClipboardList, House, LayoutDashboard, type LucideIcon, Users, Wrench, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref, type NavIcon, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  properties: House,
  maintenance: Wrench,
  people: Users,
  notifications: Bell,
  report: MessageSquarePlus,
  jobs: ClipboardList,
};

/** Sidebar links on wide screens. */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const active = activeNavHref(items, usePathname());
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-gradient text-white shadow-card"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar on phones. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const active = activeNavHref(items, usePathname());
  return (
    <nav
      aria-label="Main"
      className="glass-light fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl px-2 py-1.5 lg:hidden"
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium",
              isActive ? "text-brand-800" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                isActive && "bg-brand-gradient text-white",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
