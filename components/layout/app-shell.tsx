"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookMarked,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  UserCircle,
  X,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { InitialsAvatar } from "@/components/ui/primitives";
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
  ],
  trainer: [
    { href: "/trainer", label: "Home", icon: LayoutDashboard, exact: true },
    { href: "/trainer/my-classes", label: "My classes", icon: BookMarked },
    { href: "/trainer/class-sessions", label: "Sessions", icon: CalendarRange },
    { href: "/trainer/inquiries", label: "Inquiries", icon: MessageSquareText },
    { href: "/trainer/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/trainer/announcements", label: "Announcements", icon: Megaphone },
  ],
  admin: [{ href: "/admin", label: "Home", icon: LayoutDashboard, exact: true }],
};

const PROFILE_HREF: Partial<Record<UserRole, string>> = {
  customer: "/customer/profile",
  trainer: "/trainer/profile",
};

const ROLE_HOME: Record<UserRole, string> = {
  customer: "/customer",
  trainer: "/trainer",
  admin: "/admin",
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
  const profileHref = PROFILE_HREF[role];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const desktopNav = (
    <nav className="hidden items-center gap-2 min-[900px]:flex" aria-label={`${role} navigation`}>
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.82rem] font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "text-subtle hover:bg-ink/[0.045] hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const mobileNav = (
    <nav className="grid gap-1" aria-label={`${role} navigation`}>
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[0.88rem] font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "text-subtle hover:bg-ink/[0.045] hover:text-ink",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      {profileHref ? (
        <Link
          href={profileHref}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[0.88rem] font-medium transition-colors",
            pathname.startsWith(profileHref)
              ? "bg-ink text-white"
              : "text-subtle hover:bg-ink/[0.045] hover:text-ink",
          )}
        >
          <UserCircle className="size-4" />
          Profile
        </Link>
      ) : null}
    </nav>
  );

  return (
    <div className="app-canvas min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-[rgba(246,245,241,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:h-[4.5rem] sm:px-8">
          <Logo href={ROLE_HOME[role]} />
          <div className="ml-4 hidden min-[900px]:block">{desktopNav}</div>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu
              user={user}
              logoutAction={logoutAction}
              profileHref={profileHref}
            />
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-full border border-line bg-white/60 text-ink transition-colors hover:bg-white min-[900px]:hidden"
            >
              {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-line/70 bg-[rgba(246,245,241,0.97)] px-4 py-4 backdrop-blur-xl min-[900px]:hidden">
            {mobileNav}
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

function UserMenu({
  user,
  logoutAction,
  profileHref,
}: {
  user: CurrentUser;
  logoutAction: () => void | Promise<void>;
  profileHref?: string;
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink/[0.045] [&::-webkit-details-marker]:hidden">
        <InitialsAvatar name={user.initials ? user.fullName : "?"} />
        <span className="hidden min-w-0 min-[1180px]:block">
          <span className="block max-w-40 truncate text-[0.8rem] font-medium leading-tight text-ink">
            {user.fullName}
          </span>
          <span className="block text-[0.68rem] capitalize leading-tight text-subtle">
            {user.subtitle ?? user.role}
          </span>
        </span>
        <ChevronDown className="size-3.5 text-subtle transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-[1.25rem] border border-line bg-surface/95 p-1.5 shadow-[0_24px_70px_rgba(12,12,13,0.14)] backdrop-blur-xl">
        <div className="px-3 py-2.5">
          <p className="truncate text-[0.85rem] font-medium text-ink">{user.fullName}</p>
          <p className="text-[0.72rem] capitalize text-subtle">{user.subtitle ?? user.role}</p>
        </div>
        <div className="my-1 h-px bg-line" />
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.83rem] text-ink transition-colors hover:bg-ink/[0.045]"
          >
            <UserCircle className="size-4 text-subtle" />
            Profile
          </Link>
        ) : null}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.83rem] text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
