import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "../env";
import type { ProfileRow } from "../profile";

/** A Supabase client acting as the signed-in user. Every query goes through RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes
          // the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

/** The signed-in user, or a redirect to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

/** The signed-in user's own profile (read through RLS). */
export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) throw new Error(`Could not load your profile: ${error?.message ?? "not found"}`);
  return { supabase, user, profile: data as ProfileRow };
}
