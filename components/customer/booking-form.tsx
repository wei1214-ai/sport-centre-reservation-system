"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { createBookingAction } from "@/lib/booking-actions";
import { PAYMENT_METHODS } from "@/lib/constants";
import { combineLocalDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Busy = { start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");

export function BookingForm({
  facilityId,
  hourlyRate,
  date,
  minDate,
  busy,
  openHour,
  closeHour,
  maxHours,
}: {
  facilityId: string;
  hourlyRate: number;
  date: string;
  minDate: string;
  busy: Busy[];
  openHour: number;
  closeHour: number;
  maxHours: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [startHour, setStartHour] = React.useState<number | null>(null);
  const [hours, setHours] = React.useState(1);
  const [method, setMethod] = React.useState<string>(PAYMENT_METHODS[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [now] = React.useState(() => Date.now());

  const hoursList = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);

  /** An hour is taken if it overlaps a busy window or is already in the past. */
  const isTaken = (hour: number) => {
    const s = new Date(combineLocalDateTime(date, `${pad(hour)}:00`)).getTime();
    const e = new Date(combineLocalDateTime(date, `${pad(hour + 1)}:00`)).getTime();
    if (s < now) return true;
    return busy.some((b) => new Date(b.start).getTime() < e && new Date(b.end).getTime() > s);
  };

  const rangeFree =
    startHour !== null &&
    startHour + hours <= closeHour &&
    Array.from({ length: hours }, (_, i) => startHour + i).every((h) => !isTaken(h));

  const total = hourlyRate * hours;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startHour === null || !rangeFree) {
      setError("Choose a free start time that fits your duration.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createBookingAction({
        facilityId,
        date,
        startHour,
        hours,
        paymentMethod: method as (typeof PAYMENT_METHODS)[number],
      });
      if (!res.ok) {
        setError(res.error);
        router.refresh(); // reload busy slots in case someone else booked
        return;
      }
      toast.success(res.message ?? "Booking confirmed");
      setStartHour(null);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="surface grid gap-5 p-5">
      {error ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">{error}</p>
      ) : null}

      <Field label="Date" htmlFor="booking-date">
        <Input
          id="booking-date"
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => e.target.value && router.replace(`${pathname}?date=${e.target.value}`)}
        />
      </Field>

      <div className="grid gap-2">
        <p className="text-[0.8rem] font-medium text-ink">Start time</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {hoursList.map((h) => {
            const taken = isTaken(h);
            return (
              <Button
                key={h}
                type="button"
                size="sm"
                variant={startHour === h ? "brand" : "outline"}
                disabled={taken}
                className={cn(taken && "line-through")}
                onClick={() => setStartHour(h)}
              >
                {pad(h)}:00
              </Button>
            );
          })}
        </div>
        <p className="text-[0.75rem] text-subtle">Struck-through times are already booked or past.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Duration">
          <NativeSelect value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {Array.from({ length: maxHours }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} hour{n > 1 ? "s" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Payment method">
          <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="text-[0.75rem] text-subtle">
            {startHour !== null && rangeFree
              ? `${pad(startHour)}:00 – ${pad(startHour + hours)}:00`
              : "Select a time"}
          </p>
          <p className="text-[1.1rem] font-medium text-ink">RM {total.toFixed(2)}</p>
        </div>
        <SubmitButton disabled={!rangeFree || pending} pendingLabel="Processing payment…">
          Pay &amp; book
        </SubmitButton>
      </div>
    </form>
  );
}
