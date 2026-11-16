import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { DeleteFacilityDialog } from "@/components/facilities/delete-facility-dialog";
import { FacilityDialog } from "@/components/facilities/facility-dialog";
import { FacilityStatusMenu } from "@/components/facilities/facility-status-menu";
import { StatusPill } from "@/components/shared/status";
import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { requireActiveProfile } from "@/lib/auth";
import {
  formatOperatingHours,
  formatScheduleWhen,
  getActiveBookingEnd,
  getFacilityAvailability,
  getFacilityById,
  listFacilitySchedule,
  toTimeInput,
} from "@/lib/facilities";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import type { FacilityScheduleEntry } from "@/lib/facilities";

export const metadata = { title: "Facility details" };

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KIND_META: Record<
  FacilityScheduleEntry["kind"],
  { label: string; tone: "brandSoft" | "neutral" | "warning" }
> = {
  class: { label: "Class", tone: "brandSoft" },
  booking: { label: "Booking", tone: "neutral" },
  maintenance: { label: "Maintenance", tone: "warning" },
};

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-page/60 p-4">
      <p className="text-[0.66rem] font-medium uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
      <p className="mt-1 text-[0.9rem] font-medium text-ink">{value}</p>
    </div>
  );
}

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();

  const profile = await requireActiveProfile();
  const supabase = await createSupabaseServerClient();

  const facility = await getFacilityById(supabase, id);
  if (!facility) notFound();

  const [activeEnd, schedule] = await Promise.all([
    getActiveBookingEnd(supabase, facility.id),
    listFacilitySchedule(supabase, facility.id),
  ]);

  const availability = getFacilityAvailability(facility, activeEnd);
  const isAdmin = profile.role === "admin";

  const editable = {
    id: facility.id,
    name: facility.name,
    facilityType: facility.facility_type,
    description: facility.description ?? "",
    location: facility.location ?? "",
    capacity: facility.capacity ?? 1,
    hourlyRate: facility.hourly_rate,
    openingTime: toTimeInput(facility.opening_time),
    closingTime: toTimeInput(facility.closing_time),
    status: facility.status,
  };

  return (
    <div className="grid gap-5">
      <Link
        href="/facilities"
        className="inline-flex w-fit items-center gap-1 text-[0.8rem] font-medium text-subtle transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        All facilities
      </Link>

      <PageHeader
        title={facility.name}
        subtitle={`${facility.facility_type}${facility.location ? ` · ${facility.location}` : ""}`}
        slot={
          isAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FacilityDialog
                mode="edit"
                existing={editable}
                triggerLabel="Edit"
                triggerVariant="outline"
              />
              <FacilityStatusMenu facilityId={facility.id} status={facility.status} />
              <DeleteFacilityDialog
                facilityId={facility.id}
                facilityName={facility.name}
              />
            </div>
          ) : (
            <StatusPill value={facility.status} />
          )
        }
      />

      <div
        className={
          availability.key === "maintenance"
            ? "surface flex flex-wrap items-center justify-between gap-3 border-warning/25 bg-warning-soft/40 p-4"
            : "surface flex flex-wrap items-center justify-between gap-3 p-4"
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            {availability.key === "available" ? (
              <Check className="size-5" />
            ) : availability.key === "maintenance" ? (
              <Wrench className="size-5" />
            ) : (
              <Clock className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.94rem] font-semibold text-ink">{availability.label}</p>
            <p className="text-[0.8rem] leading-relaxed text-subtle">{availability.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="neutral">{formatOperatingHours(facility)}</Pill>
          <StatusPill value={facility.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface grid content-start gap-4 p-5">
          <h2 className="section-title">About this facility</h2>
          <p className="text-[0.85rem] leading-relaxed text-subtle">
            {facility.description?.trim() ||
              "No description has been added for this facility yet."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem
              label="Price per hour"
              value={`${formatPrice(facility.hourly_rate)} / hour`}
            />
            <InfoItem
              label="Capacity"
              value={facility.capacity ? `Up to ${facility.capacity} people` : "Not set"}
            />
            <InfoItem
              label="Operating hours"
              value={`Daily ${formatOperatingHours(facility)}`}
            />
            <InfoItem
              label="Location"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-subtle" />
                  {facility.location || "Not set"}
                </span>
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3 text-[0.76rem] text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {facility.facility_type}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              Pay per hour
            </span>
          </div>

          {isAdmin ? (
            <p className="rounded-2xl bg-warning-soft/60 px-4 py-3 text-[0.76rem] leading-relaxed text-warning">
              Setting this facility to under maintenance removes it from trainer
              scheduling and stops new bookings until it is marked available again.
            </p>
          ) : null}
        </section>

        <section className="surface grid content-start gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Upcoming schedule</h2>
            <Pill tone="neutral">Next 14 days</Pill>
          </div>

          {schedule.failed ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              The schedule could not be loaded right now. Please refresh the page.
            </p>
          ) : schedule.entries.length ? (
            <ul className="grid gap-2">
              {schedule.entries.map((entry) => {
                const meta = KIND_META[entry.kind];
                return (
                  <li
                    key={`${entry.kind}-${entry.id}`}
                    className="rounded-2xl border border-line bg-page/50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[0.85rem] font-medium text-ink">
                          {entry.title}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-subtle">
                          {formatScheduleWhen(entry.start, entry.end)}
                          {entry.reference ? ` · ${entry.reference}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                        {entry.kind !== "maintenance" ? (
                          <StatusPill value={entry.status} />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="border-dashed"
              title="No upcoming bookings"
              description="Nothing is scheduled for this facility in the next 14 days."
            />
          )}

          <p className="text-[0.73rem] leading-relaxed text-subtle">
            The schedule combines customer bookings, class sessions and maintenance
            windows. Cancelled bookings are not shown.
          </p>
        </section>
      </div>
    </div>
  );
}
