import Link from "next/link";
import { notFound } from "next/navigation";

import { EnrollPanel } from "@/components/customer/enroll-panel";
import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/enrollment";
import { formatDayLabel, formatTimeOnly, perSessionPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Class details" };

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const detail = await getClassDetail(supabase, profile.id, id);
  if (!detail) notFound();
  const { card: c, sessions, trainerBio } = detail;

  return (
    <div className="grid gap-6">
      <Link href="/customer/classes" className="text-[0.78rem] font-medium text-subtle hover:text-ink">
        ← All classes
      </Link>
      <PageHeader
        title={c.title}
        subtitle={c.description ?? `${c.sport_type} class`}
        slot={
          <>
            <Pill tone="brandSoft">{c.sport_type}</Pill>
            <StatusPill value={c.difficulty_level} />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-4">
          <section className="surface grid gap-2 p-5">
            <h2 className="section-title">Trainer</h2>
            <p className="text-[0.95rem] font-medium text-ink">{c.trainerName ?? "To be announced"}</p>
            {c.specialization ? <p className="text-[0.8rem] text-subtle">{c.specialization}</p> : null}
            {trainerBio ? <p className="text-[0.82rem] text-subtle">{trainerBio}</p> : null}
          </section>

          <section className="surface grid gap-3 p-5">
            <h2 className="section-title">Upcoming sessions</h2>
            <p className="text-[0.78rem] text-subtle">
              {c.sessions_per_month} sessions per month · about RM{" "}
              {perSessionPrice(c.fee, c.sessions_per_month).toFixed(2)} per session
            </p>
            {sessions.length ? (
              sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-[0.88rem] text-ink">
                    {formatDayLabel(s.start_time)} · {formatTimeOnly(s.start_time)} –{" "}
                    {formatTimeOnly(s.end_time)}
                  </p>
                  <p className="text-[0.78rem] text-subtle">{s.facilityName ?? "Venue to be confirmed"}</p>
                </div>
              ))
            ) : (
              <p className="text-[0.85rem] text-subtle">No upcoming sessions have been scheduled yet.</p>
            )}
          </section>
        </div>

        {c.myStatus === "active" ? (
          <div className="surface grid content-start gap-3 p-5">
            <Pill tone="success" className="w-fit">
              You are enrolled
            </Pill>
            <p className="text-[0.85rem] text-subtle">Manage your fee and withdrawal from My classes.</p>
            <Button asChild variant="outline">
              <Link href="/customer/my-classes">Open my classes</Link>
            </Button>
          </div>
        ) : (
          <EnrollPanel classId={c.id} fee={c.fee} seatsLeft={c.seatsLeft} />
        )}
      </div>
    </div>
  );
}
