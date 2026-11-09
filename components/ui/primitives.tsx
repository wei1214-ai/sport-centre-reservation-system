import * as React from "react";

import { cn } from "@/lib/utils";

type PillTone =
  | "brand"
  | "brandSoft"
  | "energy"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const toneClass: Record<PillTone, string> = {
  brand: "bg-ink text-white",
  brandSoft: "bg-brand-soft text-brand",
  energy: "bg-energy-soft text-warning",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-[#f0eee8] text-subtle",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("pill", toneClass[tone], className)}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-line bg-[rgba(255,255,255,0.55)] px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-1 grid size-12 place-items-center rounded-full bg-[linear-gradient(135deg,#e7efff,#f0e6ff)] text-ink/70">
          {icon}
        </div>
      ) : null}
      <p className="text-[1rem] font-medium tracking-[-0.02em] text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[0.85rem] leading-relaxed text-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  slot,
  className,
}: {
  title: string;
  subtitle?: string;
  slot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 pb-1", className)}>
      <div className="max-w-2xl">
        <h1 className="display text-[2rem] text-ink md:text-[2.75rem]">{title}</h1>
        {subtitle ? (
          <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">{subtitle}</p>
        ) : null}
      </div>
      {slot ? <div className="flex items-center gap-2 pb-1">{slot}</div> : null}
    </div>
  );
}

export function StatBlock({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: PillTone;
  className?: string;
}) {
  const accent: Record<PillTone, string> = {
    brand: "text-ink",
    brandSoft: "text-ink",
    energy: "text-warning",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  };
  return (
    <div
      className={cn(
        "surface flex min-h-[7.5rem] flex-col justify-between gap-6 p-5",
        className,
      )}
    >
      <span className="eyebrow">{label}</span>
      <div>
        <span
          className={cn(
            "display block text-[clamp(1.45rem,2.8vw,2.1rem)] leading-none tabular-nums",
            accent[tone],
          )}
        >
          {value}
        </span>
        {hint ? <span className="mt-2 block text-[0.72rem] text-subtle">{hint}</span> : null}
      </div>
    </div>
  );
}

export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7ea2ff,#b49bff)] text-[0.78rem] font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
