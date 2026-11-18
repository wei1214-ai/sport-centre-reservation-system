"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-fields";
import { getBusyWindowsAction } from "@/lib/booking-actions";
import { combineLocalDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FacilityOption = {
  id: string;
  name: string;
  hourlyRate: number;
  opening: string; // "08:00:00"
  closing: string; // "22:00:00"
};

export type SlotValue = {
  facilityId: string;
  date: string;
  startHour: number | null;
  hours: number;
};

type Busy = { start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");

function hoursWindow(f: FacilityOption | undefined) {
  if (!f) return { openHour: 8, closeHour: 22 };
  const toMin = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  return { openHour: Math.ceil(toMin(f.opening) / 60), closeHour: Math.floor(toMin(f.closing) / 60) };
}

/**
 * Facility + date + start-hour + duration chooser with live availability.
 * Used for rescheduling, walk-in bookings and administrator edits.
 */
export function SlotPicker({
  facilities,
  value,
  onChange,
  minDate,
  maxHours,
  lockFacility,
  lockHours,
  excludeBookingId,
}: {
  facilities: FacilityOption[];
  value: SlotValue;
  onChange: (next: SlotValue) => void;
  minDate: string;
  maxHours: number;
  lockFacility?: boolean;
  lockHours?: boolean;
  excludeBookingId?: string;
}) {
  const facility = facilities.find((f) => f.id === value.facilityId);
  const { openHour, closeHour } = hoursWindow(facility);
  const key = `${value.facilityId}|${value.date}`;
  const [loaded, setLoaded] = React.useState<{ key: string; busy: Busy[] } | null>(null);
  const [now] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!value.facilityId || !value.date) return;
    let cancelled = false;
    getBusyWindowsAction({
      facilityId: value.facilityId,
      date: value.date,
      excludeBookingId,
    }).then((busy) => {
      if (!cancelled) setLoaded({ key, busy });
    });
    return () => {
      cancelled = true;
    };
  }, [key, excludeBookingId, value.facilityId, value.date]);

  const loading = loaded?.key !== key;
  const busy = loading || !loaded ? [] : loaded.busy;

  const isTaken = (hour: number) => {
    const s = new Date(combineLocalDateTime(value.date, `${pad(hour)}:00`)).getTime();
    const e = new Date(combineLocalDateTime(value.date, `${pad(hour + 1)}:00`)).getTime();
    if (s < now) return true;
    return busy.some((b) => new Date(b.start).getTime() < e && new Date(b.end).getTime() > s);
  };

  const rangeFree =
    value.startHour !== null &&
    value.startHour + value.hours <= closeHour &&
    Array.from({ length: value.hours }, (_, i) => (value.startHour as number) + i).every(
      (h) => !isTaken(h),
    );

  const hourList = Array.from({ length: Math.max(closeHour - openHour, 0) }, (_, i) => openHour + i);
  const total = (facility?.hourlyRate ?? 0) * value.hours;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {!lockFacility ? (
          <Field label="Facility">
            <NativeSelect
              value={value.facilityId}
              onChange={(e) =>
                onChange({ ...value, facilityId: e.target.value, startHour: null })
              }
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Date">
          <Input
            type="date"
            min={minDate}
            value={value.date}
            onChange={(e) =>
              e.target.value && onChange({ ...value, date: e.target.value, startHour: null })
            }
          />
        </Field>
        {!lockHours ? (
          <Field label="Duration">
            <NativeSelect
              value={value.hours}
              onChange={(e) => onChange({ ...value, hours: Number(e.target.value) })}
            >
              {Array.from({ length: maxHours }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} hour{n > 1 ? "s" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>

      <div className="grid gap-2">
        <p className="text-[0.8rem] font-medium text-ink">
          Start time{lockHours ? ` (${value.hours} hour${value.hours > 1 ? "s" : ""})` : ""}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {hourList.map((h) => {
            const taken = loading || isTaken(h);
            return (
              <Button
                key={h}
                type="button"
                size="sm"
                variant={value.startHour === h ? "brand" : "outline"}
                disabled={taken}
                className={cn(taken && !loading && "line-through")}
                onClick={() => onChange({ ...value, startHour: h })}
              >
                {pad(h)}:00
              </Button>
            );
          })}
        </div>
        <p className="text-[0.75rem] text-subtle">
          {loading ? "Checking availability…" : "Struck-through times are booked, in maintenance or past."}
        </p>
        {value.startHour !== null && !rangeFree && !loading ? (
          <p className="text-[0.75rem] font-medium text-danger">
            That start time is not free for the whole duration. Pick another time or duration.
          </p>
        ) : null}
      </div>

      <p className="text-[0.85rem] text-ink">
        {value.startHour !== null && rangeFree
          ? `${pad(value.startHour)}:00 – ${pad(value.startHour + value.hours)}:00 · `
          : ""}
        <span className="font-medium">RM {total.toFixed(2)}</span>
      </p>
    </div>
  );
}
