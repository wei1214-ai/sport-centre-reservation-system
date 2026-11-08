import { requireTrainerRecord, listTrainerSessions, listTrainerClasses } from "@/lib/trainer";
import { PageHeader, EmptyState, Pill } from "@/components/ui/primitives";
import { ClassSessionsList, type SessionRowData } from "@/components/trainer/class-sessions-list";
import { SessionDialog } from "@/components/trainer/session-dialogs";

export const metadata = { title: "Class sessions" };

export default async function ClassSessionsPage() {
  const { trainer, supabase } = await requireTrainerRecord();

  const [classes, sessionGroups, facilities] = await Promise.all([
    listTrainerClasses(supabase, trainer.id),
    listTrainerSessions(supabase, trainer.id, "upcoming").then(async (upcoming) => ({
      upcoming,
      past: await listTrainerSessions(supabase, trainer.id, "past"),
      cancelled: await listTrainerSessions(supabase, trainer.id, "cancelled"),
    })),
    supabase.schema("public").from("facilities").select("id, name, capacity, hourly_rate, status").eq("status", "available").order("name"),
  ]);

  const facilityNames = new Map(facilities.data?.map((f) => [f.id, f.name]) ?? []);
  const facilityOptions = (facilities.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    capacity: f.capacity,
    hourlyRate: f.hourly_rate,
  }));
  const activeClasses = classes
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, title: c.title, status: c.status }));

  const mapGroup = (rows: Awaited<ReturnType<typeof listTrainerSessions>>): SessionRowData[] =>
    rows.map((row) => ({
      id: row.id,
      start_time: row.start_time,
      end_time: row.end_time,
      session_status: row.session_status,
      classId: row.class_id,
      classTitle: row.classInfo?.title ?? "Class",
      facilityName: row.classInfo?.facility_id
        ? facilityNames.get(row.classInfo.facility_id) ?? null
        : null,
      facilityId: row.bookingFacilityId ?? row.classInfo?.facility_id ?? null,
    }));

  const groups = {
    upcoming: mapGroup(sessionGroups.upcoming),
    past: mapGroup(sessionGroups.past),
    cancelled: mapGroup(sessionGroups.cancelled),
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Class sessions"
        subtitle="Sessions reserve their facility — conflicts with bookings and maintenance are rejected server-side."
        slot={
          activeClasses.length ? (
            <SessionDialog mode="create" classes={activeClasses} facilities={facilityOptions} triggerLabel="Schedule session" />
          ) : (
            <Pill tone="neutral">Create a class first</Pill>
          )
        }
      />

      {classes.length ? (
        <ClassSessionsList groups={groups} classOptions={activeClasses} facilities={facilityOptions} />
      ) : (
        <EmptyState
          className="border-dashed"
          title="No classes yet"
          description="Create a class under My Classes, then schedule its sessions here."
        />
      )}
    </div>
  );
}
