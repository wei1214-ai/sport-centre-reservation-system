"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/constants";
import { callRpc } from "@/lib/rpc";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const methodSchema = z.enum(PAYMENT_METHODS);

function refresh(classId?: string) {
  if (classId) revalidatePath(`/customer/classes/${classId}`);
  revalidatePath("/customer");
  revalidatePath("/customer/classes");
  revalidatePath("/customer/my-classes");
  revalidatePath("/customer/timetable");
}

/**
 * F6.1 - F6.4: the database function checks seats, records the enrolment and the
 * payment in one transaction, so nothing is left half done if a step fails.
 */
export async function enrollInClassAction(
  classId: string,
  paymentMethod: string,
): Promise<ActionResult> {
  await requireRole("customer");
  const method = methodSchema.safeParse(paymentMethod);
  if (!method.success) return failure("Choose a payment method.");

  const supabase = await createSupabaseServerClient();
  const { error } = await callRpc(supabase, "enroll_in_class", {
    p_class_id: classId,
    p_payment_method: method.data,
  });
  if (error) return failure(error.message);

  refresh(classId);
  return success("Enrolled — payment received");
}

/** Pays the next monthly fee (allowed from 7 days before the due date). */
export async function payClassFeeAction(
  enrollmentId: string,
  paymentMethod: string,
): Promise<ActionResult> {
  await requireRole("customer");
  const method = methodSchema.safeParse(paymentMethod);
  if (!method.success) return failure("Choose a payment method.");

  const supabase = await createSupabaseServerClient();
  const { error } = await callRpc(supabase, "renew_class_fee", {
    p_enrollment_id: enrollmentId,
    p_payment_method: method.data,
  });
  if (error) return failure(error.message);

  refresh();
  return success("Monthly fee paid");
}

/** F6.6 - withdraw from a class (the fee already paid is not refunded). */
export async function withdrawFromClassAction(enrollmentId: string): Promise<ActionResult> {
  await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const { error } = await callRpc(supabase, "withdraw_from_class", {
    p_enrollment_id: enrollmentId,
  });
  if (error) return failure(error.message);

  refresh();
  return success("You have withdrawn from the class");
}
