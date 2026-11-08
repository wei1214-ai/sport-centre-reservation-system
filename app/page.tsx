import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarRange, Dumbbell } from "lucide-react";

import { getCurrentProfile, roleHome } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(roleHome(profile.role));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-brand text-white">
            <Dumbbell className="size-4.5" />
          </span>
          <span className="text-[0.95rem] font-bold tracking-tight text-ink">SportHub</span>
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" variant="brand">Create account</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-24 pt-8">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
            Book courts.{"\n"}Join classes.{"\n"}Stay active.
          </h1>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-subtle">
            One place for the centre&apos;s facilities, sports classes and
            training operations — with clear, comfortable tools for customers,
            trainers and administrators.
          </p>
          <div className="mt-6 flex items-center gap-2.5">
            <Link href="/login">
              <Button size="lg">
                Sign in
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">Create account</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Roles that fit", text: "Separated areas for customers, trainers and admins." },
            { icon: CalendarRange, title: "Conflict-free scheduling", text: "Availability is revalidated on the server before confirming." },
            { icon: Dumbbell, title: "Built for movement", text: "Minimal, comfortable interface with the full picture in view." },
          ].map((feature) => (
            <div key={feature.title} className="surface flex flex-col gap-1.5 p-4">
              <feature.icon className="size-4.5 text-brand" />
              <p className="text-[0.88rem] font-semibold text-ink">{feature.title}</p>
              <p className="text-[0.78rem] leading-relaxed text-subtle">{feature.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-line py-5 text-center text-[0.75rem] text-subtle">
        Sports Facility &amp; Class Management System · Demo build
      </footer>
    </div>
  );
}
