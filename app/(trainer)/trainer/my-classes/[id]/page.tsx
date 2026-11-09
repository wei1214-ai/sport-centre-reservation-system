import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTrainerRecord, listTrainerSessions } from "@/lib/trainer";
import { PageHeader, EmptyState, StatBlock, Pill } from "@/components/ui/primitives";
import { StatusPill } from "@/components/shared/status";
import { formatPrice } from "@/lib/utils";
import { formatDayLabel, formatTimeOnly, perSessionPrice } from "@/lib/format";
import { ClassDialog, type ClassFormValues } from "@/components/trainer/class-dialogs";
import { SessionDialog } from "@/components/trainer/session-dialogs";
import { ClassStatusMenu } from "@/components/trainer/class-status-menu";
import { listAvailableFacilities } from "@/lib/trainer";

export const metadata = { title: "Class details" };

export default async function ClassDetailPage({
  params,
}: PageProps<"/trainer/my-classes/[id]">) {
  const { id } = await params;
  const { trainer, supabase } = await requireTrainerRecord();

  const { data: cls } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("*")
    .eq("id", id)
    .eq("trainer_id", trainer.id)
    .maybeSingle();
  if (!cls) notFound();

  const facility = cls.facility_id
    ? (await supabase
        .schema("public")
        .from("facilities")
        .select("id, name, location, capacity, hourly_rate")
        .eq("id", cls.facility_id)
        .maybeSingle()).data
    : null;

  const enrollmentRes = await supabase
    .schema("public")
    .from("class_enrollments")
    .select("id, status")
    .eq("class_id", cls.id)
    .eq("status", "active");
  const students = enrollmentRes.data?.length ?? 0;

  const [sessions, facilities] = await Promise.all([
    listTrainerSessions(supabase, trainer.id, "upcoming"),
    listAvailableFacilities(supabase),
  ]);
  const classSessions = sessions.filter((s) => s.class_id === cls.id).slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/trainer/my-classes"
            className="text-[0.78rem] font-medium text-subtle transition-colors hover:text-ink"
          >
            ← My classes
          </Link>
          <PageHeader
            title={cls.title}
            subtitle={`${cls.sport_type} · ${cls.sessions_per_month ?? 8} sessions/month`}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <ClassStatusMenu classId={cls.id} status={cls.status} />
          <SessionDialog
            mode="create"
            classes={[{ id: cls.id, title: cls.title, status: cls.status }]}
            facilities={facilities.map((f) => ({ id: f.id, name: f.name, capacity: f.capacity, hourlyRate: f.hourly_rate }))}
            defaultClassId={cls.id}
            triggerLabel="Schedule session"
            triggerSize="sm"
          />
          <ClassDialog
            mode="edit"
            existing={{
              id: cls.id,
              title: cls.title,
              sportType: cls.sport_type as ClassFormValues["sportType"],
              description: cls.description ?? "",
              difficulty: cls.difficulty_level,
              capacity: cls.capacity,
              fee: cls.fee,
              sessionsPerMonth: cls.sessions_per_month ?? 8,
              status: cls.status === "archived" ? "archived" : "active",
            }}
            triggerLabel="Edit"
            triggerVariant="outline"
            triggerSize="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 md:grid-cols-4">
        <StatBlock
          label="Students"
          value={`${students}/${cls.capacity}`}
          hint={students >= cls.capacity ? "Class is full" : "active enrollments"}
          tone={students >= cls.capacity ? "energy" : "brand"}
        />
        <StatBlock
          label="Monthly fee"
          value={
            <span className="whitespace-nowrap">
              {formatPrice(cls.fee)}
              <span className="ml-1 text-[0.48em] font-normal tracking-normal text-subtle">
                /mo
              </span>
            </span>
          }
          hint={`${formatPrice(perSessionPrice(cls.fee, cls.sessions_per_month ?? 8))}/session`}
        />
        <StatBlock label="Sessions/mo" value={cls.sessions_per_month ?? 8} hint={`${formatPrice(perSessionPrice(cls.fee, cls.sessions_per_month ?? 8))} each`} />
        <StatBlock label="Difficulty" value={cls.difficulty_level[0].toUpperCase() + cls.difficulty_level.slice(1)} hint={cls.status} />
      </div>

      <section className="grid gap-3">
        <h2 className="section-title">About this class</h2>
        <div className="surface grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-subtle">
              Description
            </p>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-ink">
              {cls.description || "No description added yet."}
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-subtle">
              Venue
            </p>
            <p className="mt-1 text-[0.85rem] text-ink">{facility?.name ?? "Chosen per session"}</p>
            <p className="text-[0.76rem] text-subtle">
              {facility?.location ? `${facility.location} · ` : ""}
              {facility?.capacity ? `Seats ${facility.capacity} · ` : ""}
              {facility ? `${formatPrice(facility.hourly_rate)}/hour` : "Pick a facility when scheduling each session"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Upcoming sessions</h2>
          <Pill tone="neutral">{classSessions.length} shown</Pill>
        </div>
        {classSessions.length ? (
          <div className="grid gap-2.5">
            {classSessions.map((session) => (
              <div key={session.id} className="surface flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-[0.85rem] text-ink">
                  {formatDayLabel(session.start_time)} ·{" "}
                  {formatTimeOnly(session.start_time)} – {formatTimeOnly(session.end_time)}
                </p>
                <StatusPill value={session.session_status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="border-dashed"
            title="No upcoming sessions"
            description="Schedule the next session to keep this class running."
            action={<SessionDialog mode="create" classes={[{ id: cls.id, title: cls.title, status: cls.status }]} facilities={facilities.map((f) => ({ id: f.id, name: f.name, capacity: f.capacity, hourlyRate: f.hourly_rate }))} defaultClassId={cls.id} triggerLabel="Schedule session" triggerSize="sm" />}
          />
        )}
      </section>
    </div>
  );
}
