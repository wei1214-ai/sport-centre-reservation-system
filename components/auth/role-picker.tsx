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
  if (compact) {
    return (
      <div
        className="grid grid-cols-3 gap-1 rounded-full bg-[#eeece6] p-1"
        role="radiogroup"
        aria-label="Account role"
      >
        {OPTIONS.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[0.8rem] font-medium transition-all",
                checked
                  ? "bg-ink text-white shadow-[0_2px_8px_rgba(12,12,13,0.18)]"
                  : "text-subtle hover:text-ink",
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
              <option.icon className="size-3.5" />
              {option.title}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="grid gap-2 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Account role"
    >
      {OPTIONS.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer flex-col gap-4 rounded-2xl border p-4 transition-all",
              checked
                ? "border-ink bg-ink text-white shadow-[0_12px_32px_rgba(12,12,13,0.18)]"
                : "border-line bg-white/60 hover:border-ink/20 hover:bg-white",
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
              className={cn("size-4.5", checked ? "text-white" : "text-ink")}
            />
            <div className="min-w-0">
              <p className="text-[0.85rem] font-medium">
                {option.title}
              </p>
              <p
                className={cn(
                  "mt-1 text-[0.72rem] leading-snug",
                  checked ? "text-white/60" : "text-subtle",
                )}
              >
                {option.description}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
