import Link from "next/link";
import { requireTrainerRecord } from "@/lib/trainer";
import {
  countActiveEnrollments,
  listTrainerClasses,
} from "@/lib/trainer";
import { PageHeader, EmptyState, StatBlock } from "@/components/ui/primitives";
import { ClassDialog } from "@/components/trainer/class-dialogs";
import { ClassStatusMenu } from "@/components/trainer/class-status-menu";
import { StatusPill } from "@/components/shared/status";
import { formatPrice } from "@/lib/utils";
import { perSessionPrice } from "@/lib/format";

export const metadata = { title: "My classes" };

export default async function MyClassesPage() {
  const { profile, trainer, supabase } = await requireTrainerRecord();
  void profile;

  const classes = await listTrainerClasses(supabase, trainer.id);

  const enrollmentCounts = await countActiveEnrollments(
    supabase,
    classes.map((c) => c.id),
  );
  const totalStudents = enrollmentCounts.get("__total__") ?? 0;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="My classes"
        subtitle={`${active_count(classes)} active · ${totalStudents} enrolled students`}
        slot={
          <ClassDialog
            mode="create"
            triggerLabel="New class"
            triggerVariant={classes.length ? "brand" : "subtle"}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBlock label="Classes" value={classes.length} tone="brand" />
        <StatBlock
          label="Active"
          value={active_count(classes)}
          hint="open for enrollments"
        />
        <StatBlock label="Students" value={totalStudents} hint="active enrollments" />
      </div>

      {classes.length ? (
        <div className="grid gap-2.5">
          {classes.map((cls) => {
            const students = enrollmentCounts.get(cls.id) ?? 0;
            const full = students >= cls.capacity;
            return (
              <div
                key={cls.id}
                className="surface group flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:border-brand/40"
              >
                <Link href={`/trainer/my-classes/${cls.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold text-ink group-hover:text-brand">
                    {cls.title}
                  </p>
                  <p className="mt-0.5 text-[0.76rem] text-subtle">
                    {cls.sport_type} ·{" "}
                    {formatPrice(cls.fee)}/month · {formatPrice(perSessionPrice(cls.fee, cls.sessions_per_month ?? 8))}/session · {students}/{cls.capacity} students
                    {full ? " · Full" : ""}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <StatusPill value={cls.difficulty_level} />
                  <StatusPill value={cls.status} />
                  <ClassStatusMenu classId={cls.id} status={cls.status} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="border-dashed"
          title="No classes yet"
          description="Create your first class to start accepting enrollments."
          action={
            <ClassDialog
              mode="create"
              triggerLabel="New class"
              triggerSize="sm"
            />
          }
        />
      )}
    </div>
  );
}

function active_count(classes: { status: string }[]) {
  return classes.filter((c) => c.status === "active").length;
}
