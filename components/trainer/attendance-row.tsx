"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { markAttendanceAction } from "@/lib/trainer-actions";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/database";

const OPTIONS: Array<{ key: AttendanceStatus | "not_marked"; label: string }> = [
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "not_marked", label: "Not marked" },
];

const currentTone: Record<string, string> = {
  present: "bg-success-soft text-success",
  late: "bg-warning-soft text-warning",
  absent: "bg-danger-soft text-danger",
};

export function AttendanceRow({
  sessionId,
  enrollmentId,
  name,
  email,
  current,
}: {
  sessionId: string;
  enrollmentId: string;
  name: string;
  email: string;
  current: AttendanceStatus | "not_marked";
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [optimistic, setOptimistic] = React.useState<AttendanceStatus | "not_marked">(current);

  const pick = async (next: AttendanceStatus | "not_marked") => {
    setBusy(true);
    const previous = optimistic;
    setOptimistic(next);
    const res = await markAttendanceAction({ sessionId, enrollmentId, status: next });
    setBusy(false);
    if (!res.ok) {
      setOptimistic(previous);
      toast.error(res.error);
      return;
    }
    toast.success(
      next === "not_marked" ? "Attendance cleared" : `Marked as ${next}`,
    );
    router.refresh();
  };

  const label =
    optimistic === "not_marked" ? "Not marked" : optimistic.charAt(0).toUpperCase() + optimistic.slice(1);

  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[0.88rem] font-semibold text-ink">{name}</p>
        <p className="truncate text-[0.72rem] text-subtle">{email}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="gap-2 enabled:gap-2"
          >
            <span
              className={cn(
                "inline-flex min-w-20 items-center justify-center rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
                currentTone[optimistic] ?? "bg-page text-subtle",
              )}
            >
              {label}
            </span>
            <ChevronDown className="size-3.5 text-subtle" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Attendance</DropdownMenuLabel>
          {OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.key}
              active={optimistic === option.key}
              danger={option.key === "absent"}
              onSelect={() => pick(option.key)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
