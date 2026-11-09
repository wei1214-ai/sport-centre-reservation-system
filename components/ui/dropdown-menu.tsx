"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={8}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-[1.25rem] border border-line bg-surface/95 p-1.5 shadow-[0_24px_70px_rgba(12,12,13,0.14)] backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          className,
        )}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  icon,
  children,
  active,
  danger,
  onSelect,
  disabled,
}: {
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onSelect?: (event: Event) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-[0.83rem] outline-none transition-colors",
        danger
          ? "text-danger data-[highlighted]:bg-danger-soft"
          : "text-ink data-[highlighted]:bg-ink/[0.045]",
        className,
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {active ? (
        <span className="size-1.5 rounded-full bg-ink" aria-hidden />
      ) : null}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-3 py-1.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-subtle", className)}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-line" />;
}
