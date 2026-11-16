"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { FACILITY_STATUSES } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { facilitySchema, zodFieldErrors } from "@/lib/validators";
import type { FacilityStatus } from "@/types/database";

/**
 * Facility management Server Actions.
 *
 * Reads are public to every signed-in role, but every write re-authenticates
 * through requireRole("admin"). The RLS policies in the SQL migration enforce
 * the same rule at the database level, so a forged request cannot bypass it.
 */

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusSchema = z.enum(FACILITY_STATUSES, "Select a valid status");

function isRecordId(value: string): boolean {
  return ID_RE.test(value);
}

function friendlyFacilityDb(
  error: { message: string; code?: string },
  action: "created" | "saved" | "updated" | "deleted",
): string {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "PGRST204" &&
    /opening_time|closing_time|updated_at/.test(message)
  ) {
    return "Facility operating hours are not set up yet. Apply the facility management migration (20261116) in Supabase, then try again.";
  }

  // A CHECK violation names the rule in the raw message, e.g.
  //   new row for relation "facilities" violates check constraint "facilities_status_check"
  // Report the specific field instead of a generic "out of range" sentence.
  if (error.code === "23514") {
    console.error(
      `[facilities] ${action} rejected by check constraint:`,
      error.message,
    );
    if (message.includes("status")) {
      return 'The database does not accept the "unavailable" status yet. Run supabase/migrations/20261116_facility_status_values.sql in Supabase, then try again.';
    }
    if (
      message.includes("hours") ||
      message.includes("opening") ||
      message.includes("closing")
    ) {
      return "Closing time must be later than opening time. Check the operating hours and try again.";
    }
    if (message.includes("capacity")) {
      return "Capacity must be at least 1. Check the capacity and try again.";
    }
    if (
      message.includes("rate") ||
      message.includes("price") ||
      message.includes("hourly")
    ) {
      return "Price per hour must be zero or more. Check the price and try again.";
    }
    return "The facility details are out of range. Check the capacity, price and operating hours.";
  }

  // The status column is a Postgres enum that lacks the new value.
  if (error.code === "22P02" && message.includes("status")) {
    return 'The database status type does not include "unavailable" yet. Run supabase/migrations/20261116_facility_status_values.sql in Supabase, then try again.';
  }

  if (error.code === "23505") {
    return "A facility with these details already exists.";
  }

  // Log the raw database message for the operator, never show it to the user.
  console.error(`[facilities] ${action} failed:`, error.message);
  return `The facility could not be ${action}. Please try again.`;
}

function revalidateFacilityViews(facilityId?: string) {
  revalidatePath("/facilities");
  if (facilityId) revalidatePath(`/facilities/${facilityId}`);
  // Trainer scheduling reads the available-facility list, so keep it fresh.
  revalidatePath("/trainer");
  revalidatePath("/trainer/class-sessions");
  revalidatePath("/trainer/my-classes");
}

function toRow(values: z.infer<typeof facilitySchema>) {
  return {
    name: values.name,
    facility_type: values.facilityType,
    description: values.description || null,
    location: values.location || null,
    capacity: values.capacity,
    hourly_rate: values.hourlyRate,
    // Postgres `time` accepts "HH:MM"; the seconds are added for clarity.
    opening_time: `${values.openingTime}:00`,
    closing_time: `${values.closingTime}:00`,
    status: values.status,
  };
}

/* --------------------------------- Create -------------------------------- */

export async function createFacilityAction(
  input: z.input<typeof facilitySchema>,
): Promise<ActionResult> {
  await requireRole("admin");

  const parsed = facilitySchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("public")
    .from("facilities")
    .insert(toRow(parsed.data))
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyFacilityDb(error, "created"));
  if (!data) return failure("The facility could not be created. Please try again.");

  revalidateFacilityViews(data.id);
  return success("Facility created");
}

/* --------------------------------- Update -------------------------------- */

export async function updateFacilityAction(
  facilityId: string,
  input: z.input<typeof facilitySchema>,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!isRecordId(facilityId)) return failure("Facility not found.");

  const parsed = facilitySchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("public")
    .from("facilities")
    .update({ ...toRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", facilityId)
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyFacilityDb(error, "saved"));
  // An update that matches no row returns no error, so check explicitly.
  if (!data) return failure("Facility not found. It may have been removed.");

  revalidateFacilityViews(facilityId);
  return success("Facility updated");
}

/* --------------------------------- Status -------------------------------- */

export async function setFacilityStatusAction(
  facilityId: string,
  status: FacilityStatus,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!isRecordId(facilityId)) return failure("Facility not found.");

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return failure("Select a valid facility status.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("public")
    .from("facilities")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", facilityId)
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyFacilityDb(error, "updated"));
  if (!data) return failure("Facility not found. It may have been removed.");

  revalidateFacilityViews(facilityId);
  return success(
    parsed.data === "available"
      ? "Facility marked available"
      : parsed.data === "maintenance"
        ? "Facility marked under maintenance"
        : "Facility marked unavailable",
  );
}

/* --------------------------------- Delete -------------------------------- */

export async function deleteFacilityAction(facilityId: string): Promise<ActionResult> {
  await requireRole("admin");

  if (!isRecordId(facilityId)) return failure("Facility not found.");

  const supabase = await createSupabaseServerClient();

  // Only facilities that are no longer in use may be removed. Bookings,
  // classes and maintenance history keep the facility referenced, so deleting
  // would either fail or silently orphan important records.
  const [bookingResult, classResult, maintenanceResult] = await Promise.all([
    supabase
      .schema("public")
      .from("facility_bookings")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId),
    supabase
      .schema("public")
      .from("sports_classes")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId),
    supabase
      .schema("public")
      .from("facility_maintenance")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId),
  ]);

  if (bookingResult.error || classResult.error || maintenanceResult.error) {
    return failure(
      "Facility use could not be checked right now. Please try again before deleting it.",
    );
  }

  const reasons: string[] = [];
  if (bookingResult.count) {
    reasons.push(`${bookingResult.count} booking${bookingResult.count === 1 ? "" : "s"}`);
  }
  if (classResult.count) {
    reasons.push(`${classResult.count} class${classResult.count === 1 ? "" : "es"}`);
  }
  if (maintenanceResult.count) {
    reasons.push(
      `${maintenanceResult.count} maintenance record${maintenanceResult.count === 1 ? "" : "s"}`,
    );
  }

  if (reasons.length) {
    return failure(
      `This facility is still linked to ${reasons.join(", ")}. Mark it as under maintenance or unavailable instead of deleting it.`,
    );
  }

  const { data, error } = await supabase
    .schema("public")
    .from("facilities")
    .delete()
    .eq("id", facilityId)
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyFacilityDb(error, "deleted"));
  if (!data) return failure("Facility not found. It may already have been removed.");

  revalidateFacilityViews();
  return success("Facility deleted");
}
