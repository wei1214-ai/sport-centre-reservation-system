import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { bookingPhase } from "@/lib/booking";
import { callRpc } from "@/lib/rpc";
import type {
  ClassEnrollment,
  ClassSession,
  Database,
  EnrollmentStatus,
  SportsClass,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export type ClassCard = SportsClass & {
  trainerName: string | null;
  specialization: string | null;
  enrolled: number;
  seatsLeft: number;
  nextSession: string | null;
  myStatus: EnrollmentStatus | null;
};

async function trainerInfo(supabase: Client, trainerIds: string[]) {
  const ids = [...new Set(trainerIds)];
  const map = new Map<string, { name: string | null; specialization: string | null }>();
  if (!ids.length) return map;
  const { data: trainers } = await supabase
    .schema("public")
    .from("trainers")
    .select("id, user_id, specialization")
    .in("id", ids);
  const { data: profiles } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("id, full_name")
    .in("id", trainers?.map((t) => t.user_id) ?? []);
  const names = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);
  trainers?.forEach((t) =>
    map.set(t.id, { name: names.get(t.user_id) ?? null, specialization: t.specialization }),
  );
  return map;
}

async function seatCounts(supabase: Client, classIds: string[]) {
  const counts = new Map<string, number>();
  if (!classIds.length) return counts;
  const { data } = await callRpc<Array<{ class_id: string; enrolled: number }>>(
    supabase,
    "class_enrolled_counts",
    { p_class_ids: classIds },
  );
  data?.forEach((row) => counts.set(row.class_id, row.enrolled));
  return counts;
}

export type ClassFilters = {
  q?: string;
  sport?: string;
  difficulty?: string;
  availability?: string;
  sort?: string;
};

/** F2.1.4.7 / F6.2 - browse + search active classes with live seat counts. */
export async function listBrowsableClasses(
  supabase: Client,
  customerId: string,
  filters: ClassFilters = {},
): Promise<{ classes: ClassCard[]; sports: string[] }> {
  const { data: rows } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const all = rows ?? [];
  const sports = [...new Set(all.map((c) => c.sport_type))].sort();
  if (!all.length) return { classes: [], sports };

  const ids = all.map((c) => c.id);
  const nowISO = new Date().toISOString();
  const [trainers, counts, sessions, mine] = await Promise.all([
    trainerInfo(supabase, all.map((c) => c.trainer_id)),
    seatCounts(supabase, ids),
    supabase
      .schema("public")
      .from("class_sessions")
      .select("class_id, start_time")
      .in("class_id", ids)
      .eq("session_status", "scheduled")
      .gte("start_time", nowISO)
      .order("start_time", { ascending: true }),
    supabase
      .schema("public")
      .from("class_enrollments")
      .select("class_id, status")
      .eq("customer_id", customerId)
      .in("class_id", ids),
  ]);

  const nextByClass = new Map<string, string>();
  sessions.data?.forEach((s) => {
    if (!nextByClass.has(s.class_id)) nextByClass.set(s.class_id, s.start_time);
  });
  const myStatus = new Map(mine.data?.map((e) => [e.class_id, e.status]) ?? []);

  let cards: ClassCard[] = all.map((c) => {
    const enrolled = counts.get(c.id) ?? 0;
    const t = trainers.get(c.trainer_id);
    return {
      ...c,
      trainerName: t?.name ?? null,
      specialization: t?.specialization ?? null,
      enrolled,
      seatsLeft: Math.max(c.capacity - enrolled, 0),
      nextSession: nextByClass.get(c.id) ?? null,
      myStatus: myStatus.get(c.id) ?? null,
    };
  });

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    cards = cards.filter((c) =>
      [c.title, c.sport_type, c.trainerName, c.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  if (filters.sport) cards = cards.filter((c) => c.sport_type === filters.sport);
  if (filters.difficulty) cards = cards.filter((c) => c.difficulty_level === filters.difficulty);
  if (filters.availability === "open") cards = cards.filter((c) => c.seatsLeft > 0);

  const sorters: Record<string, (a: ClassCard, b: ClassCard) => number> = {
    fee_low: (a, b) => a.fee - b.fee,
    fee_high: (a, b) => b.fee - a.fee,
    seats: (a, b) => b.seatsLeft - a.seatsLeft,
    soonest: (a, b) => (a.nextSession ?? "9").localeCompare(b.nextSession ?? "9"),
  };
  if (filters.sort && sorters[filters.sort]) cards.sort(sorters[filters.sort]);

  return { classes: cards, sports };
}

export type ClassDetail = {
  card: ClassCard;
  sessions: Array<ClassSession & { facilityName: string | null }>;
  trainerBio: string | null;
};

export async function getClassDetail(
  supabase: Client,
  customerId: string,
  classId: string,
): Promise<ClassDetail | null> {
  const { data: cls } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();
  if (!cls) return null;

  const [{ classes }, sessionRes, trainerRow] = await Promise.all([
    listBrowsableClasses(supabase, customerId),
    supabase
      .schema("public")
      .from("class_sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("session_status", "scheduled")
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true }),
    supabase.schema("public").from("trainers").select("bio").eq("id", cls.trainer_id).maybeSingle(),
  ]);

  const card = classes.find((c) => c.id === classId);
  if (!card) return null;

  const sessions = sessionRes.data ?? [];
  const facilityBySession = new Map<string, string>();
  if (sessions.length) {
    const { data: bookings } = await supabase
      .schema("public")
      .from("facility_bookings")
      .select("session_id, facility_id")
      .in("session_id", sessions.map((s) => s.id));
    const { data: facilities } = await supabase
      .schema("public")
      .from("facilities")
      .select("id, name")
      .in("id", [...new Set(bookings?.map((b) => b.facility_id) ?? [])]);
    const names = new Map(facilities?.map((f) => [f.id, f.name]) ?? []);
    bookings?.forEach((b) => {
      if (b.session_id) facilityBySession.set(b.session_id, names.get(b.facility_id) ?? "");
    });
  }

  return {
    card,
    sessions: sessions.map((s) => ({ ...s, facilityName: facilityBySession.get(s.id) || null })),
    trainerBio: trainerRow.data?.bio ?? null,
  };
}

/* ------------------------------- My classes ------------------------------- */

export type MyEnrollment = {
  enrollment: ClassEnrollment;
  cls: SportsClass;
  trainerName: string | null;
  nextSession: (ClassSession & { facilityName: string | null }) | null;
  paidCount: number;
  dueDate: Date;
  /** Within 7 days of the due date (or past it): the next fee can be paid. */
  canPay: boolean;
  overdue: boolean;
};

export function nextDueDate(enrolledAt: string, paidCount: number): Date {
  const due = new Date(enrolledAt);
  due.setMonth(due.getMonth() + Math.max(paidCount, 1));
  return due;
}

export async function listMyEnrollments(
  supabase: Client,
  customerId: string,
  view: "active" | "past" | "all" = "all",
): Promise<MyEnrollment[]> {
  let query = supabase
    .schema("public")
    .from("class_enrollments")
    .select("*")
    .eq("customer_id", customerId)
    .order("enrolled_at", { ascending: false });
  if (view === "active") query = query.eq("status", "active");
  if (view === "past") query = query.neq("status", "active");
  const { data: enrollments } = await query;
  if (!enrollments?.length) return [];

  const classIds = [...new Set(enrollments.map((e) => e.class_id))];
  const [{ data: classes }, { data: payments }, { data: sessions }] = await Promise.all([
    supabase.schema("public").from("sports_classes").select("*").in("id", classIds),
    supabase
      .schema("public")
      .from("payments")
      .select("enrollment_id, paid_at, payment_status")
      .in("enrollment_id", enrollments.map((e) => e.id))
      .eq("payment_status", "paid"),
    supabase
      .schema("public")
      .from("class_sessions")
      .select("*")
      .in("class_id", classIds)
      .eq("session_status", "scheduled")
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true }),
  ]);

  const classMap = new Map(classes?.map((c) => [c.id, c]) ?? []);
  const trainers = await trainerInfo(supabase, classes?.map((c) => c.trainer_id) ?? []);

  const firstSession = new Map<string, ClassSession>();
  sessions?.forEach((s) => {
    if (!firstSession.has(s.class_id)) firstSession.set(s.class_id, s);
  });
  const facilityBySession = new Map<string, string>();
  const nextIds = [...firstSession.values()].map((s) => s.id);
  if (nextIds.length) {
    const { data: bookings } = await supabase
      .schema("public")
      .from("facility_bookings")
      .select("session_id, facility_id")
      .in("session_id", nextIds);
    const { data: facilities } = await supabase
      .schema("public")
      .from("facilities")
      .select("id, name")
      .in("id", [...new Set(bookings?.map((b) => b.facility_id) ?? [])]);
    const names = new Map(facilities?.map((f) => [f.id, f.name]) ?? []);
    bookings?.forEach((b) => {
      if (b.session_id) facilityBySession.set(b.session_id, names.get(b.facility_id) ?? "");
    });
  }

  const out: MyEnrollment[] = [];
  for (const enrollment of enrollments) {
    const cls = classMap.get(enrollment.class_id);
    if (!cls) continue;
    const paidCount =
      payments?.filter(
        (p) => p.enrollment_id === enrollment.id && p.paid_at && p.paid_at >= enrollment.enrolled_at,
      ).length ?? 0;
    const dueDate = nextDueDate(enrollment.enrolled_at, paidCount);
    const msLeft = dueDate.getTime() - Date.now();
    const next = firstSession.get(cls.id);
    out.push({
      enrollment,
      cls,
      trainerName: trainers.get(cls.trainer_id)?.name ?? null,
      nextSession: next ? { ...next, facilityName: facilityBySession.get(next.id) || null } : null,
      paidCount,
      dueDate,
      canPay: enrollment.status === "active" && msLeft <= 7 * 86_400_000,
      overdue: enrollment.status === "active" && msLeft < 0,
    });
  }
  return out;
}

/* -------------------------------- Timetable -------------------------------- */

export type TimetableItem = {
  id: string;
  kind: "booking" | "class";
  title: string;
  subtitle: string;
  facility: string;
  start: string;
  end: string;
  status: string;
  reference?: string;
};

/** F5.9 - the customer's own bookings and enrolled class sessions together. */
export async function listTimetableItems(
  supabase: Client,
  customerId: string,
): Promise<TimetableItem[]> {
  const from = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const [{ data: bookings }, { data: enrollments }] = await Promise.all([
    supabase
      .schema("public")
      .from("facility_bookings")
      .select("*")
      .eq("customer_id", customerId)
      .is("class_id", null)
      .neq("status", "cancelled")
      .gte("end_time", from),
    supabase
      .schema("public")
      .from("class_enrollments")
      .select("class_id")
      .eq("customer_id", customerId)
      .eq("status", "active"),
  ]);

  const classIds = enrollments?.map((e) => e.class_id) ?? [];
  const [{ data: classes }, { data: sessions }] = classIds.length
    ? await Promise.all([
        supabase.schema("public").from("sports_classes").select("id, title, sport_type").in("id", classIds),
        supabase
          .schema("public")
          .from("class_sessions")
          .select("*")
          .in("class_id", classIds)
          .neq("session_status", "cancelled")
          .gte("end_time", from),
      ])
    : [{ data: [] }, { data: [] }];

  const sessionIds = sessions?.map((s) => s.id) ?? [];
  const { data: sessionBookings } = sessionIds.length
    ? await supabase
        .schema("public")
        .from("facility_bookings")
        .select("session_id, facility_id")
        .in("session_id", sessionIds)
    : { data: [] };

  const facilityIds = [
    ...new Set([
      ...(bookings?.map((b) => b.facility_id) ?? []),
      ...(sessionBookings?.map((b) => b.facility_id) ?? []),
    ]),
  ];
  const { data: facilities } = facilityIds.length
    ? await supabase.schema("public").from("facilities").select("id, name").in("id", facilityIds)
    : { data: [] };
  const facilityName = new Map(facilities?.map((f) => [f.id, f.name]) ?? []);
  const facilityBySession = new Map(
    sessionBookings?.map((b) => [b.session_id, facilityName.get(b.facility_id) ?? ""]) ?? [],
  );
  const classMap = new Map(classes?.map((c) => [c.id, c]) ?? []);

  const items: TimetableItem[] = [];
  bookings?.forEach((b) => {
    const phase = bookingPhase(b);
    items.push({
      id: b.id,
      kind: "booking",
      title: facilityName.get(b.facility_id) ?? "Facility booking",
      subtitle: "Facility booking",
      facility: facilityName.get(b.facility_id) ?? "—",
      start: b.start_time,
      end: b.end_time,
      status: phase === "past" ? "completed" : b.status,
      reference: b.booking_reference,
    });
  });
  sessions?.forEach((s) => {
    const cls = classMap.get(s.class_id);
    items.push({
      id: s.id,
      kind: "class",
      title: cls?.title ?? "Class session",
      subtitle: cls ? `${cls.sport_type} class` : "Class session",
      facility: (s.id && facilityBySession.get(s.id)) || "—",
      start: s.start_time,
      end: s.end_time,
      status: s.session_status,
    });
  });
  return items.sort((a, b) => a.start.localeCompare(b.start));
}

/** Timetable items of one kind that have not ended yet. */
export function upcomingItems(items: TimetableItem[], kind: TimetableItem["kind"]) {
  const now = Date.now();
  return items.filter((i) => i.kind === kind && new Date(i.end).getTime() > now);
}
