import Link from "next/link";
import { ArrowUpRight, Building2, Clock, MapPin, Users } from "lucide-react";

import { Pill } from "@/components/ui/primitives";
import {
  formatOperatingHours,
  type FacilityAvailability,
} from "@/lib/facilities";
import { formatPrice } from "@/lib/utils";
import type { Facility } from "@/types/database";

export function FacilityCard({
  facility,
  availability,
}: {
  facility: Facility;
  availability: FacilityAvailability;
}) {
  return (
    <Link
      href={`/facilities/${facility.id}`}
      className="surface group flex min-h-[16rem] flex-col gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(12,12,13,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Building2 className="size-5" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Pill tone={availability.tone}>{availability.label}</Pill>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-[1rem] font-semibold tracking-[-0.02em] text-ink">
          {facility.name}
        </h3>
        <p className="mt-0.5 truncate text-[0.78rem] text-subtle">
          {facility.facility_type}
          {facility.location ? ` · ${facility.location}` : ""}
        </p>
      </div>

      {facility.description ? (
        <p className="line-clamp-2 text-[0.8rem] leading-relaxed text-subtle">
          {facility.description}
        </p>
      ) : null}

      <dl className="grid gap-1.5 text-[0.79rem] text-subtle">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0 text-ink/45" />
          <dt className="sr-only">Capacity</dt>
          <dd>{facility.capacity ? `Up to ${facility.capacity} people` : "Capacity not set"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0 text-ink/45" />
          <dt className="sr-only">Operating hours</dt>
          <dd>Daily {formatOperatingHours(facility)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-ink/45" />
          <dt className="sr-only">Price per hour</dt>
          <dd>
            {formatPrice(facility.hourly_rate)} per hour
            {facility.location ? ` · ${facility.location}` : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
        <p className="min-w-0 truncate text-[0.76rem] text-subtle">{availability.detail}</p>
        <span className="ghost-link inline-flex shrink-0 items-center gap-1 text-[0.79rem]">
          Details
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
