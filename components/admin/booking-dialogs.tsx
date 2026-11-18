"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Play } from "lucide-react";
import { toast } from "sonner";

import { SlotPicker, type FacilityOption, type SlotValue } from "@/components/booking/slot-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form-fields";
import { ConfirmDialog } from "@/components/ui/tabs-dialog";
import {
  adminCancelBookingAction,
  adminCreateWalkInBookingAction,
  adminUpdateBookingAction,
  runDailyJobsAction,
} from "@/lib/booking-actions";
import { MAX_BOOKING_HOURS } from "@/lib/constants";

function ErrorBox({ message }: { message: string | null }) {
  return message ? (
    <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">{message}</p>
  ) : null;
}

/** F5.13 / F5.14 - book on behalf of a walk-in customer. */
export function WalkInBookingDialog({
  facilities,
  today,
}: {
  facilities: FacilityOption[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [slot, setSlot] = React.useState<SlotValue>({
    facilityId: facilities[0]?.id ?? "",
    date: today,
    startHour: null,
    hours: 1,
  });

  async function submit() {
    if (slot.startHour === null) return setError("Choose a start time.");
    setBusy(true);
    setError(null);
    const res = await adminCreateWalkInBookingAction({
      facilityId: slot.facilityId,
      date: slot.date,
      startHour: slot.startHour,
      hours: slot.hours,
      name,
      phone,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(res.message ?? "Booking created");
    setOpen(false);
    setName("");
    setPhone("");
    setSlot({ ...slot, startHour: null });
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!facilities.length}>
        <CalendarPlus className="size-4" />
        Walk-in booking
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent
          title="Walk-in booking"
          description="Book a facility for a customer who is at the centre. Payment is taken at the counter."
        >
          <div className="grid gap-4">
            <ErrorBox message={error} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Phone number" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-345 6789" />
              </Field>
            </div>
            <SlotPicker
              facilities={facilities}
              value={slot}
              onChange={setSlot}
              minDate={today}
              maxHours={MAX_BOOKING_HOURS}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Close
              </Button>
              <Button onClick={submit} disabled={busy || slot.startHour === null}>
                {busy ? "Saving…" : "Create booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** F5.15 / F5.16 - change or cancel a booking. */
export function AdminBookingActions({
  bookingId,
  label,
  facilities,
  initial,
  today,
  editable,
}: {
  bookingId: string;
  label: string;
  facilities: FacilityOption[];
  initial: { facilityId: string; date: string; hours: number };
  today: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<SlotValue>({ ...initial, startHour: null });

  async function save() {
    if (slot.startHour === null) return;
    setBusy(true);
    setError(null);
    const res = await adminUpdateBookingAction({
      bookingId,
      facilityId: slot.facilityId,
      date: slot.date,
      startHour: slot.startHour,
      hours: slot.hours,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(res.message ?? "Booking updated");
    setEditOpen(false);
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    const res = await adminCancelBookingAction(bookingId);
    setBusy(false);
    setCancelOpen(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message ?? "Booking cancelled");
    router.refresh();
  }

  if (!editable) return <span className="text-[0.75rem] text-subtle">—</span>;

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
        Cancel
      </Button>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this booking?"
        description={`${label} will be cancelled and the slot released.`}
        confirmLabel={busy ? "Cancelling…" : "Cancel booking"}
        danger
        onConfirm={cancel}
      />

      <Dialog open={editOpen} onOpenChange={(next) => !busy && setEditOpen(next)}>
        <DialogContent title="Edit booking" description={`${label} · change the facility, date or time.`}>
          <div className="grid gap-4">
            <ErrorBox message={error} />
            <SlotPicker
              facilities={facilities}
              value={slot}
              onChange={setSlot}
              minDate={today}
              maxHours={MAX_BOOKING_HOURS}
              excludeBookingId={bookingId}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
                Close
              </Button>
              <Button onClick={save} disabled={busy || slot.startHour === null}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Runs booking reminders + unpaid-fee removal now (normally run daily). */
export function RunDailyJobsButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await runDailyJobsAction();
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message ?? "Done");
          router.refresh();
        })
      }
    >
      <Play className="size-4" />
      {pending ? "Running…" : "Run daily jobs"}
    </Button>
  );
}
