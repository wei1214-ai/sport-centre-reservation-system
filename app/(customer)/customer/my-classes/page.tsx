import Link from "next/link";
import { BookMarked } from "lucide-react";

import { ClassEnrollmentActions } from "@/components/customer/class-enrollment-actions";
import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { listMyEnrollments } from "@/lib/enrollment";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "My classes" };

const VIEWS = [
  { value: "active", label: "Active" },
  { value: "past", label: "Withdrawn / completed" },
  { value: "all", label: "All" },
] as const;

export default async function CustomerMyClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view = rawView === "past" || rawView === "all" ? rawView : "active";
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const enrollments = await listMyEnrollments(supabase, profile.id, view);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My classes"
        subtitle="Classes you have joined, with their trainer, next session and monthly fee."
        slot={
          <Button asChild>
            <Link href="/customer/classes">Find more classes</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/customer/my-classes?view=${v.value}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[0.8rem] font-medium transition-colors",
              view === v.value ? "border-ink bg-ink text-white" : "border-line bg-white/70 text-ink hover:bg-white",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {enrollments.length ? (
        <div className="grid gap-3">
          {enrollments.map((e) => (
            <div key={e.enrollment.id} className="surface grid gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/customer/classes/${e.cls.id}`}
                      className="text-[1.05rem] font-medium text-ink hover:underline"
                    >
                      {e.cls.title}
                    </Link>
                    <StatusPill value={e.enrollment.status} />
                  </div>
                  <p className="text-[0.8rem] text-subtle">
                    {e.cls.sport_type} · {e.trainerName ? `with ${e.trainerName}` : "Trainer TBA"} · RM{" "}
                    {e.cls.fee.toFixed(2)} / month
                  </p>
                  {e.enrollment.status === "active" ? (
                    <p className="text-[0.8rem] text-subtle">
                      {e.nextSession
                        ? `Next session: ${formatDayLabel(e.nextSession.start_time)} ${formatTimeOnly(
                            e.nextSession.start_time,
                          )}${e.nextSession.facilityName ? ` · ${e.nextSession.facilityName}` : ""}`
                        : "No upcoming sessions scheduled"}
                    </p>
                  ) : null}
                </div>
                {e.enrollment.status === "active" ? (
                  <ClassEnrollmentActions
                    enrollmentId={e.enrollment.id}
                    className={e.cls.title}
                    canPay={e.canPay}
                    fee={e.cls.fee}
                  />
                ) : null}
              </div>
              {e.enrollment.status === "active" ? (
                <p className={cn("text-[0.78rem]", e.overdue ? "font-medium text-danger" : "text-subtle")}>
                  {e.overdue
                    ? `Monthly fee overdue since ${formatDayLabel(e.dueDate)} — pay now or you may be removed.`
                    : `Next monthly fee due ${formatDayLabel(e.dueDate)}.`}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookMarked className="size-6" />}
          title="No classes here yet"
          description="Browse classes and enrol to see them in this list."
          action={
            <Button asChild size="sm">
              <Link href="/customer/classes">Browse classes</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
