"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  zodFieldErrors,
  type FieldErrors,
} from "@/lib/validators";
import { roleHome } from "@/lib/auth";
import type { UserRole } from "@/types/database";

export type AuthActionResult =
  | { ok: true; message?: string; needsConfirmation?: boolean; email?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

function friendlyAuthError(message: string): string {
  if (/Invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }
  if (/#?42P01|relation .* does not exist/i.test(message)) {
    return "Your account record could not be created. Please contact an administrator.";
  }
  if (/too many requests|over_?request/i.test(message)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email hasn't been confirmed yet. Please check your inbox for the confirmation link.";
  }
  return message;
}

async function getOrigin() {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/* --------------------------------- Login --------------------------------- */

export async function loginAction(input: {
  email: string;
  password: string;
  role: UserRole;
}): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  // Verify the profile exists and belongs to a role account.
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { ok: false, error: "Session could not be established. Please try again." };
  }

  const { data: profile } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("id, role, is_active")
    .eq("auth_user_id", user.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This sign-in has no profile record yet. Please register an account first.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account is suspended. Please contact an administrator." };
  }

  // Redirect is based on the ACTUAL profile role, never on client input.
  redirect(roleHome(profile.role));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* -------------------------------- Register -------------------------------- */

export async function registerAction(input: {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: values.fullName,
        role: values.role,
        phone: values.phone || null,
        gender: values.gender || null,
        date_of_birth: values.dateOfBirth || null,
      },
    },
  });

  if (error) {
    if (/already registered|user already exists/i.test(error.message)) {
      return { ok: false, error: "This email is already registered. Try signing in instead." };
    }
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  const authUser = data.user;
  if (!authUser) {
    return { ok: false, error: "Registration failed. Please try again." };
  }

  // Create the profile row directly tied to the authenticated user. The role
  // cannot be changed later by the customer on their own.
  const { error: profileError } = await supabase
    .schema("public")
    .from("user_profiles")
    .insert({
      auth_user_id: authUser.id,
      full_name: values.fullName,
      email: values.email,
      phone: values.phone || null,
      gender: values.gender || null,
      date_of_birth: values.dateOfBirth || null,
      role: values.role,
    });

  if (profileError) {
    // RLS or a database constraint blocked the insert — tell the user, since we
    // must never leave the console silently broken.
    if (profileError.code === "23505" || profileError.code === "23503") {
      return { ok: false, error: "Profile conflict: " + profileError.message };
    }
    return { ok: false, error: "Profile could not be created: " + profileError.message };
  }

  if (values.role === "trainer") {
    const { data: profileRow } = await supabase
      .schema("public")
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!profileRow) {
      return { ok: false, error: "Trainer record could not be initialised." };
    }
    const { error: trainerError } = await supabase
      .schema("public")
      .from("trainers")
      .insert({
        user_id: profileRow.id,
        specialization: "",
        qualifications: "",
        experience_years: 0,
        bio: "",
        contact_email: values.email,
        contact_phone: values.phone || null,
      });
    if (trainerError) {
      return { ok: false, error: "Trainer record could not be created: " + trainerError.message };
    }
  }

  if (!data.session) {
    return {
      ok: true,
      needsConfirmation: true,
      email: values.email,
      message: "Please check your inbox for a confirmation email, then sign in.",
    };
  }

  redirect(roleHome(values.role));
}

/* --------------------------------- Password -------------------------------- */

export async function forgotPasswordAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  return {
    ok: true,
    message: "If an account exists for this email, a reset link is on its way.",
  };
}

export async function updatePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error.message) };
  }

  redirect("/login?reset=success");
}

/**
 * Exchanges an email confirmation / recovery code for a signed-in session.
 * Used by the /auth/confirm Route Handler.
 */
export async function exchangeCodeForSession(code: string): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return null;
  return data.session;
}

export type { AuthChangeEvent as SupabaseAuthChangeEvent };
