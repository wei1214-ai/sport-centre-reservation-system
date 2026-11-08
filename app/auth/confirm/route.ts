import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { roleHome } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles email confirmation and password recovery links from Supabase Auth.
 * PKCE code is exchanged for a session, then the visitor is routed onward.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const origin = url.origin;

  const fallback = `${origin}/login?confirm=failed`;
  if (!code) {
    return NextResponse.redirect(fallback);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(fallback);
  }

  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    const { data: profile } = await supabase
      .schema("public")
      .from("user_profiles")
      .select("role")
      .eq("auth_user_id", user.user.id)
      .maybeSingle();

    if (profile && (next === "/" || !next || next === `${origin}/`)) {
      return NextResponse.redirect(new URL(roleHome(profile.role), origin));
    }
  }

  const destination =
    next && next.startsWith("/") ? next : typeof next === "string" ? `${origin}${next}` : "/login";
  return NextResponse.redirect(destination.startsWith(origin) ? destination : `${origin}${destination}`);
}
