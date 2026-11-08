import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";
import type { UserProfile } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Data Access Layer.
 *
 * Every authenticated render and Server Action funnels through these helpers:
 * the session is read server-side and the profile is loaded from the database,
 * so client-supplied role values are never trusted.
 */

/** Returns the currently signed-in user id or null. */
export async function getCurrentAuthUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims && typeof data.claims.sub === "string") {
      return data.claims.sub;
    }
  } catch {
    // ignore and fall through
  }
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Returns the signed-in user's profile row, or null when not signed in. */
export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const authUserId = await getCurrentAuthUserId();
  if (!authUserId) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data ?? null;
});

export function roleHome(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "trainer":
      return "/trainer";
    default:
      return "/customer";
  }
}

/**
 * Requires a signed-in profile with the given role. Otherwise redirects: to
 * /login when signed out, or to the profile's own role home when signed in
 * with a different role.
 */
export async function requireRole(role: UserRole): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!profile.is_active) {
    redirect("/suspended");
  }
  if (profile.role !== role) {
    redirect(roleHome(profile.role));
  }
  return profile;
}
