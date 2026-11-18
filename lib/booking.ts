import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { combineLocalDateTime, localDatePart, localTimePart } from "@/lib/format";
import type { BookingStatus, Database, FacilityBooking } from "@/types/database";

type Client = SupabaseClient<Database>;

export type BusyWindow = { start: string; end: string };

/** "08:00:00" -> whole-hour window the booking grid can offer. */
export function bookableHours(opening: string, closing: string) {
  const toMinutes = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  return {
    openHour: Math.ceil(toMinutes(opening) / 60),
    closeHour: Math.floor(toMinutes(closing) / 60),
  };
}

/** Confirmed/completed bookings and maintenance windows touching one day. */
export async function getFacilityBusyWindows(
  supabase: Client,
  facilityId: string,
  date: string,
  excludeBookingId?: string,
): Promise<BusyWindow[]> {
  const dayStart = combineLocalDateTime(date, "00:00");
  const dayEnd = combineLocalDateTime(date, "23:59");

  let bookingQuery = supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, start_time, end_time")
    .eq("facility_id", facilityId)
    .in("status", ["confirmed", "completed"])
    .lt("start_time", dayEnd)
    .gt("end_time", dayStart);
  if (excludeBookingId) bookingQuery = bookingQuery.neq("id", excludeBookingId);

  const [bookings, maintenance] = await Promise.all([
    bookingQuery,
    supabase
      .schema("public")
      .from("facility_maintenance")
      .select("start_time, end_time")
      .eq("facility_id", facilityId)
      .lt("start_time", dayEnd)
      .gt("end_time", dayStart),
  ]);

  return [...(bookings.data ?? []), ...(maintenance.data ?? [])].map((row) => ({
    start: row.start_time,
    end: row.end_time,
  }));
}

/* ------------------------------- Booking lists ------------------------------ */

export type BookingPhase = "upcoming" | "past" | "cancelled";

export type BookingItem = FacilityBooking & {
  facilityName: string;
  customerName: string | null;
  phase: BookingPhase;
  /** Status shown to people: a confirmed booking that has ended reads as completed. */
  displayStatus: BookingStatus;
};

export function bookingPhase(row: Pick<FacilityBooking, "status" | "end_time">): BookingPhase {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "completed") return "past";
  return new Date(row.end_time).getTime() > Date.now() ? "upcoming" : "past";
}

async function decorate(supabase: Client, rows: FacilityBooking[]): Promise<BookingItem[]> {
  if (!rows.length) return [];
  const facilityIds = [...new Set(rows.map((r) => r.facility_id))];
  const customerIds = [...new Set(rows.map((r) => r.customer_id))];

  const [facilities, customers] = await Promise.all([
    supabase.schema("public").from("facilities").select("id, name").in("id", facilityIds),
    supabase.schema("public").from("user_profiles").select("id, full_name").in("id", customerIds),
  ]);
  const facilityMap = new Map(facilities.data?.map((f) => [f.id, f.name]) ?? []);
  const customerMap = new Map(customers.data?.map((c) => [c.id, c.full_name]) ?? []);

  return rows.map((row) => {
    const phase = bookingPhase(row);
    return {
      ...row,
      facilityName: facilityMap.get(row.facility_id) ?? "Facility",
      customerName: row.walk_in_name ?? customerMap.get(row.customer_id) ?? null,
      phase,
      displayStatus: phase === "past" && row.status === "confirmed" ? "completed" : row.status,
    };
  });
}

export type BookingView = "all" | "upcoming" | "past" | "cancelled";

export function normalizeBookingView(value?: string): BookingView {
  return value === "upcoming" || value === "past" || value === "cancelled" ? value : "all";
}

/** A customer's own plain facility bookings (class bookings are on the timetable). */
export async function listMyBookings(
  supabase: Client,
  customerId: string,
  options: { view?: BookingView; facilityId?: string; sort?: "soonest" | "latest" } = {},
): Promise<BookingItem[]> {
  let query = supabase
    .schema("public")
    .from("facility_bookings")
    .select("*")
    .eq("customer_id", customerId)
    .is("class_id", null);
  if (options.facilityId) query = query.eq("facility_id", options.facilityId);

  const { data } = await query.order("start_time", { ascending: true });
  let items = await decorate(supabase, data ?? []);
  if (options.view && options.view !== "all") {
    items = items.filter((b) => b.phase === options.view);
  }
  const ascending = options.sort === "soonest";
  return items.sort((a, b) =>
    ascending
      ? a.start_time.localeCompare(b.start_time)
      : b.start_time.localeCompare(a.start_time),
  );
}

/** Admin view of every booking (customers, walk-ins and class bookings). */
export async function listAllBookings(
  supabase: Client,
  filters: { facilityId?: string; status?: string; date?: string; q?: string } = {},
): Promise<BookingItem[]> {
  let query = supabase.schema("public").from("facility_bookings").select("*");
  if (filters.facilityId) query = query.eq("facility_id", filters.facilityId);
  if (filters.date) {
    query = query
      .lt("start_time", combineLocalDateTime(filters.date, "23:59"))
      .gt("end_time", combineLocalDateTime(filters.date, "00:00"));
  }
  const { data } = await query.order("start_time", { ascending: false }).limit(300);

  let items = await decorate(supabase, data ?? []);
  if (filters.status && filters.status !== "all") {
    items = items.filter((b) => b.phase === filters.status);
  }
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((b) =>
      [b.customerName, b.booking_reference, b.facilityName, b.walk_in_phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  return items;
}

export function todayLocal() {
  return localDatePart(new Date());
}

export type FacilityOption = {
  id: string;
  name: string;
  hourlyRate: number;
  opening: string;
  closing: string;
};

export function toFacilityOption(f: {
  id: string;
  name: string;
  hourly_rate: number;
  opening_time: string;
  closing_time: string;
}): FacilityOption {
  return {
    id: f.id,
    name: f.name,
    hourlyRate: f.hourly_rate,
    opening: f.opening_time,
    closing: f.closing_time,
  };
}

/** Whole-hour start and length of a booking, for the slot picker. */
export function bookingSlotParts(startISO: string, endISO: string) {
  return {
    date: localDatePart(startISO),
    startHour: Number(localTimePart(startISO).slice(0, 2)),
    hours: Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 3_600_000)),
  };
}
