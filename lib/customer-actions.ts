"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  customerFitnessSchema,
  customerProfileSchema,
  deleteAccountSchema,
  zodFieldErrors,
} from "@/lib/validators";

/**
 * Customer account Server Actions.
 *
 * Every action re-authenticates through requireRole("customer"), so the
 * profile id always comes from the signed-in session and never from the client.
 */

function friendlyDb(error: { message: string; code?: string }, entity: string) {
  const message = error.message ?? "";
  if (message.includes("duplicate key value")) {
    return `${entity} already exists.`;
  }
  if (message.includes("violates check constraint")) {
    return `The database rejected that ${entity.toLowerCase()}. Please check the values and try again.`;
  }
  return `${entity} could not be saved: ${message}`;
}

/* ----------------------------- Personal details ---------------------------- */

export async function updateCustomerProfileAction(
  input: z.input<typeof customerProfileSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("customer");

  const parsed = customerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();

  // The contact email lives on the profile row. The Supabase sign-in email is
  // managed by Auth and is deliberately not changed here.
  const { data, error } = await supabase
    .schema("public")
    .from("user_profiles")
    .update({
      full_name: values.fullName,
      email: values.email,
      phone: values.phone || null,
      gender: values.gender || null,
      date_of_birth: values.dateOfBirth || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = another profile row already uses this contact email.
    if (error.code === "23505") {
      return failure(
        "That contact email is already used by another account. Please use a different one.",
      );
    }
    return failure(friendlyDb(error, "Profile"));
  }

  // An update that matches no row returns no error, so check explicitly.
  if (!data) {
    return failure("Your profile could not be found. Please sign in again.");
  }

  revalidatePath("/customer/profile");
  revalidatePath("/customer");
  return success("Personal details updated");
}

/* -------------------------------- Fitness --------------------------------- */

export async function updateCustomerFitnessAction(
  input: z.input<typeof customerFitnessSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("customer");

  const parsed = customerFitnessSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .schema("public")
    .from("customer_fitness_profiles")
    .upsert(
      {
        customer_id: profile.id,
        height_cm: values.heightCm === "" ? null : Number(values.heightCm),
        weight_kg: values.weightKg === "" ? null : Number(values.weightKg),
        fitness_level: values.fitnessLevel === "" ? null : values.fitnessLevel,
        fitness_goals: values.fitnessGoals || null,
        medical_conditions: values.medicalConditions || null,
        emergency_contact_name: values.emergencyContactName || null,
        emergency_contact_phone: values.emergencyContactPhone || null,
      },
      { onConflict: "customer_id" },
    );

  if (error) return failure(friendlyDb(error, "Fitness profile"));

  revalidatePath("/customer/profile");
  return success("Fitness details updated");
}

/* -------------------------------- Password -------------------------------- */

export async function changeCustomerPasswordAction(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  await requireRole("customer");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;

  if (!auth.user || !email) {
    return failure("Your session has expired. Please sign in again.");
  }

  // Confirm the current password before changing it. This also refreshes the
  // session cookies on success.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return failure("Your current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return failure(error.message);

  return success("Password updated");
}

/* ------------------------------ Delete account ----------------------------- */

/**
 * Anonymizes the customer and keeps the rows needed for audit.
 *
 * - Personal fields are overwritten and the profile is deactivated.
 * - Fitness, training-plan, notification and inquiry content is removed.
 * - Chat messages authored by the customer are redacted, not deleted, so the
 *   rest of a class conversation remains readable.
 * - Bookings, enrollments, payments, memberships and attendance stay intact.
 *
 * The Supabase Auth user itself cannot be deleted with the public key; the
 * deactivated profile blocks sign-in and the auth email is removed by an
 * administrator when the auth user is cleaned up.
 */
export async function deleteCustomerAccountAction(input: {
  confirmation: string;
}): Promise<ActionResult> {
  await requireRole("customer");

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const supabase = await createSupabaseServerClient();

  // One database transaction: remove personal child rows, redact chat content,
  // then anonymize + deactivate the profile. A failure rolls everything back.
  const { error } = await supabase.rpc("delete_my_customer_account");

  if (error) {
    return failure(
      "Your account could not be deleted. Please try again or contact an administrator.",
    );
  }

  await supabase.auth.signOut();
  revalidatePath("/customer");
  redirect("/login?deleted=1");
}
