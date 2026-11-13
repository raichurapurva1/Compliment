import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for email-confirmation links and (later) LinkedIn / Google sign-in.
// Register this exact URL in Supabase: <your site>/auth/callback
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/leads";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/leads";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=Missing+sign-in+code", url.origin));
}
