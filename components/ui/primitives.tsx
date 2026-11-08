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
  brand: "bg-brand text-white",
  brandSoft: "bg-brand-soft text-brand",
  energy: "bg-energy-soft text-[#b26a12]",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-page text-subtle border border-line",
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
        "surface flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-subtle/70">{icon}</div> : null}
      <p className="text-[0.95rem] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[0.82rem] text-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
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
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[0.85rem] text-subtle">{subtitle}</p> : null}
      </div>
      {slot ? <div className="flex items-center gap-2">{slot}</div> : null}
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
    brand: "text-brand",
    brandSoft: "text-brand",
    energy: "text-[#b26a12]",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  };
  return (
    <div className={cn("flex flex-col gap-0.5 px-4 py-3.5 surface", className)}>
      <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </span>
      <span className={cn("text-xl font-bold tabular-nums", accent[tone])}>{value}</span>
      {hint ? <span className="text-[0.72rem] text-subtle">{hint}</span> : null}
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
        "inline-flex size-9 items-center justify-center rounded-full bg-brand-soft text-[0.8rem] font-bold text-brand",
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
