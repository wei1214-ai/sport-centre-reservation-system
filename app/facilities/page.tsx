import Link from "next/link";
import { Building2, CalendarClock, SearchX, Wrench } from "lucide-react";

import { FacilityCard } from "@/components/facilities/facility-card";
import { FacilityDialog } from "@/components/facilities/facility-dialog";
import { FacilityFilters } from "@/components/facilities/facility-filters";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pill, StatBlock } from "@/components/ui/primitives";
import { requireActiveProfile } from "@/lib/auth";
import {
  getActiveBookingEnds,
  getFacilityAvailability,
  listFacilities,
  normalizeFacilityStatus,
} from "@/lib/facilities";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Facilities" };

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[] }>;

function single(value?: string | string[]): string {
  return typeof value === "string" ? value : "";
}

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const query = single(params.q);
  const rawStatus = single(params.status);
  const status = normalizeFacilityStatus(rawStatus) ?? "";
  const supabase = await createSupabaseServerClient();

  const [filtered, all, activeEnds] = await Promise.all([
    listFacilities(supabase, { query, status }),
    listFacilities(supabase),
    getActiveBookingEnds(supabase),
  ]);

  const isAdmin = profile.role === "admin";

  const availabilityOf = (facility: (typeof all.facilities)[number]) =>
    getFacilityAvailability(facility, activeEnds.get(facility.id));

  const allAvailability = all.facilities.map((facility) => availabilityOf(facility));
  const availableNow = allAvailability.filter((item) => item.key === "available").length;
  const inUseNow = allAvailability.filter((item) => item.key === "in_use").length;
  const underMaintenance = all.facilities.filter(
    (facility) => facility.status === "maintenance",
  ).length;

  const failed = filtered.failed || all.failed;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Facilities"
        subtitle="Browse the courts, pool and studios, check today's availability and see prices and operating hours."
        slot={
          isAdmin ? (
            <FacilityDialog mode="create" triggerLabel="Add facility" />
          ) : (
            <Pill tone="neutral">Live availability</Pill>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Facilities" value={all.facilities.length} hint="in the catalogue" />
        <StatBlock
          label="Available now"
          value={availableNow}
          hint="open and free"
          tone="brandSoft"
        />
        <StatBlock
          label="In use now"
          value={inUseNow}
          hint="current bookings"
          tone={inUseNow ? "brand" : "neutral"}
        />
        <StatBlock
          label="Under maintenance"
          value={underMaintenance}
          hint="temporarily closed"
          tone={underMaintenance ? "warning" : "neutral"}
        />
      </div>

      <FacilityFilters
        key={`${query}|${status}`}
        initialQuery={query}
        activeStatus={status}
        resultCount={filtered.facilities.length}
      />

      {failed ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          Facilities could not be loaded right now. Please refresh the page and try
          again.
        </p>
      ) : null}

      {filtered.facilities.length ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              availability={availabilityOf(facility)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="border-dashed"
          icon={
            query || status ? (
              <SearchX className="size-6" />
            ) : (
              <Building2 className="size-6" />
            )
          }
          title={
            query || status
              ? "No facilities match your search"
              : "No facilities yet"
          }
          description={
            query || status
              ? "Try a different name, type or location, or clear the filters."
              : isAdmin
                ? "Add the first facility so customers and trainers can see it."
                : "The centre has not published any facilities yet."
          }
          action={
            query || status ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/facilities">Clear filters</Link>
              </Button>
            ) : isAdmin ? (
              <FacilityDialog
                mode="create"
                triggerLabel="Add facility"
                triggerSize="sm"
              />
            ) : undefined
          }
        />
      )}

      {isAdmin && all.facilities.length ? (
        <p className="flex items-center gap-2 text-[0.76rem] text-subtle">
          <Wrench className="size-3.5" />
          Marking a facility under maintenance removes it from trainer scheduling
          and customer booking immediately.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[0.76rem] text-subtle">
          <CalendarClock className="size-3.5" />
          Availability reflects the facility status, operating hours and confirmed
          bookings.
        </p>
      )}
    </div>
  );
}
