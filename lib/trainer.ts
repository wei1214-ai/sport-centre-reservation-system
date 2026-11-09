import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ClassEnrollment,
  ClassInquiry,
  ClassSession,
  Facility,
  SportsClass,
  Trainer,
  UserProfile,
} from "@/types/database";
import type { Database } from "@/types/database";

export type TrainerContext = {
  profile: UserProfile;
  trainer: Trainer | null;
  supabase: SupabaseClient<Database>;
};

/** Requires trainer role, ensures a trainer record exists, and yields clients. */
export async function requireTrainerContext(): Promise<TrainerContext> {
  const profile = await requireRole("trainer");
  const supabase = await createSupabaseServerClient();

  const { data: trainer } = await supabase
    .schema("public")
    .from("trainers")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  return { profile, trainer: trainer ?? null, supabase };
}

/** Same as above but redirects when there is no trainer record to manage. */
export async function requireTrainerRecord(): Promise<
  TrainerContext & { trainer: Trainer }
> {
  const ctx = await requireTrainerContext();
  if (!ctx.trainer) {
    // A trainer role without a trainer profile cannot manage anything: route
    // back to the trainer home where the empty state explains the situation.
    redirect("/trainer");
  }
  return ctx as TrainerContext & { trainer: Trainer };
}

/* ----------------------------- Read helpers ------------------------------ */

export const getTrainerById = cache(async (supabase: SupabaseClient<Database>, id: string) => {
  const { data } = await supabase.schema("public").from("trainers").select("*").eq("id", id).maybeSingle();
  return data ?? null;
});

export async function listTrainerClasses(
  supabase: SupabaseClient<Database>,
  trainerId: string,
): Promise<Array<SportsClass & { facility: Pick<Facility, "id" | "name"> | null }>> {
  const { data: classes } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  if (!classes?.length) return [];
  return attachFacilities(supabase, classes);
}

export async function attachFacilities<
  T extends { facility_id: string | null },
>(
  supabase: SupabaseClient<Database>,
  rows: Array<T>,
): Promise<Array<T & { facility: Pick<Facility, "id" | "name"> | null }>> {
  const facilityIds = [...new Set(rows.map((r) => r.facility_id))].filter(
    (id): id is string => Boolean(id),
  );
  const facilities: Map<string, Pick<Facility, "id" | "name">> = new Map();
  if (facilityIds.length) {
    const { data: found } = await supabase
      .schema("public")
      .from("facilities")
      .select("id, name")
      .in("id", facilityIds);
    found?.forEach((f) => facilities.set(f.id, { id: f.id, name: f.name }));
  }
  return rows.map((row) => ({ ...row, facility: row.facility_id ? facilities.get(row.facility_id) ?? null : null }));
}

export async function listTrainerSessions(
  supabase: SupabaseClient<Database>,
  trainerId: string,
  filter: "upcoming" | "past" | "cancelled",
): Promise<Array<ClassSession & { classInfo: Pick<SportsClass, "id" | "title" | "facility_id"> | null; bookingFacilityId?: string | null }>> {
  const now = new Date().toISOString();

  const { data: classes } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id")
    .eq("trainer_id", trainerId);

  const classIds = classes?.map((c) => c.id) ?? [];
  if (!classIds.length) return [];

  let query = supabase
    .schema("public")
    .from("class_sessions")
    .select("*")
    .in("class_id", classIds);

  if (filter === "upcoming") {
    query = query.eq("session_status", "scheduled");
    query = query.gte("end_time", now);
  } else if (filter === "past") {
    query = query.eq("session_status", "scheduled");
    query = query.lt("end_time", now);
  } else {
    query = query.eq("session_status", "cancelled");
  }

  const ordered = await query.order("start_time", {
    ascending: filter !== "past",
  });
  const { data: sessions } = ordered;
  if (!sessions?.length) return [];

  const { data: classesFull } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title, facility_id")
    .in("id", [...new Set(sessions.map((s) => s.class_id))]);

  const classMap = new Map(classesFull?.map((c) => [c.id, c]) ?? []);

  // Each session books its facility via facility_bookings (class_id/session_id).
  // Resolve bookingFacilityId per session so lists/details can show the venue.
  const { data: bookings } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, session_id, facility_id, status")
    .in("session_id", sessions.map((s) => s.id));
  const bookingFacilityBySession = new Map<string, string | null>();
  for (const b of bookings ?? []) {
    if (!b.session_id) continue;
    // A cancelled booking should not claim the slot; keep the first live one.
    if (b.status !== "cancelled" || !bookingFacilityBySession.has(b.session_id)) {
      if (b.status !== "cancelled") bookingFacilityBySession.set(b.session_id, b.facility_id);
    }
  }

  return sessions.map((s) => {
    const info = classMap.get(s.class_id) ?? null;
    const bookingFacilityId = bookingFacilityBySession.get(s.id) ?? null;
    // Prefer the booked venue; fall back to the legacy class venue.
    return {
      ...s,
      classInfo: info ? { ...info, facility_id: bookingFacilityId ?? info.facility_id } : null,
      bookingFacilityId,
    };
  });
}

export async function listCustomerProfileLabels(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, { id: string; full_name: string; email: string }>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return new Map();
  const { data } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("id, full_name, email")
    .in("id", unique);
  const map = new Map<string, { id: string; full_name: string; email: string }>();
  data?.forEach((row) => {
    map.set(row.id, row);
  });
  return map;
}

export async function listTrainerInquiries(
  supabase: SupabaseClient<Database>,
  trainerId: string,
): Promise<Array<ClassInquiry & { classTitle: string | null }>> {
  const { data: inquiries } = await supabase
    .schema("public")
    .from("class_inquiries")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  if (!inquiries?.length) return [];

  const { data: classes } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title")
    .in("id", [...new Set(inquiries.map((i) => i.class_id))]);
  const titleMap = new Map(classes?.map((c) => [c.id, c.title]) ?? []);

  return inquiries.map((inquiry) => ({
    ...inquiry,
    classTitle: titleMap.get(inquiry.class_id) ?? null,
  }));
}

export async function countActiveEnrollments(
  supabase: SupabaseClient<Database>,
  classIds: string[],
): Promise<Map<string, number>> {
  if (!classIds.length) return new Map();
  const { data } = await supabase
    .schema("public")
    .from("class_enrollments")
    .select("class_id, status")
    .in("class_id", classIds);
  const counts = new Map<string, number>();
  let total = 0;
  data?.forEach((row) => {
    if (row.status === "active") {
      counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
      total += 1;
    }
  });
  counts.set("__total__", total);
  return counts;
}

export async function listAttendanceRoster(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  classId: string,
): Promise<{
  session: (ClassSession & { classInfo: Pick<SportsClass, "title"> | null }) | null;
  roster: Array<{
    enrollment: ClassEnrollment;
    customerName: string;
    customerEmail: string;
    attendanceStatus: string | null;
    attendanceId: string | null;
  }>;
}> {
  const { data: session } = await supabase
    .schema("public")
    .from("class_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  const { data: classRow } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title")
    .eq("id", classId)
    .maybeSingle();

  const { data: enrollments } = await supabase
    .schema("public")
    .from("class_enrollments")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "active");

  const customerLabels = await listCustomerProfileLabels(
    supabase,
    enrollments?.map((e) => e.customer_id) ?? [],
  );

  const { data: attendance } = await supabase
    .schema("public")
    .from("attendance")
    .select("id, enrollment_id, attendance_status")
    .eq("session_id", sessionId);

  const attendanceMap = new Map(attendance?.map((a) => [a.enrollment_id, a]) ?? []);

  const roster = (enrollments ?? []).map((enrollment) => {
    const label = customerLabels.get(enrollment.customer_id);
    const record = attendanceMap.get(enrollment.id);
    return {
      enrollment,
      customerName: label?.full_name ?? "Unknown",
      customerEmail: label?.email ?? "",
      attendanceStatus: record?.attendance_status ?? null,
      attendanceId: record?.id ?? null,
    };
  });

  return {
    session: session
      ? { ...session, classInfo: classRow ? { id: classRow.id, title: classRow.title } : null }
      : null,
    roster,
  };
}

export async function listRecentAnnouncements(
  supabase: SupabaseClient<Database>,
  trainerId: string,
): Promise<
  Array<{
    id: string;
    message: string;
    created_at: string;
    classTitle: string | null;
    classId: string;
  }>
> {
  const { data: classes } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title")
    .eq("trainer_id", trainerId);

  const classMap = new Map(classes?.map((c) => [c.id, c]) ?? []);
  const classIds = classes?.map((c) => c.id) ?? [];
  if (!classIds.length) return [];

  const { data: rooms } = await supabase
    .schema("public")
    .from("chat_rooms")
    .select("id, class_id")
    .in("class_id", classIds);

  if (!rooms?.length) return [];
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const { data: messages } = await supabase
    .schema("public")
    .from("chat_messages")
    .select("id, chat_room_id, message, message_type, created_at")
    .in("chat_room_id", [...roomMap.keys()])
    .eq("message_type", "announcement")
    .order("created_at", { ascending: false })
    .limit(12);

  return (messages ?? []).map((m) => {
    const room = roomMap.get(m.chat_room_id);
    const cls = room ? classMap.get(room.class_id) : undefined;
    return {
      id: m.id,
      message: m.message,
      created_at: m.created_at,
      classTitle: cls?.title ?? null,
      classId: room?.class_id ?? "",
    };
  });
}

export async function listAvailableFacilities(
  supabase: SupabaseClient<Database>,
): Promise<Facility[]> {
  const { data } = await supabase
    .schema("public")
    .from("facilities")
    .select("*")
    .eq("status", "available")
    .order("name", { ascending: true });
  return data ?? [];
}
