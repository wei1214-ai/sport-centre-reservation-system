"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { bookableHours } from "@/lib/booking";
import { MAX_BOOKING_HOURS, PAYMENT_METHODS } from "@/lib/constants";
import { combineLocalDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bookingSchema = z.object({
  facilityId: z.string().min(1, "Select a facility"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  startHour: z.number().int().min(0).max(23),
  hours: z.number().int().min(1).max(MAX_BOOKING_HOURS),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Simulated payment gateway (prototype). A real gateway would be called here;
 * the booking is only kept when this returns ok.
 */
async function simulatePayment(): Promise<{ ok: boolean; reference: string }> {
  return { ok: true, reference: `SIM-${Date.now().toString(36).toUpperCase()}` };
}

export async function createBookingAction(
  input: z.input<typeof bookingSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return failure("Check the booking details.");
  const { facilityId, date, startHour, hours, paymentMethod } = parsed.data;

  // F2.1.2.8 - only facilities that are available can be booked.
  const { data: facility } = await supabase
    .schema("public")
    .from("facilities")
    .select("id, status, hourly_rate, opening_time, closing_time")
    .eq("id", facilityId)
    .maybeSingle();
  if (!facility || facility.status !== "available") {
    return failure("That facility is not available for booking.");
  }

  // Booking must sit inside the facility's own operating hours.
  const { openHour, closeHour } = bookableHours(facility.opening_time, facility.closing_time);
  const endHour = startHour + hours;
  if (startHour < openHour || endHour > closeHour) {
    return failure("The booking must be within the facility's operating hours.");
  }

  const startISO = combineLocalDateTime(date, `${pad(startHour)}:00`);
  const endISO = combineLocalDateTime(date, `${pad(endHour)}:00`);
  if (new Date(startISO).getTime() < Date.now()) {
    return failure("The booking start time must be in the future.");
  }

  // F5.2 / F5.3 - availability check (bookings, then maintenance windows).
  const { data: clashes } = await supabase
    .schema("public")
    .from("facility_bookings")
    .select("id")
    .eq("facility_id", facilityId)
    .in("status", ["confirmed", "completed"])
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (clashes?.length) return failure("That time slot has just been taken.");

  const { data: maintenance } = await supabase
    .schema("public")
    .from("facility_maintenance")
    .select("id")
    .eq("facility_id", facilityId)
    .lt("start_time", endISO)
    .gt("end_time", startISO);
  if (maintenance?.length) return failure("The facility is under maintenance then.");

  const total = Math.round(facility.hourly_rate * hours * 100) / 100;

  const { data: booking, error: bookingError } = await supabase
    .schema("public")
    .from("facility_bookings")
    .insert({
      customer_id: profile.id,
      facility_id: facilityId,
      start_time: startISO,
      end_time: endISO,
      total_price: total,
      status: "confirmed",
    })
    .select("id")
    .maybeSingle();
  if (bookingError || !booking) {
    const msg = bookingError?.message ?? "";
    return failure(
      msg.includes("exclusion") || msg.includes("conflicting")
        ? "That time slot has just been taken."
        : `Booking could not be saved: ${msg || "unknown error"}`,
    );
  }

  // F5.4 - payment must succeed, otherwise the booking is rolled back.
  const payment = await simulatePayment();
  const { error: paymentError } = payment.ok
    ? await supabase.schema("public").from("payments").insert({
        customer_id: profile.id,
        booking_id: booking.id,
        amount: total,
        payment_method: paymentMethod,
        payment_status: "paid",
        transaction_reference: payment.reference,
      })
    : { error: { message: "Payment declined" } };

  if (!payment.ok || paymentError) {
    await supabase.schema("public").from("facility_bookings").delete().eq("id", booking.id);
    return failure("Payment failed, so the booking was not made.");
  }

  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath("/customer/bookings");
  return success(`Booking confirmed (RM ${total.toFixed(2)} paid)`);
}
