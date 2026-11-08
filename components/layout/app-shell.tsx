"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BookMarked,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Menu,
  UserCircle,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export type CurrentUser = {
  fullName: string;
  role: string;
  initials: string;
  subtitle?: string;
};

const NAV: Record<UserRole, NavItem[]> = {
  customer: [
    { href: "/customer", label: "Home", icon: Home, exact: true },
    { href: "/customer/profile", label: "Profile", icon: UserCircle },
  ],
  trainer: [
    { href: "/trainer", label: "Home", icon: LayoutDashboard, exact: true },
    { href: "/trainer/my-classes", label: "My Classes", icon: BookMarked },
    { href: "/trainer/class-sessions", label: "Class Sessions", icon: CalendarRange },
    { href: "/trainer/inquiries", label: "Inquiries", icon: MessageSquareText },
    { href: "/trainer/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/trainer/announcements", label: "Announcements", icon: Megaphone },
    { href: "/trainer/profile", label: "Profile", icon: UserCircle },
  ],
  admin: [{ href: "/admin", label: "Home", icon: LayoutDashboard, exact: true }],
};

export function AppShell({
  role,
  user,
  logoutAction,
  children,
}: {
  role: UserRole;
  user: CurrentUser;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const items = NAV[role];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const nav = (
    <nav className="grid gap-0.5" aria-label={`${role} navigation`}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-[0.85rem] font-medium text-subtle transition-colors hover:bg-page hover:text-ink",
            isActive(item) && "bg-brand-soft/60 text-brand font-semibold",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-58 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <SidebarLogo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">{nav}</div>
        <UserBlock user={user} logoutAction={logoutAction} />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <SidebarLogo compact />
        </div>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 text-subtle hover:bg-page hover:text-ink"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {mobileOpen ? (
        <div
          className="fixed inset-0 top-14 z-30 bg-ink/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto border-b border-line bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
            <UserBlock user={user} logoutAction={logoutAction} compact />
          </div>
        </div>
      ) : null}

      <main className="min-h-[calc(100dvh-3.5rem)] px-4 py-5 lg:ml-58 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

function SidebarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-brand text-white">
        <Activity className="size-4.5" />
      </span>
      <span className={cn("font-bold tracking-tight text-ink", compact ? "text-[0.9rem]" : "text-[0.95rem]")}>
        SportHub
      </span>
    </Link>
  );
}

function UserBlock({
  user,
  logoutAction,
  compact = false,
}: {
  user: CurrentUser;
  logoutAction: () => void | Promise<void>;
  compact?: boolean;
}) {
  return (
    <div className="border-t border-line p-3">
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 hover:bg-page">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.82rem] font-bold text-brand">
            {user.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.85rem] font-semibold text-ink">
              {user.fullName}
            </span>
            <span className="block text-[0.7rem] capitalize text-subtle">
              {user.subtitle ?? user.role}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-[0.85rem] font-medium text-subtle hover:bg-danger-soft hover:text-danger"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
