"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accountStatusSchema, zodFieldErrors } from "@/lib/validators";

/**
 * Administrator account-status Server Actions.
 *
 * Accounts are never deleted here: suspension flips `is_active` and records the
 * reason, so bookings, classes, payments and attendance stay intact. Every
 * action re-authenticates through requireRole("admin") and refuses to touch
 * administrator accounts, which keeps one admin from locking out another.
 */

function friendlyAccountDb(error: { message: string; code?: string }): string {
  const message = (error.message ?? "").toLowerCase();

  if (error.code === "PGRST204" && /suspended_/.test(message)) {
    return "Account suspension is not set up yet. Apply supabase/migrations/20261116_account_suspension.sql in Supabase, then try again.";
  }
  if (error.code === "42501") {
    return "Only administrators can change an account status.";
  }
  if (error.code === "23503") {
    return "This account is still linked to other records and could not be updated. Please try again.";
  }

  // Log the raw message for the operator; never show SQL to the browser.
  console.error("[admin-accounts] status change failed:", error.message);
  return "The account status could not be updated. Please try again.";
}

export async function setAccountActiveAction(
  input: z.input<typeof accountStatusSchema>,
): Promise<ActionResult> {
  const admin = await requireRole("admin");

  const parsed = accountStatusSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { profileId, active, reason } = parsed.data;

  if (profileId === admin.id) {
    return failure("You cannot change the status of your own account.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: target, error: readError } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("id, full_name, role, is_active, deleted_at")
    .eq("id", profileId)
    .maybeSingle();

  if (readError) return failure(friendlyAccountDb(readError));
  if (!target) return failure("This account no longer exists.");

  if (target.role === "admin") {
    return failure("Administrator accounts cannot be suspended from this screen.");
  }
  if (target.deleted_at) {
    return failure(
      "This account was deleted by its owner and cannot be reactivated. Historical records were kept for audit.",
    );
  }
  if (target.is_active === active) {
    return failure(
      active ? "This account is already active." : "This account is already suspended.",
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .schema("public")
    .from("user_profiles")
    .update({
      is_active: active,
      suspended_at: active ? null : now,
      suspended_reason: active ? null : reason || null,
      suspended_by: active ? null : admin.id,
      updated_at: now,
    })
    .eq("id", profileId)
    .select("id")
    .maybeSingle();

  if (error) return failure(friendlyAccountDb(error));
  // An update that matches no row returns no error, so check explicitly.
  if (!data) return failure("This account no longer exists.");

  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${profileId}`);

  return success(
    active
      ? `${target.full_name} can sign in again`
      : `${target.full_name} has been suspended`,
  );
}
