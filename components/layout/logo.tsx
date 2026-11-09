import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full",
        className,
      )}
      style={{
        background:
          "conic-gradient(from 220deg at 50% 50%, #4f7cff, #a78bfa 38%, #ffb38a 70%, #4f7cff)",
      }}
      aria-hidden
    >
      <span className="absolute inset-[3px] rounded-full border border-white/55" />
      <svg
        viewBox="0 0 24 24"
        className="relative size-4 text-white drop-shadow-[0_1px_2px_rgba(12,12,13,0.35)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
      </svg>
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  markClassName,
}: {
  href?: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-70",
        className,
      )}
    >
      <LogoMark className={markClassName} />
      <span className="text-[0.95rem] font-semibold tracking-[-0.03em]">
        SportHub
      </span>
    </Link>
  );
}
