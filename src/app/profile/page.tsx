import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { PublicProfileCard } from "@/components/public-profile-card";
import { env } from "@/lib/env";
import { toFormInput, type PublicProfileRow } from "@/lib/profile";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "My profile · Complement" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireProfile();
  if (!profile.onboarded) redirect("/onboarding");

  // Read my own public projection: exactly what other members get back from the database.
  const { data: publicView } = await supabase.from("public_profiles").select("*").eq("id", user.id).single();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">My profile</h1>
          <p className="text-muted">
            Edit anything. Use the Public / Private switches to choose what members see. Saving recomputes your{" "}
            <Link href="/leads" className="text-accent underline">
              leads
            </Link>
            .
          </p>
        </header>
        <ProfileForm mode="edit" initial={toFormInput(profile, user.email)} claudeEnabled={env.claudeEnabled()} />
      </div>
      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">What others see</h2>
        {publicView && <PublicProfileCard p={publicView as PublicProfileRow} />}
        <p className="text-xs text-muted">
          This preview is read from the same public table other members query, so it reflects your last save.
        </p>
      </aside>
    </div>
  );
}
