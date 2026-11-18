import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-fields";
import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { listBrowsableClasses } from "@/lib/enrollment";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Classes" };

export default async function BrowseClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sport?: string;
    difficulty?: string;
    availability?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const { classes, sports } = await listBrowsableClasses(supabase, profile.id, params);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Classes"
        subtitle="Find a sports class that matches your goals, then enrol with your monthly fee."
      />

      <form className="surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Search" className="lg:col-span-2">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Class, sport or trainer" />
        </Field>
        <Field label="Sport">
          <NativeSelect name="sport" defaultValue={params.sport ?? ""}>
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Level">
          <NativeSelect name="difficulty" defaultValue={params.difficulty ?? ""}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </NativeSelect>
        </Field>
        <Field label="Seats">
          <NativeSelect name="availability" defaultValue={params.availability ?? ""}>
            <option value="">Show all</option>
            <option value="open">Seats available</option>
          </NativeSelect>
        </Field>
        <Field label="Sort by">
          <NativeSelect name="sort" defaultValue={params.sort ?? ""}>
            <option value="">Newest</option>
            <option value="soonest">Next session</option>
            <option value="fee_low">Fee: low to high</option>
            <option value="fee_high">Fee: high to low</option>
            <option value="seats">Most seats left</option>
          </NativeSelect>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Apply
          </Button>
          <Button asChild variant="ghost">
            <Link href="/customer/classes">Reset</Link>
          </Button>
        </div>
      </form>

      {classes.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="surface grid content-between gap-4 p-5">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="brandSoft">{c.sport_type}</Pill>
                  <StatusPill value={c.difficulty_level} />
                  {c.myStatus === "active" ? <Pill tone="success">Enrolled</Pill> : null}
                </div>
                <p className="text-[1.05rem] font-medium text-ink">{c.title}</p>
                <p className="text-[0.8rem] text-subtle">
                  {c.trainerName ? `with ${c.trainerName}` : "Trainer to be announced"}
                </p>
                <p className="text-[0.8rem] text-subtle">
                  {c.nextSession
                    ? `Next: ${formatDayLabel(c.nextSession)} ${formatTimeOnly(c.nextSession)}`
                    : "No upcoming sessions"}{" "}
                  · {c.sessions_per_month} sessions / month
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.95rem] font-medium text-ink">RM {c.fee.toFixed(2)} / month</p>
                  <p className="text-[0.72rem] text-subtle">
                    {c.seatsLeft > 0 ? `${c.seatsLeft} of ${c.capacity} seats left` : "Class full"}
                  </p>
                </div>
                <Button asChild size="sm" variant={c.myStatus === "active" ? "outline" : "brand"}>
                  <Link href={`/customer/classes/${c.id}`}>
                    {c.myStatus === "active" ? "View" : c.seatsLeft > 0 ? "View & enrol" : "View"}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Dumbbell className="size-6" />}
          title="No classes found"
          description="Try changing the filters, or check back when trainers publish new classes."
        />
      )}
    </div>
  );
}
