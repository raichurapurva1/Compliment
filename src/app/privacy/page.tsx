export const metadata = { title: "Privacy · Complement" };

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-2xl space-y-4 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Privacy policy (draft)</h1>
      <p className="text-muted">
        Draft for the private pilot. Not legal advice. Have it reviewed before inviting people beyond friends.
      </p>
      <h2 className="pt-2 text-base font-semibold">What we collect</h2>
      <p>
        Your account email and the answers you give in your profile: role, what you&apos;ve built, strengths,
        weaknesses, priorities, what you&apos;re looking for, commitment, working style, location, a proof-of-work
        link and contact details. If you upload a resume, it is sent to Anthropic&apos;s Claude API to suggest
        answers and is not stored by us.
      </p>
      <h2 className="pt-2 text-base font-semibold">Who can see it</h2>
      <p>
        Your name and photo are visible to other signed-in members. Every other profile section is visible only
        if you mark it public; you can change that any time on your profile. Contact details are never shown
        until you and another member both accept an intro.
      </p>
      <h2 className="pt-2 text-base font-semibold">How it is used</h2>
      <p>
        Only to compute matches and explain them. We don&apos;t sell data or show ads. Match explanations may be
        written by Claude using your profile and the public fields of the other person.
      </p>
      <h2 className="pt-2 text-base font-semibold">Where it is stored</h2>
      <p>In a Supabase (Postgres) database with row-level security so each member can read only their own private data.</p>
      <h2 className="pt-2 text-base font-semibold">Deleting your data</h2>
      <p>Ask the pilot organizer and your account, profile, matches and intros will be deleted.</p>
    </article>
  );
}
