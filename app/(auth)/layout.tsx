import Link from "next/link";
import { Activity } from "lucide-react";
import * as React from "react";

/** Shared layout for login / register / password pages. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="flex h-14 items-center px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-brand text-white">
            <Activity className="size-4.5" />
          </span>
          <span className="text-[0.95rem] font-bold tracking-tight text-ink">SportHub</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 md:items-center md:pt-0">
        {children}
      </main>
    </div>
  );
}
