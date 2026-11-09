import { requireTrainerRecord } from "@/lib/trainer";
import { listAttendanceRoster, listTrainerClasses } from "@/lib/trainer";
import { PageHeader, EmptyState, Pill } from "@/components/ui/primitives";
import { LinkedSelects } from "@/components/trainer/attendance-selects";
import { AttendanceRow } from "@/components/trainer/attendance-row";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: PageProps<"/trainer/attendance">) {
  const params = await searchParams;
  const classParam = typeof params.class === "string" ? params.class : undefined;
  const sessionParam = typeof params.session === "string" ? params.session : undefined;

  const { profile, trainer, supabase } = await requireTrainerRecord();
  void profile;

  const classes = (await listTrainerClasses(supabase, trainer.id)).filter(
    (c) => c.status === "active",
  );
  const activeClasses = classes.filter((c) => c.status === "active");
  const selectedClassId = activeClasses.find((c) => c.id === classParam)?.id ?? activeClasses[0]?.id;

  if (!activeClasses.length || !selectedClassId) {
    return (
      <div className="grid gap-7">
        <PageHeader title="Attendance" subtitle="Mark attendance per session roster." />
        <EmptyState
          className="border-dashed"
          title="Nothing to record yet"
          description="Rosters appear once your class has active enrollments."
        />
      </div>
    );
  }

  const sessionQuery = await supabase
    .schema("public")
    .from("class_sessions")
    .select("id, start_time, end_time, session_status")
    .eq("class_id", selectedClassId)
    .in("session_status", ["scheduled", "completed"])
    .order("start_time", { ascending: false })
    .limit(30);

  const sessionOptions = sessionQuery.data ?? [];
  const selectedSessionId =
    sessionOptions.find((s) => s.id === sessionParam)?.id ?? sessionOptions[0]?.id;

  if (!selectedSessionId) {
    return (
      <div className="grid gap-7">
        <PageHeader title="Attendance" subtitle="Mark attendance per session roster." />
        <EmptyState
          className="border-dashed"
          title="No sessions for this class"
          description="Schedule a class session first — attendance is marked per roster and per session."
        />
      </div>
    );
  }

  const { session, roster } = await listAttendanceRoster(supabase, selectedSessionId, selectedClassId);

  const counts = roster.reduce(
    (acc, row) => {
      acc[row.attendanceStatus ?? "not_marked"] += 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Attendance"
        subtitle="Pick a class and session, then mark each student."
        slot={
          <div className="flex items-center gap-1.5">
            <Pill tone="success">{counts.present ?? 0} present</Pill>
            <Pill tone="warning">{counts.late ?? 0} late</Pill>
            <Pill tone="danger">{counts.absent ?? 0} absent</Pill>
          </div>
        }
      />

      <LinkedSelects
        selects={[
          {
            searchParam: "class",
            label: "Class",
            value: selectedClassId,
            options: activeClasses.map((c) => ({ value: c.id, label: c.title })),
          },
          {
            searchParam: "session",
            label: "Session",
            value: selectedSessionId,
            options: sessionOptions.map((s) => ({
              value: s.id,
              label: `${formatDayLabel(s.start_time)} · ${formatTimeOnly(s.start_time)} (${s.session_status})`,
            })),
          },
        ]}
      />

      {session ? (
        <div className="surface flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <p className="text-[0.88rem] font-semibold text-ink">{session.classInfo?.title}</p>
            <p className="text-[0.76rem] text-subtle">
              {formatDayLabel(session.start_time)} · {formatTimeOnly(session.start_time)} –{" "}
              {formatTimeOnly(session.end_time)}
            </p>
          </div>
          <Pill tone="neutral">{roster.length} enrolled</Pill>
        </div>
      ) : null}

      {roster.length ? (
        <div className="grid gap-2">
          {roster.map((row) => (
            <AttendanceRow
              key={row.enrollment.id}
              sessionId={selectedSessionId}
              enrollmentId={row.enrollment.id}
              name={row.customerName}
              email={row.customerEmail}
              current={(row.attendanceStatus ?? "not_marked") as "present" | "absent" | "late" | "not_marked"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="border-dashed"
          title="No active enrollments"
          description="Students appear on the roster once they enroll in this class."
        />
      )}
    </div>
  );
}
