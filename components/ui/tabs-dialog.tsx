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
        "inline-flex w-full items-center gap-1 rounded-full bg-[#eeece6] p-1 sm:w-auto",
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
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[0.8rem] font-medium text-subtle transition-colors sm:flex-none",
        "data-[state=active]:bg-ink data-[state=active]:font-medium data-[state=active]:text-white",
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
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0c0c0d]/30 backdrop-blur-[6px]" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-white/70 bg-[#fbfaf7] p-6 shadow-[0_40px_120px_rgba(12,12,13,0.28)] focus:outline-none">
          <AlertDialogPrimitive.Title className="text-[1.25rem] font-medium tracking-[-0.03em] text-ink">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-1.5 text-[0.85rem] leading-relaxed text-subtle">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex items-center justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <button className="h-10 rounded-full border border-line bg-white/70 px-4 text-[0.83rem] font-medium text-ink transition-colors hover:bg-white">
                Keep as is
              </button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
              className={cn(
                "h-10 rounded-full px-4 text-[0.83rem] font-medium text-white transition-colors",
                danger ? "bg-danger hover:bg-[#9a1d13]" : "bg-ink hover:bg-[#262628]",
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
