import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { BookingRowActions } from "@/components/customer/booking-row-actions";
import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/form-fields";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import {
  bookingSlotParts,
  listMyBookings,
  normalizeBookingView,
  toFacilityOption,
  todayLocal,
} from "@/lib/booking";
import { requireRole } from "@/lib/auth";
import { listFacilities } from "@/lib/facilities";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "My bookings" };

const VIEWS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; facility?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const view = normalizeBookingView(params.view);
  const sort = params.sort === "latest" ? "latest" : "soonest";
  const facilityId = params.facility ?? "";

  const [bookings, { facilities }] = await Promise.all([
    listMyBookings(supabase, profile.id, { view, facilityId: facilityId || undefined, sort }),
    listFacilities(supabase),
  ]);
  const facilityMap = new Map(facilities.map((f) => [f.id, toFacilityOption(f)]));
  const today = todayLocal();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My bookings"
        subtitle="View, reschedule or cancel your facility reservations."
        slot={
          <Button asChild>
            <Link href="/facilities">New booking</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/customer/bookings?view=${v.value}&sort=${sort}${facilityId ? `&facility=${facilityId}` : ""}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[0.8rem] font-medium transition-colors",
              view === v.value ? "border-ink bg-ink text-white" : "border-line bg-white/70 text-ink hover:bg-white",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <form className="surface flex flex-wrap items-end gap-3 p-4">
        <input type="hidden" name="view" value={view} />
        <Field label="Facility" className="min-w-48">
          <NativeSelect name="facility" defaultValue={facilityId}>
            <option value="">All facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Sort by" className="min-w-44">
          <NativeSelect name="sort" defaultValue={sort}>
            <option value="soonest">Soonest first</option>
            <option value="latest">Latest first</option>
          </NativeSelect>
        </Field>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      {bookings.length ? (
        <div className="grid gap-3">
          {bookings.map((b) => {
            const facility = facilityMap.get(b.facility_id);
            const parts = bookingSlotParts(b.start_time, b.end_time);
            const label = `${b.facilityName}, ${formatDayLabel(b.start_time)} ${formatTimeOnly(b.start_time)}`;
            return (
              <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[1rem] font-medium text-ink">{b.facilityName}</p>
                    <StatusPill value={b.displayStatus} />
                  </div>
                  <p className="text-[0.82rem] text-subtle">
                    {formatDayLabel(b.start_time)} · {formatTimeOnly(b.start_time)} –{" "}
                    {formatTimeOnly(b.end_time)} · RM {b.total_price.toFixed(2)}
                  </p>
                  <p className="text-[0.72rem] text-subtle">Ref {b.booking_reference}</p>
                </div>
                {b.phase === "upcoming" && facility ? (
                  <BookingRowActions
                    bookingId={b.id}
                    facility={facility}
                    date={parts.date}
                    startHour={parts.startHour}
                    hours={parts.hours}
                    minDate={today}
                    label={label}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title="No bookings here"
          description="Bookings you make will appear in this list."
          action={
            <Button asChild size="sm">
              <Link href="/facilities">Browse facilities</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
