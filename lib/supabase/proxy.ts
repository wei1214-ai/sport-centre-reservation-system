import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

function getEnvConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return { url, key };
}

/**
 * Creates a Supabase client wired to the proxy request/response pair so freshly
 * refreshed session cookies are written back to the browser.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const { url, key } = getEnvConfig();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims() verifies the session JWT against the project's signing keys
  // when asymmetric keys are enabled and falls back to getSession()/getUser().
  let userId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims && typeof data.claims.sub === "string") {
      userId = data.claims.sub;
    }
  } catch {
    userId = null;
  }

  return { response: supabaseResponse, userId };
}
