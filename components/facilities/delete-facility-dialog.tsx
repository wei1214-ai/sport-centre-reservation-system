"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { deleteFacilityAction } from "@/lib/facility-actions";

export function DeleteFacilityDialog({
  facilityId,
  facilityName,
}: {
  facilityId: string;
  facilityName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    const res = await deleteFacilityAction(facilityId);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast.success(res.message ?? "Facility deleted");
    setOpen(false);
    router.push("/facilities");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete
      </Button>
      <DialogContent
        title={`Delete ${facilityName}?`}
        description="This permanently removes the facility from the catalogue. It cannot be undone."
      >
        <div className="grid gap-4">
          <p className="rounded-2xl bg-danger-soft/70 px-4 py-3.5 text-[0.8rem] leading-relaxed text-danger">
            A facility can only be deleted when it has no bookings, classes or
            maintenance records. If it is still in use, mark it as under
            maintenance or unavailable instead.
          </p>

          {error ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Keep facility
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete facility"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
