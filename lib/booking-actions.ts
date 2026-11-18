"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireActiveProfile, requireRole } from "@/lib/auth";
import { bookableHours, getFacilityBusyWindows, type BusyWindow } from "@/lib/booking";
import { MAX_BOOKING_HOURS, PAYMENT_METHODS } from "@/lib/constants";
import { combineLocalDateTime } from "@/lib/format";
import { callRpc } from "@/lib/rpc";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const pad = (n: number) => String(n).padStart(2, "0");

const slotShape = {
  facilityId: z.string().min(1, "Select a facility"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  startHour: z.number().int().min(0).max(23),
  hours: z.number().int().min(1).max(MAX_BOOKING_HOURS),
};

const bookingSchema = z.object({
  ...slotShape,
  paymentMethod: z.enum(PAYMENT_METHODS),
});

/**
 * Simulated payment gateway (prototype). A real gateway would be called here;
 * the booking is only kept when this returns ok.
 */
async function simulatePayment(): Promise<{ ok: boolean; reference: string }> {
  return { ok: true, reference: `SIM-${Date.now().toString(36).toUpperCase()}` };
}

/** Facility must be bookable, the slot inside its hours, in the future, and free. */
async function validateSlot(
  supabase: Client,
  slot: { facilityId: string; date: string; startHour: number; hours: number },
  excludeBookingId?: string,
): Promise<
  | { ok: false; error: string }
  | { ok: true; startISO: string; endISO: string; total: number }
> {
  const { data: facility } = await supabase
    .schema("public")
    .from("facilities")
    .select("id, status, hourly_rate, opening_time, closing_time")
    .eq("id", slot.facilityId)
    .maybeSingle();
  // F2.1.2.8 - facilities that are not available cannot be booked.
  if (!facility || facility.status !== "available") {
    return { ok: false, error: "That facility is not available for booking." };
  }

  const { openHour, closeHour } = bookableHours(facility.opening_time, facility.closing_time);
  const endHour = slot.startHour + slot.hours;
  if (slot.startHour < openHour || endHour > closeHour) {
    return { ok: false, error: "The booking must be within the facility's operating hours." };
  }

  const startISO = combineLocalDateTime(slot.date, `${pad(slot.startHour)}:00`);
  const endISO = combineLocalDateTime(slot.date, `${pad(endHour)}:00`);
  if (new Date(startISO).getTime() < Date.now()) {
    return { ok: false, error: "The booking start time must be in the future." };
  }

  // F5.2 / F5.3 - availability check: other bookings, then maintenance.
  let clash = supabase
    .schema("public")
    .from("facility_bookings")
    .select("id")
    .eq("facility_id", slot.facilityId)
    .in("status", ["confirmed", "completed"])
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (excludeBookingId) clash = clash.neq("id", excludeBookingId);
  const { data: clashes } = await clash;
  if (clashes?.length) return { ok: false, error: "That time slot is already booked." };

  const { data: maintenance } = await supabase
    .schema("public")
    .from("facility_maintenance")
    .select("id")
    .eq("facility_id", slot.facilityId)
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (maintenance?.length) return { ok: false, error: "The facility is under maintenance then." };

  return {
    ok: true,
    startISO,
    endISO,
    total: Math.round(facility.hourly_rate * slot.hours * 100) / 100,
  };
}

function dbMessage(message: string | undefined) {
  return message && (message.includes("exclusion") || message.includes("conflicting"))
    ? "That time slot has just been taken."
    : `The booking could not be saved: ${message || "unknown error"}`;
}

function refresh(facilityId?: string) {
  if (facilityId) revalidatePath(`/facilities/${facilityId}`);
  revalidatePath("/customer");
  revalidatePath("/customer/bookings");
  revalidatePath("/customer/timetable");
  revalidatePath("/admin/bookings");
}

/** Busy windows for the slot picker (callable from client components). */
export async function getBusyWindowsAction(input: {
  facilityId: string;
  date: string;
  excludeBookingId?: string;
}): Promise<BusyWindow[]> {
  await requireActiveProfile();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return [];
  const supabase = await createSupabaseServerClient();
  return getFacilityBusyWindows(supabase, input.facilityId, input.date, input.excludeBookingId);
}

/* ------------------------------- Customer side ------------------------------ */

export async function createBookingAction(
  input: z.input<typeof bookingSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return failure("Check the booking details.");
  const { paymentMethod, ...slot } = parsed.data;

  const checked = await validateSlot(supabase, slot);
  if (!checked.ok) return failure(checked.error);

  const { data: booking, error: bookingError } = await supabase
    .schema("public")
    .from("facility_bookings")
    .insert({
      customer_id: profile.id,
      facility_id: slot.facilityId,
      start_time: checked.startISO,
      end_time: checked.endISO,
      total_price: checked.total,
      status: "confirmed",
    })
    .select("id")
    .maybeSingle();
  if (bookingError || !booking) return failure(dbMessage(bookingError?.message));

  // F5.4 - payment must succeed, otherwise the booking is rolled back.
  const payment = await simulatePayment();
  const { error: paymentError } = payment.ok
    ? await supabase.schema("public").from("payments").insert({
        customer_id: profile.id,
        booking_id: booking.id,
        amount: checked.total,
        payment_method: paymentMethod,
        payment_status: "paid",
        transaction_reference: payment.reference,
      })
    : { error: { message: "Payment declined" } };

  if (!payment.ok || paymentError) {
    await supabase.schema("public").from("facility_bookings").delete().eq("id", booking.id);
    return failure("Payment failed, so the booking was not made.");
  }

  refresh(slot.facilityId);
  return success(`Booking confirmed (RM ${checked.total.toFixed(2)} paid)`);
}

/** F5.7 - a customer cancels their own upcoming booking. */
export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const { data: booking } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, facility_id, status, start_time")
    .eq("id", bookingId)
    .eq("customer_id", profile.id)
    .is("class_id", null)
    .maybeSingle();
  if (!booking) return failure("Booking not found.");
  if (booking.status !== "confirmed") return failure("Only confirmed bookings can be cancelled.");
  if (new Date(booking.start_time).getTime() < Date.now()) {
    return failure("This booking has already started, so it can no longer be cancelled.");
  }

  const { error } = await supabase
    .schema("public")
    .from("facility_bookings")
    .update({ status: "cancelled", cancellation_reason: "Cancelled by customer" })
    .eq("id", bookingId);
  if (error) return failure(`Could not cancel the booking: ${error.message}`);

  refresh(booking.facility_id);
  return success("Booking cancelled");
}

const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  date: slotShape.date,
  startHour: slotShape.startHour,
});

/** F5.6 / F5.8 - move an upcoming booking to another free slot (same facility, same length). */
export async function rescheduleBookingAction(
  input: z.input<typeof rescheduleSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return failure("Check the new date and time.");

  const { data: booking } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("*")
    .eq("id", parsed.data.bookingId)
    .eq("customer_id", profile.id)
    .is("class_id", null)
    .maybeSingle();
  if (!booking) return failure("Booking not found.");
  if (booking.status !== "confirmed" || new Date(booking.start_time).getTime() < Date.now()) {
    return failure("Only upcoming confirmed bookings can be rescheduled.");
  }

  const hours = Math.round(
    (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 3_600_000,
  );
  const checked = await validateSlot(
    supabase,
    { facilityId: booking.facility_id, date: parsed.data.date, startHour: parsed.data.startHour, hours },
    booking.id,
  );
  if (!checked.ok) return failure(checked.error);

  const { error } = await supabase
    .schema("public")
    .from("facility_bookings")
    .update({ start_time: checked.startISO, end_time: checked.endISO })
    .eq("id", booking.id);
  if (error) return failure(dbMessage(error.message));

  await supabase.schema("public").from("booking_reschedule_history").insert({
    booking_id: booking.id,
    old_start_time: booking.start_time,
    old_end_time: booking.end_time,
    new_start_time: checked.startISO,
    new_end_time: checked.endISO,
  });

  refresh(booking.facility_id);
  return success("Booking rescheduled");
}

/* -------------------------------- Admin side -------------------------------- */

const walkInSchema = z.object({
  ...slotShape,
  name: z.string().trim().min(2, "Enter the customer's name").max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 9 && digits.length <= 13;
    }, "Enter a valid phone number"),
});

/** F5.13 / F5.14 - the administrator books for a walk-in customer. */
export async function adminCreateWalkInBookingAction(
  input: z.input<typeof walkInSchema>,
): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const parsed = walkInSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Check the details.");
  const { name, phone, ...slot } = parsed.data;

  const checked = await validateSlot(supabase, slot);
  if (!checked.ok) return failure(checked.error);

  const { data: booking, error } = await supabase
    .schema("public")
    .from("facility_bookings")
    .insert({
      customer_id: admin.id,
      facility_id: slot.facilityId,
      start_time: checked.startISO,
      end_time: checked.endISO,
      total_price: checked.total,
      status: "confirmed",
      walk_in_name: name,
      walk_in_phone: phone,
    })
    .select("id")
    .maybeSingle();
  if (error || !booking) return failure(dbMessage(error?.message));

  // Walk-in customers pay at the counter.
  await supabase.schema("public").from("payments").insert({
    customer_id: admin.id,
    booking_id: booking.id,
    amount: checked.total,
    payment_method: "Cash (counter)",
    payment_status: "paid",
    transaction_reference: `CTR-${Date.now().toString(36).toUpperCase()}`,
  });

  refresh(slot.facilityId);
  return success(`Walk-in booking created for ${name}`);
}

const adminUpdateSchema = z.object({ bookingId: z.string().min(1), ...slotShape });

/** F5.15 - change the date, time slot and facility of a booking. */
export async function adminUpdateBookingAction(
  input: z.input<typeof adminUpdateSchema>,
): Promise<ActionResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const parsed = adminUpdateSchema.safeParse(input);
  if (!parsed.success) return failure("Check the booking details.");
  const { bookingId, ...slot } = parsed.data;

  const { data: booking } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return failure("Booking not found.");
  if (booking.class_id) return failure("Class bookings are managed from the class session.");
  if (booking.status !== "confirmed") return failure("Only confirmed bookings can be updated.");

  const checked = await validateSlot(supabase, slot, bookingId);
  if (!checked.ok) return failure(checked.error);

  const { error } = await supabase
    .schema("public")
    .from("facility_bookings")
    .update({
      facility_id: slot.facilityId,
      start_time: checked.startISO,
      end_time: checked.endISO,
      total_price: checked.total,
    })
    .eq("id", bookingId);
  if (error) return failure(dbMessage(error.message));

  await supabase.schema("public").from("booking_reschedule_history").insert({
    booking_id: bookingId,
    old_start_time: booking.start_time,
    old_end_time: booking.end_time,
    new_start_time: checked.startISO,
    new_end_time: checked.endISO,
  });

  refresh(slot.facilityId);
  return success("Booking updated");
}

/** F5.16 - the administrator cancels a booking. */
export async function adminCancelBookingAction(bookingId: string): Promise<ActionResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: booking } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("id, facility_id, status, class_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return failure("Booking not found.");
  if (booking.class_id) return failure("Cancel a class booking by cancelling its session.");
  if (booking.status !== "confirmed") return failure("Only confirmed bookings can be cancelled.");

  const { error } = await supabase
    .schema("public")
    .from("facility_bookings")
    .update({ status: "cancelled", cancellation_reason: "Cancelled by administrator" })
    .eq("id", bookingId);
  if (error) return failure(`Could not cancel the booking: ${error.message}`);

  refresh(booking.facility_id);
  return success("Booking cancelled");
}

/** Runs the daily reminder / overdue-fee jobs on demand (administrators only). */
export async function runDailyJobsAction(): Promise<ActionResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: counts, error } = await callRpc<{ reminders?: number; removed?: number }>(
    supabase,
    "run_daily_jobs",
  );
  if (error) return failure(`Daily jobs failed: ${error.message}`);
  revalidatePath("/customer");
  return success(
    `Done: ${counts?.reminders ?? 0} reminder(s) sent, ${counts?.removed ?? 0} unpaid enrolment(s) removed`,
  );
}
