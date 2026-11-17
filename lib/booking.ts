import "server-only";

import { combineLocalDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  facilityId: string,
  date: string,
): Promise<BusyWindow[]> {
  const dayStart = combineLocalDateTime(date, "00:00");
  const dayEnd = combineLocalDateTime(date, "23:59");

  const [bookings, maintenance] = await Promise.all([
    supabase
      .schema("public")
      .from("facility_bookings")
      .select("start_time, end_time")
      .eq("facility_id", facilityId)
      .in("status", ["confirmed", "completed"])
      .lt("start_time", dayEnd)
      .gt("end_time", dayStart),
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
