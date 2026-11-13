"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, requireProfile, requireUser } from "@/lib/supabase/server";
import { recomputeForUser } from "@/lib/matching/recompute";
import { ProfileInput } from "@/lib/validation";
import { checkProofUrl } from "@/lib/proof";
import { whyYouTwo } from "@/lib/claude";
import { env } from "@/lib/env";
import type { PublicProfileRow } from "@/lib/profile";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { ok: false, error: error.message };
  redirect("/leads");
}

export async function signUp(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const name = String(form.get("name") ?? "").trim();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) {
    return { ok: true, message: "Check your email for a confirmation link, then come back to sign in." };
  }
  redirect("/onboarding");
}

export async function signInWithProvider(provider: "linkedin_oidc" | "google") {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/leads`,
      scopes: provider === "linkedin_oidc" ? "openid profile email" : undefined,
    },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Sign-in failed")}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function saveProfile(input: unknown, opts: { finishOnboarding?: boolean } = {}): Promise<ActionResult> {
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first.path.join(".") || "Profile"}: ${first.message}` };
  }
  const { supabase, user, profile } = await requireProfile();
  const data = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ ...data, ...(opts.finishOnboarding ? { onboarded: true } : {}) })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Users can't set proof_verified themselves (column grant); the server checks the link.
  const admin = createAdminClient();
  if (data.proof_url !== profile.proof_url || (data.proof_url && !profile.proof_verified)) {
    const verified = data.proof_url ? await checkProofUrl(data.proof_url) : false;
    await admin.from("profiles").update({ proof_verified: verified }).eq("id", user.id);
  }

  // Matches are recomputed whenever a profile changes or someone new finishes onboarding.
  await recomputeForUser(admin, user.id);

  revalidatePath("/", "layout");
  if (opts.finishOnboarding) redirect("/leads");
  return { ok: true, message: "Saved. Your matches were updated." };
}

// ---------------------------------------------------------------------------
// Leads and intros
// ---------------------------------------------------------------------------

export async function requestIntro(otherId: string, message: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("request_intro", { p_other: otherId, p_message: message });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function respondIntro(introId: string, accept: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_intro", { p_intro: introId, p_accept: accept });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function passLead(otherId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("pass_lead", { p_other: otherId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/leads");
  return { ok: true };
}

export async function generateWhy(otherId: string): Promise<ActionResult & { text?: string }> {
  if (!env.claudeEnabled()) return { ok: false, error: "Add ANTHROPIC_API_KEY to turn this on." };
  const { supabase, user, profile } = await requireProfile();

  const [{ data: lead }, { data: other }] = await Promise.all([
    supabase.from("leads").select("other_id").eq("owner_id", user.id).eq("other_id", otherId).maybeSingle(),
    supabase.from("public_profiles").select("*").eq("id", otherId).maybeSingle(),
  ]);
  if (!lead || !other) return { ok: false, error: "That match is no longer available." };

  try {
    const text = await whyYouTwo(profile, other as PublicProfileRow);
    // Leads are server-written only, so cache the paragraph with the admin client.
    await createAdminClient().from("leads").update({ why_paragraph: text }).eq("owner_id", user.id).eq("other_id", otherId);
    revalidatePath("/leads");
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Claude request failed" };
  }
}
