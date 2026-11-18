"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SlotPicker, type FacilityOption, type SlotValue } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/tabs-dialog";
import { cancelBookingAction, rescheduleBookingAction } from "@/lib/booking-actions";

export function BookingRowActions({
  bookingId,
  facility,
  date,
  startHour,
  hours,
  minDate,
  label,
}: {
  bookingId: string;
  facility: FacilityOption;
  date: string;
  startHour: number;
  hours: number;
  minDate: string;
  label: string;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<SlotValue>({
    facilityId: facility.id,
    date,
    startHour: null,
    hours,
  });

  async function cancel() {
    setBusy(true);
    const res = await cancelBookingAction(bookingId);
    setBusy(false);
    setCancelOpen(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message ?? "Booking cancelled");
    router.refresh();
  }

  async function move() {
    if (slot.startHour === null) return;
    setBusy(true);
    setError(null);
    const res = await rescheduleBookingAction({
      bookingId,
      date: slot.date,
      startHour: slot.startHour,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(res.message ?? "Booking rescheduled");
    setMoveOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
        Reschedule
      </Button>
      <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
        Cancel
      </Button>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this booking?"
        description={`${label} will be cancelled and the time slot released. Fees already paid are not refunded automatically.`}
        confirmLabel={busy ? "Cancelling…" : "Cancel booking"}
        danger
        onConfirm={cancel}
      />

      <Dialog
        open={moveOpen}
        onOpenChange={(next) => {
          if (busy) return;
          setMoveOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent
          title="Reschedule booking"
          description={`${label} · same facility and length, new date or time.`}
        >
          <div className="grid gap-4">
            {error ? (
              <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">{error}</p>
            ) : null}
            <SlotPicker
              facilities={[facility]}
              value={slot}
              onChange={setSlot}
              minDate={minDate}
              maxHours={hours}
              lockFacility
              lockHours
              excludeBookingId={bookingId}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveOpen(false)} disabled={busy}>
                Close
              </Button>
              <Button onClick={move} disabled={busy || slot.startHour === null}>
                {busy ? "Saving…" : "Confirm new time"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
