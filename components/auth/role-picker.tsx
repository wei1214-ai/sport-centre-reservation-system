"use client";

import { Dumbbell, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type RoleOption = {
  value: UserRole;
  title: string;
  description: string;
  icon: LucideIcon;
};

const OPTIONS: RoleOption[] = [
  {
    value: "customer",
    title: "Customer",
    description: "Book facilities and join classes",
    icon: UserRound,
  },
  {
    value: "trainer",
    title: "Trainer",
    description: "Run classes, sessions & attendance",
    icon: Dumbbell,
  },
  {
    value: "admin",
    title: "Admin",
    description: "Manage the whole operation",
    icon: ShieldCheck,
  },
];

/** Segmented role selector shared by login and register forms. */
export function RolePicker({
  value,
  onChange,
  compact = false,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}
      role="radiogroup"
      aria-label="Account role"
    >
      {OPTIONS.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "block cursor-pointer gap-2 rounded-[var(--radius-md)] border p-3 transition-colors focus-within:box-shadow-[0_0_0_3px_var(--brand-soft)]",
              checked
                ? "border-brand bg-brand-soft/40"
                : "border-line bg-surface hover:border-brand/40",
              compact && "p-2.5 text-center",
            )}
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <option.icon
              className={cn(
                "size-4.5 shrink-0",
                checked ? "text-brand" : "text-subtle",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[0.85rem] font-semibold",
                  checked ? "text-brand" : "text-ink",
                )}
              >
                {option.title}
              </p>
              {!compact ? (
                <p className="mt-0.5 text-[0.72rem] leading-snug text-subtle">
                  {option.description}
                </p>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}
