import { requireTrainerContext } from "@/lib/trainer";
import {
  countActiveEnrollments,
  listTrainerClasses,
  listTrainerInquiries,
  listTrainerSessions,
} from "@/lib/trainer";
import { listCustomerProfileLabels } from "@/lib/trainer";
import { PageHeader, Pill, StatBlock, EmptyState } from "@/components/ui/primitives";
import { ClassDialog } from "@/components/trainer/class-dialogs";
import { StatusPill } from "@/components/shared/status";
import { listAvailableFacilities } from "@/lib/trainer";
import { formatDayLabel, formatTimeOnly, formatDateTime, perSessionPrice } from "@/lib/format";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Trainer home" };

export default async function TrainerHomePage() {
  const { profile, trainer, supabase } = await requireTrainerContext();

  if (!trainer) {
    return (
      <div className="grid gap-5">
        <PageHeader title={`Welcome, ${profile.full_name.split(" ")[0]}`} subtitle="Trainer workspace" />
        <EmptyState
          title="Trainer profile missing"
          description="Your trainer record has not been set up yet. Contact an administrator so classes, sessions and attendance can be enabled for you."
        />
      </div>
    );
  }

  const [classes, facilities] = await Promise.all([
    listTrainerClasses(supabase, trainer.id),
    listAvailableFacilities(supabase),
  ]);

  const classIds = classes.map((c) => c.id);
  const enrollmentCounts = await countActiveEnrollments(supabase, classIds);
  const totalStudents = enrollmentCounts.get("__total__") ?? 0;

  const [upcomingSessions, inquiries] = await Promise.all([
    listTrainerSessions(supabase, trainer.id, "upcoming"),
    listTrainerInquiries(supabase, trainer.id),
  ]);

  const customerLabels = await listCustomerProfileLabels(
    supabase,
    inquiries.slice(0, 6).map((i) => i.customer_id),
  );

  const activeClasses = classes.filter((c) => c.status === "active");
  const openInquiries = inquiries.filter((i) => i.inquiry_status === "open");

  const facilityNames = new Map(facilities.map((f) => [f.id, f.name]));

  return (
    <div className="grid gap-5">
      <PageHeader
        title={`Welcome back, ${profile.full_name.split(" ")[0]}`}
        subtitle="Your classes, sessions and customer conversations at a glance."
        slot={
          <div className="hidden sm:block">
            <ClassDialog
              mode="create"
              triggerLabel="New class"
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Active classes" value={activeClasses.length} hint={`of ${classes.length} total`} tone="brand" />
        <StatBlock label="Upcoming sessions" value={upcomingSessions.length} hint="scheduled" tone="brandSoft" />
        <StatBlock label="Enrolled students" value={totalStudents} hint="active enrollments" />
        <StatBlock label="Open inquiries" value={openInquiries.length} hint="awaiting reply" tone={openInquiries.length ? "energy" : "neutral"} />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Next sessions</h2>
          <Pill tone="neutral">{upcomingSessions.length} scheduled</Pill>
        </div>
        {upcomingSessions.length ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {upcomingSessions.slice(0, 4).map((session) => (
              <div key={session.id} className="surface flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-semibold text-ink">
                    {session.classInfo?.title ?? "Session"}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-subtle">
                    {formatDayLabel(session.start_time)} ·{" "}
                    {formatTimeOnly(session.start_time)} –{" "}
                    {formatTimeOnly(session.end_time)}
                    {session.classInfo?.facility_id
                      ? ` · ${facilityNames.get(session.classInfo.facility_id) ?? ""}`
                      : ""}
                  </p>
                </div>
                <StatusPill value={session.session_status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="border-dashed"
            title="No upcoming sessions"
            description="Schedule the next class session from Class Sessions."
          />
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Your classes</h2>
          <Pill tone="neutral">{classes.length}</Pill>
        </div>
        {classes.length ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {classes.map((cls) => (
              <div key={cls.id} className="surface flex items-start justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[0.92rem] font-semibold text-ink">{cls.title}</p>
                  <p className="mt-0.5 text-[0.76rem] text-subtle">
                    {cls.sport_type} ·{" "}
                    {enrollmentCounts.get(cls.id) ?? 0}/{cls.capacity} students · {formatPrice(cls.fee)}/month · {formatPrice(perSessionPrice(cls.fee, cls.sessions_per_month ?? 8))}/session
                  </p>
                </div>
                <StatusPill value={cls.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="border-dashed"
            title="No classes yet"
            description="Create your first class to start taking enrollments."
            action={<ClassDialog mode="create" triggerLabel="New class" triggerSize="sm" />}
          />
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent inquiries</h2>
          <Pill tone="energy">{openInquiries.length} open</Pill>
        </div>
        {inquiries.length ? (
          <div className="grid gap-2.5">
            {inquiries.slice(0, 3).map((inquiry) => {
              const customer = customerLabels.get(inquiry.customer_id);
              return (
                <div key={inquiry.id} className="surface flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.88rem] font-semibold text-ink">{inquiry.subject}</p>
                    <p className="mt-0.5 truncate text-[0.76rem] text-subtle">
                      {inquiry.classTitle ?? "Class"} · {customer?.full_name ?? "Customer"} ·{" "}
                      {formatDateTime(inquiry.created_at)}
                    </p>
                  </div>
                  <StatusPill value={inquiry.inquiry_status} />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            className="border-dashed"
            title="No inquiries yet"
            description="Questions from customers arrive here before they enroll."
          />
        )}
      </section>
    </div>
  );
}
