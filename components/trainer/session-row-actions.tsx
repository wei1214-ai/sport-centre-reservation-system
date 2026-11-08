"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/tabs-dialog";
import { Button } from "@/components/ui/button";
import { SessionDialog } from "@/components/trainer/session-dialogs";
import { cancelSessionAction, reopenSessionAction } from "@/lib/trainer-actions";

export function SessionRowActions({
  session,
  facilities,
  facilityId,
}: {
  session: {
    id: string;
    start_time: string;
    end_time: string;
    session_status: string;
  };
  facilities: { id: string; name: string; capacity: number | null; hourlyRate: number }[];
  facilityId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [confirmReopen, setConfirmReopen] = React.useState(false);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Something went wrong");
      return;
    }
    toast.success(res.message ?? "Done");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <SessionDialog
        mode="edit"
        classes={[]}
        facilities={facilities}
        defaultFacilityId={facilityId ?? facilities[0]?.id ?? ""}
        session={session}
        triggerLabel="Reschedule"
        triggerVariant="ghost"
        triggerSize="sm"
      />

      {session.session_status === "scheduled" ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            disabled={busy}
            onClick={() => setConfirmCancel(true)}
          >
            Cancel session
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                danger
                icon={<span className="block size-1.5 rounded-full bg-danger" />}
                onSelect={() => setConfirmCancel(true)}
              >
                Cancel session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : session.session_status === "cancelled" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => setConfirmReopen(true)}
        >
          Re-activate
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this session?"
        description="The session is marked cancelled and enrolled customers can no longer attend it. This keeps the record for history."
        confirmLabel="Cancel session"
        danger
        onConfirm={async () => {
          setConfirmCancel(false);
          await run(() => cancelSessionAction(session.id));
        }}
      />
      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title="Re-activate this session?"
        description="The server re-checks the facility availability before the session becomes scheduled again."
        confirmLabel="Re-activate"
        onConfirm={async () => {
          setConfirmReopen(false);
          await run(() => reopenSessionAction(session.id));
        }}
      />
    </div>
  );
}
