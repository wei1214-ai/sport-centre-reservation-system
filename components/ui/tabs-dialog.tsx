"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";

/* ---------------------------------- Tabs ---------------------------------- */

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-[var(--radius-md)] border border-line bg-page p-1 sm:w-auto",
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  className,
  value,
  children,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-md)-0.2rem)] px-3 py-1.5 text-[0.82rem] font-medium text-subtle transition-colors sm:flex-none",
        "data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:font-semibold data-[state=active]:shadow-[0_1px_2px_rgba(23,32,51,0.06)]",
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  className,
  value,
  children,
}: {
  className?: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Content value={value} className={cn("mt-4 outline-none", className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

/* ------------------------------ Alert dialog ------------------------------ */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xl focus:outline-none">
          <AlertDialogPrimitive.Title className="text-base font-semibold text-ink">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-1 text-[0.85rem] text-subtle">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-4 flex items-center justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <button className="h-9 rounded-[var(--radius-md)] border border-line bg-surface px-3.5 text-[0.85rem] font-medium text-ink hover:bg-page">
                Keep as is
              </button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
              className={cn(
                "h-9 rounded-[var(--radius-md)] px-3.5 text-[0.85rem] font-semibold text-white",
                danger ? "bg-danger hover:bg-[color-mix(in_srgb,var(--danger)_88%,#000)]" : "bg-brand hover:bg-brand-hover",
              )}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
