import Link from "next/link";
import { Bell, CalendarCheck, Dumbbell } from "lucide-react";

import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatBlock } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { listMyBookings } from "@/lib/booking";
import { listMyEnrollments, listTimetableItems, upcomingItems } from "@/lib/enrollment";
import { formatDayLabel, formatTimeOnly, relativeFromNow } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Customer home" };

export default async function CustomerHomePage() {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const [bookings, enrollments, timetable, notifications] = await Promise.all([
    listMyBookings(supabase, profile.id, { view: "upcoming", sort: "soonest" }),
    listMyEnrollments(supabase, profile.id, "active"),
    listTimetableItems(supabase, profile.id),
    supabase
      .schema("public")
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const sessions = upcomingItems(timetable, "class").slice(0, 4);
  const next = [...bookings.map((b) => b.start_time), ...sessions.map((s) => s.start)].sort()[0];
  const dueSoon = enrollments.filter((e) => e.canPay);
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="grid gap-7">
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle="Your upcoming bookings, classes and reminders in one place."
        slot={
          <Button asChild>
            <Link href="/facilities">Book a facility</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBlock label="Upcoming bookings" value={bookings.length} hint="Facility reservations" />
        <StatBlock label="Active classes" value={enrollments.length} hint="Classes you have joined" />
        <StatBlock
          label="Next activity"
          value={next ? formatDayLabel(next) : "—"}
          hint={next ? `${formatTimeOnly(next)} · ${relativeFromNow(next)}` : "Nothing scheduled"}
        />
      </div>

      {dueSoon.length ? (
        <div className="rounded-2xl bg-warning-soft px-4 py-3 text-[0.85rem] text-warning">
          {dueSoon.length === 1
            ? `The monthly fee for ${dueSoon[0].cls.title} is due ${formatDayLabel(dueSoon[0].dueDate)}.`
            : `${dueSoon.length} class fees are due soon.`}{" "}
          <Link href="/customer/my-classes" className="font-medium underline">
            Pay now
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface grid content-start gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Upcoming bookings</h2>
            <Link href="/customer/bookings" className="text-[0.8rem] text-subtle hover:text-ink">
              View all
            </Link>
          </div>
          {bookings.length ? (
            bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-[0.9rem] font-medium text-ink">{b.facilityName}</p>
                  <p className="text-[0.78rem] text-subtle">
                    {formatDayLabel(b.start_time)} · {formatTimeOnly(b.start_time)} –{" "}
                    {formatTimeOnly(b.end_time)}
                  </p>
                </div>
                <StatusPill value={b.displayStatus} />
              </div>
            ))
          ) : (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title="No upcoming bookings"
              description="Pick a facility and reserve a time slot."
              action={
                <Button asChild size="sm">
                  <Link href="/facilities">Browse facilities</Link>
                </Button>
              }
            />
          )}
        </section>

        <section className="surface grid content-start gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Upcoming class sessions</h2>
            <Link href="/customer/timetable" className="text-[0.8rem] text-subtle hover:text-ink">
              Timetable
            </Link>
          </div>
          {sessions.length ? (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-[0.9rem] font-medium text-ink">{s.title}</p>
                  <p className="text-[0.78rem] text-subtle">
                    {formatDayLabel(s.start)} · {formatTimeOnly(s.start)} · {s.facility}
                  </p>
                </div>
                <StatusPill value={s.status} />
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Dumbbell className="size-6" />}
              title="No class sessions yet"
              description="Join a class to see its sessions here."
              action={
                <Button asChild size="sm">
                  <Link href="/customer/classes">Find a class</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>

      <section className="surface grid content-start gap-3 p-5">
        <h2 className="section-title">Reminders &amp; notifications</h2>
        {notifications.data?.length ? (
          notifications.data.map((n) => (
            <div key={n.id} className="flex items-start gap-3 border-t border-line pt-3">
              <Bell className="mt-0.5 size-4 text-subtle" />
              <div>
                <p className="text-[0.85rem] font-medium text-ink">{n.title}</p>
                <p className="text-[0.78rem] text-subtle">{n.message}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[0.85rem] text-subtle">No notifications yet.</p>
        )}
      </section>
    </div>
  );
}
