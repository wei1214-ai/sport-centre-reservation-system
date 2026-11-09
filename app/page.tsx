import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { getCurrentProfile, roleHome } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { ScrollHint } from "@/components/landing/scroll-hint";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(roleHome(profile.role));
  }

  return (
    <div className="min-h-dvh bg-page">
      {/* Hero */}
      <section className="hero-canvas relative overflow-hidden pb-20 md:pb-28">
        <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Create account</Button>
            </Link>
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pt-10 text-center sm:px-8 md:pt-16">
          <p className="eyebrow animate-rise">Sports facility &amp; class management</p>

          <h1 className="display animate-rise-delay-1 mt-7 max-w-5xl text-[clamp(3.2rem,8.4vw,6rem)] text-ink">
            Play. Train. Belong.
          </h1>

          <p className="animate-rise-delay-2 mt-7 max-w-xl text-[1rem] leading-relaxed text-subtle md:text-[1.08rem]">
            Book courts, join classes and run your training — all in one calm,
            connected place.
          </p>

          <div className="animate-rise-delay-2 mt-9 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/register">
              <Button size="lg" className="group">
                Get started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="glass">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="animate-rise-delay-3 mt-8 w-full max-w-3xl">
            <div className="glass grid grid-cols-1 divide-y divide-white/70 rounded-[1.5rem] px-2 py-1 text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                ["01", "Facility booking"],
                ["02", "Class enrolment"],
                ["03", "Trainer operations"],
              ].map(([number, label]) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="eyebrow !text-ink/35">{number}</span>
                  <span className="text-[0.82rem] font-medium text-ink/75">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ScrollHint />

      {/* Feature cards */}
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">What you can do</p>
            <h2 className="display mt-4 max-w-2xl text-[2.4rem] text-ink md:text-[3.4rem]">
              One place for the whole centre.
            </h2>
          </div>
          <p className="max-w-xs pb-1 text-[0.88rem] leading-relaxed text-subtle">
            Built around the way a sports centre actually runs — from the front
            desk to the court.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          {/* Book */}
          <article className="group">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#cfe0ff,#e6dcff_58%,#ffdcc4)]">
              <svg
                viewBox="0 0 100 75"
                className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                fill="none"
                aria-hidden
              >
                <g stroke="#ffffff" strokeWidth="1.2">
                  <rect x="8" y="8" width="84" height="59" rx="2" fill="none" />
                  <line x1="32" y1="8" x2="32" y2="67" />
                  <line x1="68" y1="8" x2="68" y2="67" />
                  <line x1="8" y1="37.5" x2="92" y2="37.5" />
                </g>
                <line x1="50" y1="8" x2="50" y2="67" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
                  Book a court
                </h3>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-subtle">
                  Find a facility, check availability and lock in your time —
                  conflicts are caught before you confirm.
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </article>

          {/* Join */}
          <article className="group">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#ffe3cd,#ffd6e4_55%,#e5dcff)]">
              <div className="absolute left-1/2 top-1/2 flex w-[68%] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-3xl bg-white p-4 shadow-[0_16px_40px_rgba(12,12,13,0.12)] transition-transform duration-500 group-hover:scale-[1.03]">
                <div className="shrink-0 rounded-2xl bg-ink px-3.5 py-2.5 text-center text-white">
                  <p className="text-[0.7rem] font-medium tracking-[0.12em] uppercase opacity-60">Tue</p>
                  <p className="text-[1.4rem] font-semibold leading-none">18</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-medium text-ink">Badminton</p>
                  <p className="mt-0.5 text-[0.78rem] text-subtle">6:00 PM · Court A</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
                  Join a class
                </h3>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-subtle">
                  Browse classes with clear monthly and per-session pricing, then
                  reserve your spot in a couple of taps.
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </article>

          {/* Run */}
          <article className="group">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#a8dcc8,#b3cdf5_55%,#cfc4f2)]">
              <svg
                viewBox="0 0 200 100"
                className="absolute left-1/2 top-1/2 w-[80%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_3px_8px_rgba(12,12,13,0.30)] transition-transform duration-500 group-hover:scale-[1.03]"
                fill="none"
                aria-hidden
              >
                <polyline
                  points="2,55 35,55 48,28 62,82 75,55 110,55 122,18 135,88 148,55 198,55"
                  stroke="#ffffff"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="122" cy="18" r="6" fill="#ffffff" />
              </svg>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[1.05rem] font-medium tracking-[-0.02em] text-ink">
                  Run your training
                </h3>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-subtle">
                  Create classes, schedule sessions and book the facility in one
                  flow — attendance and announcements included.
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </article>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="px-5 pb-6 sm:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-ink px-7 py-16 text-white md:px-14 md:py-24">
          <div
            className="pointer-events-none absolute -right-24 -top-28 size-[26rem] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #4f7cff 0%, #a78bfa 45%, transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-24 size-[22rem] rounded-full opacity-30 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #ffb38a 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <p className="eyebrow !text-white">Ready when you are</p>
            <h2 className="display mt-5 max-w-2xl text-[2.6rem] md:text-[4.2rem]">
              Your next game starts here.
            </h2>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white">
              Create an account and step into the centre — whether you play,
              coach or run the place.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              <Link href="/register">
                <Button size="lg" variant="inverse" className="group">
                  Create account
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="glass"
                  className="border-white/15 bg-white/10 text-white hover:bg-white/20"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
        <Logo />
        <p className="text-[0.72rem] text-subtle">
          Sports Facility &amp; Class Management System
        </p>
      </footer>
    </div>
  );
}
