import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import { AdminBookingActions, RunDailyJobsButton, WalkInBookingDialog } from "@/components/admin/booking-dialogs";
import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-fields";
import { EmptyState, PageHeader, Pill, StatBlock } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { bookingSlotParts, listAllBookings, toFacilityOption, todayLocal } from "@/lib/booking";
import { listFacilities } from "@/lib/facilities";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; facility?: string; status?: string; date?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const today = todayLocal();

  const [{ facilities }, rows] = await Promise.all([
    listFacilities(supabase),
    listAllBookings(supabase, {
      q: params.q,
      facilityId: params.facility || undefined,
      status: params.status || undefined,
      date: params.date || undefined,
    }),
  ]);
  const options = facilities.filter((f) => f.status === "available").map(toFacilityOption);

  // With a date chosen the list doubles as that day's schedule, grouped by facility.
  const bookings = params.date
    ? [...rows].sort(
        (a, b) =>
          a.facilityName.localeCompare(b.facilityName) || a.start_time.localeCompare(b.start_time),
      )
    : rows;

  const upcoming = rows.filter((r) => r.phase === "upcoming").length;
  const walkIns = rows.filter((r) => r.walk_in_name).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Bookings"
        subtitle="All facility bookings and each facility's schedule. Create walk-in bookings, change times or cancel."
        slot={
          <>
            <RunDailyJobsButton />
            <WalkInBookingDialog facilities={options} today={today} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBlock label="Shown" value={rows.length} hint="Matching the filters" />
        <StatBlock label="Upcoming" value={upcoming} hint="Confirmed and not yet ended" />
        <StatBlock label="Walk-ins" value={walkIns} hint="Booked by an administrator" />
      </div>

      <form className="surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Search" className="lg:col-span-2">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Customer, reference, phone" />
        </Field>
        <Field label="Facility">
          <NativeSelect name="facility" defaultValue={params.facility ?? ""}>
            <option value="">All facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect name="status" defaultValue={params.status ?? ""}>
            <option value="">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </NativeSelect>
        </Field>
        <Field label="Date (schedule)">
          <Input type="date" name="date" defaultValue={params.date ?? ""} />
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" variant="outline">
            Apply
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/bookings">Reset</Link>
          </Button>
        </div>
      </form>

      {bookings.length ? (
        <div className="grid gap-3">
          {bookings.map((b) => {
            const parts = bookingSlotParts(b.start_time, b.end_time);
            const editable = b.phase === "upcoming" && !b.class_id;
            return (
              <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[1rem] font-medium text-ink">{b.facilityName}</p>
                    <StatusPill value={b.displayStatus} />
                    {b.class_id ? <Pill tone="energy">Class session</Pill> : null}
                    {b.walk_in_name ? <Pill tone="brandSoft">Walk-in</Pill> : null}
                  </div>
                  <p className="text-[0.82rem] text-subtle">
                    {formatDayLabel(b.start_time)} · {formatTimeOnly(b.start_time)} –{" "}
                    {formatTimeOnly(b.end_time)} · RM {b.total_price.toFixed(2)}
                  </p>
                  <p className="text-[0.75rem] text-subtle">
                    {b.class_id ? "Booked for a class" : (b.customerName ?? "Customer")}
                    {b.walk_in_phone ? ` · ${b.walk_in_phone}` : ""} · Ref {b.booking_reference}
                  </p>
                </div>
                <AdminBookingActions
                  bookingId={b.id}
                  label={`${b.facilityName}, ${formatDayLabel(b.start_time)} ${formatTimeOnly(b.start_time)}`}
                  facilities={options}
                  initial={{ facilityId: b.facility_id, date: parts.date, hours: parts.hours }}
                  today={today}
                  editable={editable}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title="No bookings found"
          description="Change the filters, or create a walk-in booking."
        />
      )}
    </div>
  );
}
