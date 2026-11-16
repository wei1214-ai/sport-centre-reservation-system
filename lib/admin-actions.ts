"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminProfileSchema,
  changePasswordSchema,
  zodFieldErrors,
} from "@/lib/validators";

/**
 * Administrator account Server Actions.
 *
 * Every action re-authenticates through requireRole("admin"), so the profile id
 * always comes from the signed-in session and never from the client.
 */

function friendlyProfileDb(error: { message: string; code?: string }): string {
  if (error.code === "23505") {
    return "That contact email is already used by another account. Please use a different one.";
  }
  // Never surface raw SQL to the browser; log it for the operator instead.
  console.error("[admin-profile] save failed:", error.message);
  return "Your profile could not be saved. Please try again or contact another administrator.";
}

/* ----------------------------- Personal details ---------------------------- */

export async function updateAdminProfileAction(
  input: z.input<typeof adminProfileSchema>,
): Promise<ActionResult> {
  const profile = await requireRole("admin");

  const parsed = adminProfileSchema.safeParse(input);
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyProfileDb(error));

  // An update that matches no row returns no error, so check explicitly.
  if (!data) {
    return failure("Your profile could not be found. Please sign in again.");
  }

  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  return success("Profile updated");
}

/* -------------------------------- Password --------------------------------- */

export async function changeAdminPasswordAction(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  await requireRole("admin");

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
    if (/invalid login credentials/i.test(verifyError.message)) {
      return failure("Your current password is incorrect.");
    }
    if (/rate limit|too many requests/i.test(verifyError.message)) {
      return failure("Too many attempts. Please wait a moment and try again.");
    }
    return failure("Your current password could not be verified. Please try again.");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (/different from the old|same password/i.test(error.message)) {
      return failure("Choose a password different from your current one.");
    }
    if (/rate limit|too many requests/i.test(error.message)) {
      return failure("Too many attempts. Please wait a moment and try again.");
    }
    return failure("Your password could not be updated. Please try again.");
  }

  return success("Password updated");
}
