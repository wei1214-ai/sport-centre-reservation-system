"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setClassStatusAction } from "@/lib/trainer-actions";
import type { ClassStatus } from "@/types/database";

export function ClassStatusMenu({
  classId,
  status,
}: {
  classId: string;
  status: ClassStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const run = async (next: "active" | "archived") => {
    setBusy(true);
    const res = await setClassStatusAction(classId, next);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Updated");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" aria-label="Class status" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Class status</DropdownMenuLabel>
        <DropdownMenuItem active={status === "active"} onSelect={() => run("active")}>
          Active
        </DropdownMenuItem>
        <DropdownMenuItem active={status === "archived"} onSelect={() => run("archived")}>
          Archived
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
