import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (env.isConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/leads");
  }

  return (
    <div className="space-y-16 py-6">
      <section className="max-w-2xl">
        <p className="mb-3 inline-block rounded-full bg-warm-soft px-3 py-1 text-xs font-medium text-amber-800">
          Private pilot · Philadelphia
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Meet the people whose strengths cover your gaps.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Complement matches builders with co-founders, paid collaborators, mentors and advisors who
          bring the skills they&apos;re missing, and who need what they&apos;re good at.
        </p>
        <div className="mt-8 flex gap-3">
          {env.isConfigured() ? (
            <>
              <Link href="/login?mode=signup" className="btn-primary px-5 py-2.5">
                Get started
              </Link>
              <Link href="/login" className="btn-secondary px-5 py-2.5">
                Sign in
              </Link>
            </>
          ) : (
            <SetupNotice />
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Tell us what you've built", "A short questionnaire, or upload a resume and let Claude fill it in. You edit everything."],
          ["Get mutual matches", "Matches only show up if you each bring something the other needs. Same city by default."],
          ["Double opt-in intros", "Contact details stay hidden until both of you say yes."],
        ].map(([title, body], i) => (
          <div key={title} className="card p-5">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {i + 1}
            </div>
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="card max-w-xl border-amber-200 bg-warm-soft p-4 text-sm">
      <p className="font-medium">Almost there: connect Supabase</p>
      <p className="mt-1 text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and keys, run the
        migration in <code>supabase/migrations</code>, and restart the dev server. The README has the steps.
      </p>
    </div>
  );
}
