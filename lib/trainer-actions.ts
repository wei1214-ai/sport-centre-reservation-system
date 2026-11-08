"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import {
  announcementSchema,
  attendanceSchema,
  classSchema,
  inquiryStatusSchema,
  replySchema,
  sessionSchema,
  sessionWindow,
  trainerProfileSchema,
  zodFieldErrors,
} from "@/lib/validators";
import { requireTrainerRecord } from "@/lib/trainer";

/**
 * Trainer Server Actions.
 *
 * Every action re-authenticates through requireTrainerRecord(): the trainer id
 * comes from the signed-in profile, never from the client, so a trainer can
 * only ever manage their own classes and sessions.
 */

function revalidateTrainerViews() {
  revalidatePath("/trainer");
  revalidatePath("/trainer/my-classes");
  revalidatePath("/trainer/class-sessions");
}

/** Human-friendly database error text. */
function friendlyDb(error: { message: string; code?: string }, entity: string) {
  const msg = error?.message ?? "";
  if (msg.includes("duplicate key value")) {
    return `${entity} already exists.`;
  }
  if (msg.includes("violates foreign key constraint")) {
    return `${entity} references a missing record.`;
  }
  if (msg.includes("violates check constraint")) {
    return `The database rejected the data: ${msg}`;
  }
  return `${entity} could not be saved: ${msg}`;
}

async function notifyCustomer(
  supabase: Awaited<ReturnType<typeof requireTrainerRecord>>["supabase"],
  payload: { userId: string; title: string; message: string; type: "general" | "announcement" },
) {
  await supabase.schema("public").from("notifications").insert({
    user_id: payload.userId,
    title: payload.title,
    message: payload.message,
    notification_type: payload.type,
  });
}

/* ------------------------------ My classes ------------------------------- */

export async function createClassAction(
  input: z.input<typeof classSchema>,
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the form fields.", zodFieldErrors(parsed.error));
  }
  const values = parsed.data;

  // Classes are created WITHOUT a facility. The venue is chosen later, when
  // the trainer schedules a session (which books the facility).
  const { error } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .insert({
      trainer_id: ctx.trainer.id,
      facility_id: null,
      title: values.title,
      sport_type: values.sportType,
      description: values.description || null,
      difficulty_level: values.difficulty,
      capacity: values.capacity,
      // `fee` is the MONTHLY class fee in RM (set by the trainer).
      fee: values.fee,
      sessions_per_month: values.sessionsPerMonth,
      status: values.status,
    });

  if (error) return failure(friendlyDb(error, "Class"));
  revalidateTrainerViews();
  return success("Class created");
}

export async function updateClassAction(
  classId: string,
  input: z.input<typeof classSchema>,
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the form fields.", zodFieldErrors(parsed.error));
  }
  const values = parsed.data;

  const owned = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id")
    .eq("id", classId)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!owned.data) return failure("Class not found in your classes.");

  const { error } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .update({
      title: values.title,
      sport_type: values.sportType,
      description: values.description || null,
      difficulty_level: values.difficulty,
      capacity: values.capacity,
      fee: values.fee,
      sessions_per_month: values.sessionsPerMonth,
      status: values.status,
    })
    .eq("id", classId);

  if (error) return failure(friendlyDb(error, "Class"));
  revalidateTrainerViews();
  revalidatePath(`/trainer/my-classes/${classId}`);
  return success("Class updated");
}

export async function setClassStatusAction(
  classId: string,
  status: "active" | "archived",
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const { data } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .update({ status })
    .eq("id", classId)
    .eq("trainer_id", ctx.trainer.id)
    .select("id")
    .maybeSingle();
  if (!data) return failure("Class not found in your classes.");
  revalidateTrainerViews();
  revalidatePath(`/trainer/my-classes/${classId}`);
  return success(status === "archived" ? "Class archived" : "Class reactivated");
}

/* ----------------------------- Class sessions ----------------------------- */

type SessionOverlapContext = {
  facilityId: string;
  classId: string;
  sessionId?: string;
};

/** Facility rental total for footer display: hourly rate x duration in hours. */
function bookingTotalPrice(hourlyRate: number, startISO: string, endISO: string): number {
  const hours = (new Date(endISO).getTime() - new Date(startISO).getTime()) / 3_600_000;
  return Math.round(hourlyRate * hours * 100) / 100;
}

/**
 * Totally rewritten conflict check for the new model (session = facility booking):
 * - every scheduled session books its facility via facility_bookings, so overlap
 *   with a confirmed booking means the slot is taken;
 * - legacy demo sessions have no booking, so their class.facility_id is checked too;
 * - maintenance windows always block.
 */
async function assertSessionWindowFree(
  ctx: Awaited<ReturnType<typeof requireTrainerRecord>>,
  win: { startISO: string; endISO: string },
  context: SessionOverlapContext,
): Promise<ActionResult | null> {
  const { supabase } = ctx;
  const { startISO, endISO } = win;

  // 1) Facility bookings already covering this window (customers AND trainers).
  let bookingQuery = supabase
    .schema("public")
    .from("facility_bookings")
    .select("id")
    .eq("facility_id", context.facilityId)
    .in("status", ["confirmed", "completed"])
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (context.sessionId) {
    bookingQuery = bookingQuery.neq("session_id", context.sessionId);
  }
  const { data: bookingConflicts } = await bookingQuery;
  if (bookingConflicts?.length) {
    return failure("That facility is already booked for that time.");
  }

  // 2) Legacy sessions without a booking row (older demo data only).
  const { data: legacyClasses } = await supabase
    .schema("public")
    .from("sports_classes")
    .select("id")
    .eq("facility_id", context.facilityId);
  const legacyClassIds = legacyClasses?.map((c) => c.id) ?? [];
  if (legacyClassIds.length) {
    let sessionQuery = supabase
      .schema("public")
      .from("class_sessions")
      .select("id")
      .eq("session_status", "scheduled")
      .lt("start_time", endISO)
      .gt("end_time", startISO)
      .in("class_id", legacyClassIds);
    if (context.sessionId) {
      sessionQuery = sessionQuery.neq("id", context.sessionId);
    }
    const { data: sessionConflicts } = await sessionQuery;
    if (sessionConflicts?.length) {
      return failure("Another scheduled session in this facility overlaps that time.");
    }
  }

  // 3) Maintenance windows.
  const { data: maintenanceConflicts } = await supabase
    .schema("public")
    .from("facility_maintenance")
    .select("id")
    .eq("facility_id", context.facilityId)
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (maintenanceConflicts?.length) {
    return failure("The facility is under maintenance during that time.");
  }

  return null;
}

export async function createSessionAction(
  input: z.input<typeof sessionSchema>,
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the form fields.", zodFieldErrors(parsed.error));
  }
  const win = sessionWindow(parsed.data);

  // The class must be one of this trainer's own classes.
  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id, status, capacity")
    .eq("id", parsed.data.classId)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Class not found in your classes.");
  if (cls.status !== "active") {
    return failure("Archived classes cannot schedule sessions.");
  }

  const start = new Date(win.startISO);
  if (Number.isNaN(start.getTime())) return failure("Invalid date or time.");
  if (start.getTime() < Date.now()) {
    return failure("The session start time must be in the future.");
  }

  // The trainer picks the facility at scheduling time and books it.
  const { data: facility } = await ctx.supabase
    .schema("public")
    .from("facilities")
    .select("id, status, capacity, hourly_rate")
    .eq("id", win.facilityId)
    .maybeSingle();
  if (!facility || facility.status !== "available") {
    return failure("That facility is not available for booking right now.");
  }
  if ((facility.capacity ?? 0) > 0 && cls.capacity > facility.capacity!) {
    return failure(`Class capacity is above the facility limit of ${facility.capacity}.`);
  }

  const conflict = await assertSessionWindowFree(ctx, win, {
    facilityId: facility.id,
    classId: cls.id,
  });
  if (conflict) return conflict;

  const { data: session, error: sessionError } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .insert({
      class_id: cls.id,
      start_time: win.startISO,
      end_time: win.endISO,
      session_status: "scheduled",
    })
    .select("id")
    .maybeSingle();
  if (sessionError || !session) {
    return failure(sessionError ? friendlyDb(sessionError, "Session") : "Session could not be created.");
  }

  const { error: bookingError } = await ctx.supabase
    .schema("public")
    .from("facility_bookings")
    .insert({
      customer_id: ctx.profile.id,
      facility_id: facility.id,
      class_id: cls.id,
      session_id: session.id,
      start_time: win.startISO,
      end_time: win.endISO,
      total_price: bookingTotalPrice(facility.hourly_rate, win.startISO, win.endISO),
      status: "confirmed",
    });

  if (bookingError) {
    // Roll the session back so the two rows never drift apart.
    await ctx.supabase.schema("public").from("class_sessions").delete().eq("id", session.id);
    return failure(friendlyDb(bookingError, "Facility booking"));
  }

  revalidateTrainerViews();
  return success("Session scheduled and facility booked");
}

export async function updateSessionAction(
  sessionId: string,
  input: z.input<typeof sessionSchema>,
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the form fields.", zodFieldErrors(parsed.error));
  }
  const win = sessionWindow(parsed.data);

  const { data: session } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .select("id, class_id, session_status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return failure("Session not found.");

  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id, capacity, status, trainer_id")
    .eq("id", session.class_id)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Session not found in your classes.");

  // The facility comes from the new booking (new sessions) — reschedule may
  // also move the booking to another facility.
  const { data: booking } = await ctx.supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, facility_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const { data: facility } = await ctx.supabase
    .schema("public")
    .from("facilities")
    .select("id, status, capacity, hourly_rate")
    .eq("id", win.facilityId)
    .maybeSingle();
  if (!facility || facility.status !== "available") {
    return failure("That facility is not available for booking right now.");
  }
  if ((facility.capacity ?? 0) > 0 && cls.capacity > facility.capacity!) {
    return failure(`Class capacity is above the facility limit of ${facility.capacity}.`);
  }

  const conflict = await assertSessionWindowFree(ctx, win, {
    facilityId: facility.id,
    classId: cls.id,
    sessionId,
  });
  if (conflict) return conflict;

  const { error } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .update({
      start_time: win.startISO,
      end_time: win.endISO,
      session_status: session.session_status as "scheduled" | "completed" | "cancelled",
    })
    .eq("id", sessionId);

  if (error) return failure(friendlyDb(error, "Session"));

  // Keep the linked booking in step with the rescheduled session.
  const bookingUpdate = {
    facility_id: facility.id,
    start_time: win.startISO,
    end_time: win.endISO,
    total_price: bookingTotalPrice(facility.hourly_rate, win.startISO, win.endISO),
    status: session.session_status === "cancelled" ? ("cancelled" as const) : ("confirmed" as const),
  };
  if (booking) {
    await ctx.supabase.schema("public").from("facility_bookings").update(bookingUpdate).eq("id", booking.id);
  } else if (session.session_status !== "cancelled") {
    // Legacy session without a booking: create one now.
    await ctx.supabase.schema("public").from("facility_bookings").insert({
      ...bookingUpdate,
      customer_id: ctx.profile.id,
      class_id: cls.id,
      session_id: sessionId,
    });
  }
  revalidateTrainerViews();
  return success("Session updated");
}

export async function cancelSessionAction(sessionId: string): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const { data: session } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .select("id, class_id, session_status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return failure("Session not found.");

  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id")
    .eq("id", session.class_id)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Session not found in your classes.");

  if (session.session_status !== "scheduled") {
    return failure("Only scheduled sessions can be cancelled.");
  }

  const { error } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .update({ session_status: "cancelled" })
    .eq("id", sessionId);

  if (error) return failure(friendlyDb(error, "Session"));
  // Cancelling a session also cancels its facility booking.
  await ctx.supabase
    .schema("public")
    .from("facility_bookings")
    .update({ status: "cancelled" })
    .eq("session_id", sessionId);
  revalidateTrainerViews();
  return success("Session cancelled");
}

export async function reopenSessionAction(sessionId: string): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const { data: session } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .select("id, class_id, session_status, start_time, end_time")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return failure("Session not found.");

  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id, facility_id, status")
    .eq("id", session.class_id)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Session not found in your classes.");
  if (session.session_status !== "cancelled") {
    return failure("Only cancelled sessions can be reopened.");
  }

  const { data: booking } = await ctx.supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, facility_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  const facilityId = booking?.facility_id ?? cls.facility_id;
  if (!facilityId) return failure("This session has no facility booked. Reschedule it with a facility instead.");

  const conflict = await assertSessionWindowFree(
    ctx,
    { startISO: session.start_time, endISO: session.end_time },
    { facilityId, classId: cls.id, sessionId },
  );
  if (conflict) return conflict;

  const { error } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .update({ session_status: "scheduled" })
    .eq("id", sessionId);
  if (error) return failure(friendlyDb(error, "Session"));
  if (booking) {
    await ctx.supabase.schema("public").from("facility_bookings").update({ status: "confirmed" }).eq("id", booking.id);
  }
  revalidateTrainerViews();
  return success("Session re-activated");
}

/* ------------------------------- Inquiries -------------------------------- */

export async function replyToInquiryAction(
  inquiryId: string,
  reply: string,
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = replySchema.safeParse({ inquiryId, reply });
  if (!parsed.success) {
    return failure("Write a reply first.", zodFieldErrors(parsed.error));
  }

  const { data: inquiry } = await ctx.supabase
    .schema("public")
    .from("class_inquiries")
    .select("id, trainer_id, customer_id")
    .eq("id", parsed.data.inquiryId)
    .maybeSingle();
  if (!inquiry) return failure("Inquiry not found.");
  if (inquiry.trainer_id !== ctx.trainer.id) {
    return failure("This inquiry is not assigned to you.");
  }

  const { error } = await ctx.supabase
    .schema("public")
    .from("class_inquiries")
    .update({
      reply: parsed.data.reply,
      replied_at: new Date().toISOString(),
      inquiry_status: "answered",
    })
    .eq("id", parsed.data.inquiryId);
  if (error) return failure(friendlyDb(error, "Reply"));

  await notifyCustomer(ctx.supabase, {
    userId: inquiry.customer_id,
    title: "Inquiry answered",
    message: reply,
    type: "general",
  });

  revalidatePath("/trainer/inquiries");
  revalidatePath("/trainer");
  return success("Reply sent");
}

export async function setInquiryStatusAction(
  inquiryId: string,
  status: "open" | "answered" | "closed",
): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = inquiryStatusSchema.safeParse({ inquiryId, status });
  if (!parsed.success) return failure("Invalid status.");

  const { data } = await ctx.supabase
    .schema("public")
    .from("class_inquiries")
    .update({ inquiry_status: status })
    .eq("id", parsed.data.inquiryId)
    .eq("trainer_id", ctx.trainer.id)
    .select("id")
    .maybeSingle();
  if (!data) return failure("Inquiry not found.");

  revalidatePath("/trainer/inquiries");
  return success("Inquiry updated");
}

/* ------------------------------- Attendance ------------------------------- */

export async function markAttendanceAction(input: {
  sessionId: string;
  enrollmentId: string;
  status: "present" | "absent" | "late" | "not_marked";
}): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid attendance update.");

  // The session must belong to one of this trainer's classes.
  const { data: session } = await ctx.supabase
    .schema("public")
    .from("class_sessions")
    .select("id, class_id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return failure("Session not found.");

  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id, trainer_id")
    .eq("id", session.class_id)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Session not found in your classes.");

  // The enrollment must belong to that class.
  const { data: enrollment } = await ctx.supabase
    .schema("public")
    .from("class_enrollments")
    .select("id, class_id")
    .eq("id", parsed.data.enrollmentId)
    .eq("class_id", session.class_id)
    .maybeSingle();
  if (!enrollment) return failure("Enrollment not found in this class.");

  if (parsed.data.status === "not_marked") {
    const { error } = await ctx.supabase
      .schema("public")
      .from("attendance")
      .delete()
      .eq("session_id", parsed.data.sessionId)
      .eq("enrollment_id", parsed.data.enrollmentId);
    if (error) return failure(friendlyDb(error, "Attendance"));
    revalidatePath("/trainer/attendance");
    return success("Attendance cleared");
  }

  const { data: existing } = await ctx.supabase
    .schema("public")
    .from("attendance")
    .select("id")
    .eq("session_id", parsed.data.sessionId)
    .eq("enrollment_id", parsed.data.enrollmentId)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await ctx.supabase
      .schema("public")
      .from("attendance")
      .update({
        attendance_status: parsed.data.status,
        marked_at: now,
      })
      .eq("id", existing.id);
    if (error) return failure(friendlyDb(error, "Attendance"));
  } else {
    const { error } = await ctx.supabase.schema("public").from("attendance").insert({
      session_id: parsed.data.sessionId,
      enrollment_id: parsed.data.enrollmentId,
      attendance_status: parsed.data.status,
      marked_at: now,
      marked_by: ctx.profile.id,
    });
    if (error) return failure(friendlyDb(error, "Attendance"));
  }

  revalidatePath("/trainer/attendance");
  return success("Attendance saved");
}

/* ------------------------------ Announcements ----------------------------- */

export async function postAnnouncementAction(input: {
  classId: string;
  message: string;
}): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the message.", zodFieldErrors(parsed.error));
  }

  const { data: cls } = await ctx.supabase
    .schema("public")
    .from("sports_classes")
    .select("id, title, trainer_id")
    .eq("id", parsed.data.classId)
    .eq("trainer_id", ctx.trainer.id)
    .maybeSingle();
  if (!cls) return failure("Class not found in your classes.");

  // Ensure a chat room exists for this class.
  const { data: existingRoom } = await ctx.supabase
    .schema("public")
    .from("chat_rooms")
    .select("id")
    .eq("class_id", cls.id)
    .maybeSingle();

  let roomId: string | null = existingRoom?.id ?? null;
  if (!roomId) {
    const { data: created, error: roomError } = await ctx.supabase
      .schema("public")
      .from("chat_rooms")
      .insert({ class_id: cls.id })
      .select("id")
      .maybeSingle();
    if (roomError || !created) {
      return failure("Could not open the class chat room.");
    }
    roomId = created.id;
  }

  const { error } = await ctx.supabase.schema("public").from("chat_messages").insert({
    chat_room_id: roomId,
    sender_id: ctx.profile.id,
    message: parsed.data.message,
    message_type: "announcement",
  });
  if (error) return failure(friendlyDb(error, "Announcement"));

  // Also notify every active student through the notifications feed.
  const { data: enrollments } = await ctx.supabase
    .schema("public")
    .from("class_enrollments")
    .select("customer_id, id")
    .eq("class_id", cls.id)
    .eq("status", "active");

  await Promise.all(
    (enrollments ?? []).map((row) =>
      notifyCustomer(ctx.supabase, {
        userId: row.customer_id,
        title: `Announcement · ${cls.title}`,
        message: parsed.data.message,
        type: "announcement",
      }),
    ),
  );

  revalidatePath("/trainer/announcements");
  revalidatePath("/trainer");
  return success(
    enrollments?.length
      ? `Announcement sent to ${enrollments.length} student${enrollments.length === 1 ? "" : "s"}`
      : "Announcement posted (no enrolled students yet)",
  );
}

/* --------------------------------- Profile -------------------------------- */

export async function updateTrainerProfileAction(input: {
  fullName: string;
  phone: string;
  specialization: string;
  qualifications: string;
  experienceYears: number;
  bio: string;
  contactEmail: string;
  contactPhone: string;
}): Promise<ActionResult> {
  const ctx = await requireTrainerRecord();
  const parsed = trainerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the form fields.", zodFieldErrors(parsed.error));
  }
  const values = parsed.data;

  const { error: profileError } = await ctx.supabase
    .schema("public")
    .from("user_profiles")
    .update({
      full_name: values.fullName,
      phone: values.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.profile.id);
  if (profileError) return failure(friendlyDb(profileError, "Profile"));

  const { error: trainerError } = await ctx.supabase
    .schema("public")
    .from("trainers")
    .update({
      specialization: values.specialization || null,
      qualifications: values.qualifications || null,
      experience_years: values.experienceYears,
      bio: values.bio || null,
      contact_email: values.contactEmail || null,
      contact_phone: values.contactPhone || null,
    })
    .eq("id", ctx.trainer.id);
  if (trainerError) return failure(friendlyDb(trainerError, "Profile"));

  revalidatePath("/trainer/profile");
  revalidatePath("/trainer");
  return success("Profile updated");
}
