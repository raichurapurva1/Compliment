import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { env } from "@/lib/env";
import { toFormInput } from "@/lib/profile";
import { requireProfile } from "@/lib/supabase/server";

export const metadata = { title: "Set up your profile · Complement" };

export default async function OnboardingPage() {
  const { user, profile } = await requireProfile();
  if (profile.onboarded) redirect("/profile");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Set up your profile</h1>
        <p className="text-muted">About five minutes. You decide what other members can see.</p>
      </header>
      <ProfileForm mode="onboarding" initial={toFormInput(profile, user.email)} claudeEnabled={env.claudeEnabled()} />
    </div>
  );
}
