import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CustomerFitnessProfile } from "@/types/database";

/** Reads the signed-in customer's optional fitness profile. */
export async function getCustomerFitnessProfile(
  customerId: string,
): Promise<CustomerFitnessProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .schema("public")
    .from("customer_fitness_profiles")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  return data ?? null;
}
