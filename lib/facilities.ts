import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { FACILITY_STATUSES } from "@/lib/constants";
import { formatDayLabel, formatTimeOnly, localTimePart } from "@/lib/format";
import type { Database, Facility, FacilityStatus } from "@/types/database";

/**
 * Facility read helpers.
 *
 * The facility catalogue is shared by admins, trainers and customers, so these
 * helpers take an already-authenticated Supabase client and never assume a
 * particular role.
 */

export type FacilityAvailabilityKey =
  | "available"
  | "in_use"
  | "maintenance"
  | "unavailable"
  | "closed";

export type FacilityAvailability = {
  key: FacilityAvailabilityKey;
  label: string;
  detail: string;
  tone: "success" | "warning" | "neutral" | "brandSoft";
};

export type FacilityScheduleEntry = {
  id: string;
  kind: "booking" | "class" | "maintenance";
  title: string;
  start: string;
  end: string;
  status: string;
  reference?: string | null;
};

/* ------------------------------ Formatting ------------------------------- */

/** "08:00:00" / "08:00" → "08:00". Returns an em dash for missing values. */
export function formatClock(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

/** Safe value for `<input type="time">`; empty when the column is missing. */
export function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

/** Daily operating window, e.g. "08:00 – 23:00". */
export function formatOperatingHours(
  facility: Pick<Facility, "opening_time" | "closing_time">,
): string {
  return `${formatClock(facility.opening_time)} – ${formatClock(facility.closing_time)}`;
}

/** Human label for the schedule's day + time range. */
export function formatScheduleWhen(start: string, end: string): string {
  return `${formatDayLabel(start)} · ${formatTimeOnly(start)} – ${formatTimeOnly(end)}`;
}

function clockMinutes(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
  return hours * 60 + minutes;
}

/* ------------------------------ Availability ----------------------------- */

/**
 * Current availability combines the stored status, today's operating window
 * and any booking running right now. It is intentionally computed in the
 * centre's timezone so it matches what the front desk sees.
 */
export function getFacilityAvailability(
  facility: Pick<Facility, "status" | "opening_time" | "closing_time">,
  activeBookingEnd?: string | null,
): FacilityAvailability {
  const opens = formatClock(facility.opening_time);
  const closes = formatClock(facility.closing_time);

  if (facility.status === "maintenance") {
    return {
      key: "maintenance",
      label: "Under maintenance",
      detail: "Closed for maintenance. It cannot be booked until the status is set back to available.",
      tone: "warning",
    };
  }

  if (facility.status === "unavailable") {
    return {
      key: "unavailable",
      label: "Unavailable",
      detail: "This facility is not open for booking right now.",
      tone: "neutral",
    };
  }

  if (activeBookingEnd) {
    return {
      key: "in_use",
      label: "In use",
      detail: `Booked until ${formatTimeOnly(activeBookingEnd)}.`,
      tone: "brandSoft",
    };
  }

  const now = clockMinutes(localTimePart(new Date()));
  const opening = clockMinutes(facility.opening_time);
  const closing = clockMinutes(facility.closing_time);

  if (!Number.isFinite(now) || !Number.isFinite(opening) || !Number.isFinite(closing)) {
    return {
      key: "available",
      label: "Available",
      detail: "Check the operating hours before booking.",
      tone: "success",
    };
  }

  if (now < opening) {
    return {
      key: "closed",
      label: "Closed now",
      detail: `Opens today at ${opens}.`,
      tone: "neutral",
    };
  }

  if (now >= closing) {
    return {
      key: "closed",
      label: "Closed now",
      detail: `Opens tomorrow at ${opens}.`,
      tone: "neutral",
    };
  }

  return {
    key: "available",
    label: "Available now",
    detail: `Open until ${closes}.`,
    tone: "success",
  };
}

/* -------------------------------- Queries -------------------------------- */

function cleanSearch(value?: string): string {
  return (value ?? "")
    .trim()
    .replace(/[%,()*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function normalizeFacilityStatus(value?: string): FacilityStatus | null {
  return FACILITY_STATUSES.find((status) => status === value) ?? null;
}

export async function listFacilities(
  supabase: SupabaseClient<Database>,
  options: { query?: string; status?: string } = {},
): Promise<{ facilities: Facility[]; failed: boolean }> {
  const search = cleanSearch(options.query);
  const status = normalizeFacilityStatus(options.status);

  let request = supabase
    .schema("public")
    .from("facilities")
    .select("*");

  if (status) request = request.eq("status", status);
  if (search) {
    const pattern = `%${search}%`;
    request = request.or(
      `name.ilike.${pattern},facility_type.ilike.${pattern},location.ilike.${pattern}`,
    );
  }

  const { data, error } = await request.order("name", { ascending: true });
  return { facilities: data ?? [], failed: Boolean(error) };
}

export async function getFacilityById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Facility | null> {
  const { data } = await supabase
    .schema("public")
    .from("facilities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Facility id → end time of the booking running right now (if any). Used to
 * distinguish "available now" from "in use" without one query per card.
 */
export async function getActiveBookingEnds(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, string>> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("facility_id, end_time")
    .eq("status", "confirmed")
    .lte("start_time", now)
    .gte("end_time", now);

  const ends = new Map<string, string>();
  for (const row of data ?? []) {
    const current = ends.get(row.facility_id);
    if (!current || row.end_time > current) ends.set(row.facility_id, row.end_time);
  }
  return ends;
}

export async function getActiveBookingEnd(
  supabase: SupabaseClient<Database>,
  facilityId: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("end_time")
    .eq("facility_id", facilityId)
    .eq("status", "confirmed")
    .lte("start_time", now)
    .gte("end_time", now)
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.end_time ?? null;
}

/**
 * Upcoming facility schedule: customer bookings, class sessions that booked the
 * facility, and maintenance windows. Cancelled bookings are omitted.
 */
export async function listFacilitySchedule(
  supabase: SupabaseClient<Database>,
  facilityId: string,
  days = 14,
): Promise<{ entries: FacilityScheduleEntry[]; failed: boolean }> {
  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const [bookingResult, maintenanceResult] = await Promise.all([
    supabase
      .schema("public")
      .from("facility_bookings")
      .select("id, class_id, session_id, start_time, end_time, status, booking_reference")
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("end_time", now)
      .lte("start_time", horizon)
      .order("start_time", { ascending: true }),
    supabase
      .schema("public")
      .from("facility_maintenance")
      .select("id, start_time, end_time, reason")
      .eq("facility_id", facilityId)
      .gte("end_time", now)
      .lte("start_time", horizon)
      .order("start_time", { ascending: true }),
  ]);

  if (bookingResult.error || maintenanceResult.error) {
    return { entries: [], failed: true };
  }

  const bookings = bookingResult.data ?? [];

  // A booking may carry a class directly or through its session row.
  const sessionIds = [
    ...new Set(bookings.map((row) => row.session_id).filter((id): id is string => Boolean(id))),
  ];
  const sessionClass = new Map<string, string>();
  if (sessionIds.length) {
    const { data: sessions } = await supabase
      .schema("public")
      .from("class_sessions")
      .select("id, class_id")
      .in("id", sessionIds);
    sessions?.forEach((row) => sessionClass.set(row.id, row.class_id));
  }

  const classIds = [
    ...new Set(
      bookings
        .map((row) => row.class_id ?? (row.session_id ? sessionClass.get(row.session_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const classTitles = new Map<string, string>();
  if (classIds.length) {
    const { data: classes } = await supabase
      .schema("public")
      .from("sports_classes")
      .select("id, title")
      .in("id", classIds);
    classes?.forEach((row) => classTitles.set(row.id, row.title));
  }

  const entries: FacilityScheduleEntry[] = bookings.map((row) => {
    const classId =
      row.class_id ?? (row.session_id ? sessionClass.get(row.session_id) ?? null : null);
    return {
      id: row.id,
      kind: classId ? "class" : "booking",
      title: classId ? classTitles.get(classId) ?? "Class session" : "Customer booking",
      start: row.start_time,
      end: row.end_time,
      status: row.status,
      reference: row.booking_reference,
    };
  });

  // Legacy classes store their venue on sports_classes.facility_id instead of a
  // booking row. Include their scheduled sessions unless a facility booking
  // already represents that session (possibly at a different venue).
  const coveredSessions = new Set(
    bookings.map((row) => row.session_id).filter((id): id is string => Boolean(id)),
  );

  const { data: legacyClasses } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title")
    .eq("facility_id", facilityId);

  const legacyClassIds = legacyClasses?.map((row) => row.id) ?? [];
  const legacyTitles = new Map((legacyClasses ?? []).map((row) => [row.id, row.title]));

  if (legacyClassIds.length) {
    const { data: legacySessions } = await supabase
      .schema("public")
      .from("class_sessions")
      .select("id, class_id, start_time, end_time, session_status")
      .in("class_id", legacyClassIds)
      .eq("session_status", "scheduled")
      .gte("end_time", now)
      .lte("start_time", horizon);

    const candidates = (legacySessions ?? []).filter(
      (session) => !coveredSessions.has(session.id),
    );

    if (candidates.length) {
      // A session that booked another facility must not appear twice.
      const { data: moved } = await supabase
        .schema("public")
        .from("facility_bookings")
        .select("session_id")
        .in(
          "session_id",
          candidates.map((session) => session.id),
        )
        .neq("status", "cancelled");
      const movedSessions = new Set(
        (moved ?? []).map((row) => row.session_id).filter((id): id is string => Boolean(id)),
      );

      for (const session of candidates) {
        if (movedSessions.has(session.id)) continue;
        entries.push({
          id: session.id,
          kind: "class",
          title: legacyTitles.get(session.class_id) ?? "Class session",
          start: session.start_time,
          end: session.end_time,
          status: session.session_status,
        });
      }
    }
  }

  for (const row of maintenanceResult.data ?? []) {
    entries.push({
      id: row.id,
      kind: "maintenance",
      title: row.reason?.trim() || "Maintenance window",
      start: row.start_time,
      end: row.end_time,
      status: "maintenance",
    });
  }

  entries.sort((a, b) => a.start.localeCompare(b.start));
  return { entries, failed: false };
}
