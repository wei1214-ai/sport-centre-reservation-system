import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import * as React from "react";

import { Logo } from "@/components/layout/logo";

/** Shared layout for login / register / password pages. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-auth-layout className="min-h-dvh bg-page min-[1200px]:flex min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:p-8">
      <div className="min-h-dvh bg-page min-[980px]:grid min-[980px]:grid-cols-[1.05fr_0.95fr] min-[1200px]:min-h-[calc(100dvh_-_4rem)] min-[1200px]:w-full min-[1200px]:max-w-6xl min-[1200px]:overflow-hidden min-[1200px]:rounded-[2rem] min-[1200px]:border min-[1200px]:border-line min-[1200px]:shadow-[0_40px_120px_rgba(12,12,13,0.12)]">
        {/* Brand canvas */}
        <aside className="hero-canvas relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 min-[980px]:flex min-[1200px]:min-h-0">
          <Logo />

          <div className="max-w-lg">
            <p className="eyebrow">Sports facility &amp; class management</p>
            <h2 className="display mt-5 text-[3.6rem] text-ink xl:text-[4.6rem]">
              Play. Train.
              <br />
              Belong.
            </h2>
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-subtle">
              One calm workspace for court bookings, class enrolment and the people
              who make it all run.
            </p>
          </div>

          <p className="text-[0.7rem] text-subtle">
            Book the court. Join the class. Run the session.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex min-h-dvh flex-col min-[1200px]:min-h-0 min-[1200px]:bg-[#fbfaf7]">
          <header className="flex items-center justify-between px-5 py-4 sm:px-8">
            <Logo className="min-[980px]:hidden" />
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-subtle transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Back to home
            </Link>
          </header>

          <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 min-[980px]:items-center min-[980px]:px-10 min-[980px]:pb-4 min-[980px]:pt-0">
            <div className="w-full max-w-lg">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
