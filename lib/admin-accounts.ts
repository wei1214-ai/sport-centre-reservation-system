import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Trainer, UserProfile } from "@/types/database";

/**
 * Administrator account directory helpers.
 *
 * Only customer and trainer accounts are managed here. Administrator accounts
 * are intentionally excluded: one administrator must not be able to lock out
 * another (or themselves) from this screen.
 */

export const MANAGED_ROLES = ["customer", "trainer"] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

export type AccountRoleFilter = ManagedRole | "";
export type AccountStatusFilter = "active" | "suspended" | "";

export type ManagedAccountStats = {
  customers: number;
  trainers: number;
  suspended: number;
  active: number;
  total: number;
};

export type AccountCount = { label: string; value: number; hint: string };

export type ManagedAccountDetail = {
  profile: UserProfile;
  trainer: Trainer | null;
  suspendedByName: string | null;
  counts: AccountCount[];
};

export function normalizeAccountRole(value?: string): AccountRoleFilter {
  return value === "customer" || value === "trainer" ? value : "";
}

export function normalizeAccountStatus(value?: string): AccountStatusFilter {
  return value === "active" || value === "suspended" ? value : "";
}

/** Mirrors the facility search cleaning so user input cannot break the filter. */
function cleanSearch(value?: string): string {
  return (value ?? "")
    .trim()
    .replace(/[%,()*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function listManagedAccounts(
  supabase: SupabaseClient<Database>,
  options: { query?: string; role?: string; status?: string } = {},
): Promise<{ accounts: UserProfile[]; failed: boolean }> {
  const query = cleanSearch(options.query);
  const role = normalizeAccountRole(options.role);
  const status = normalizeAccountStatus(options.status);

  let request = supabase
    .schema("public")
    .from("user_profiles")
    .select("*")
    .in("role", [...MANAGED_ROLES])
    // Self-deleted accounts are anonymised and archived, so they are not
    // managed from this screen.
    .is("deleted_at", null);

  if (role) request = request.eq("role", role);
  if (status === "active") request = request.eq("is_active", true);
  if (status === "suspended") request = request.eq("is_active", false);

  if (query) {
    const pattern = `%${query}%`;
    request = request.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  const { data, error } = await request
    // Suspended accounts first so they are never buried in the list.
    .order("is_active", { ascending: true })
    .order("full_name", { ascending: true });

  return { accounts: data ?? [], failed: Boolean(error) };
}

export async function getManagedAccountStats(
  supabase: SupabaseClient<Database>,
): Promise<ManagedAccountStats> {
  const base = () =>
    supabase
      .schema("public")
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .in("role", [...MANAGED_ROLES])
      .is("deleted_at", null);

  const [customers, trainers, suspended, total] = await Promise.all([
    base().eq("role", "customer"),
    base().eq("role", "trainer"),
    base().eq("is_active", false),
    base(),
  ]);

  const customerCount = customers.count ?? 0;
  const trainerCount = trainers.count ?? 0;
  const totalCount = total.count ?? customerCount + trainerCount;
  const suspendedCount = suspended.count ?? 0;

  return {
    customers: customerCount,
    trainers: trainerCount,
    suspended: suspendedCount,
    active: Math.max(totalCount - suspendedCount, 0),
    total: totalCount,
  };
}

async function countWhere(
  supabase: SupabaseClient<Database>,
  table: "facility_bookings" | "class_enrollments" | "payments",
  column: "customer_id",
  value: string,
): Promise<number> {
  const { count } = await supabase
    .schema("public")
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  return count ?? 0;
}

export async function getManagedAccount(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<ManagedAccountDetail | null> {
  const { data: profile } = await supabase
    .schema("public")
    .from("user_profiles")
    .select("*")
    .eq("id", profileId)
    .in("role", [...MANAGED_ROLES])
    .maybeSingle();

  if (!profile) return null;

  let trainer: Trainer | null = null;
  const counts: AccountCount[] = [];

  if (profile.role === "trainer") {
    const { data } = await supabase
      .schema("public")
      .from("trainers")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();
    trainer = data ?? null;

    if (trainer) {
      const { data: classes } = await supabase
        .schema("public")
        .from("sports_classes")
        .select("id")
        .eq("trainer_id", trainer.id);
      const classIds = (classes ?? []).map((row) => row.id);

      let upcoming = 0;
      if (classIds.length) {
        const { count } = await supabase
          .schema("public")
          .from("class_sessions")
          .select("id", { count: "exact", head: true })
          .in("class_id", classIds)
          .eq("session_status", "scheduled")
          .gte("end_time", new Date().toISOString());
        upcoming = count ?? 0;
      }

      counts.push(
        { label: "Classes", value: classIds.length, hint: "created by this trainer" },
        { label: "Upcoming sessions", value: upcoming, hint: "still scheduled" },
      );
    }
  } else {
    const [bookings, enrolments, payments] = await Promise.all([
      countWhere(supabase, "facility_bookings", "customer_id", profile.id),
      countWhere(supabase, "class_enrollments", "customer_id", profile.id),
      countWhere(supabase, "payments", "customer_id", profile.id),
    ]);

    counts.push(
      { label: "Facility bookings", value: bookings, hint: "all time" },
      { label: "Class enrolments", value: enrolments, hint: "all time" },
      { label: "Payments", value: payments, hint: "all time" },
    );
  }

  let suspendedByName: string | null = null;
  if (profile.suspended_by) {
    const { data } = await supabase
      .schema("public")
      .from("user_profiles")
      .select("full_name")
      .eq("id", profile.suspended_by)
      .maybeSingle();
    suspendedByName = data?.full_name ?? null;
  }

  return { profile, trainer, suspendedByName, counts };
}
