"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setFacilityStatusAction } from "@/lib/facility-actions";
import type { FacilityStatus } from "@/types/database";

const OPTIONS: Array<{ value: FacilityStatus; label: string }> = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Under maintenance" },
  { value: "unavailable", label: "Unavailable" },
];

export function FacilityStatusMenu({
  facilityId,
  status,
}: {
  facilityId: string;
  status: FacilityStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const run = async (next: FacilityStatus) => {
    if (next === status) return;
    setBusy(true);
    const res = await setFacilityStatusAction(facilityId, next);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Status updated");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md" aria-label="Facility status" disabled={busy}>
          <MoreHorizontal className="size-4" />
          Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Facility status</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            active={status === option.value}
            onSelect={() => run(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
