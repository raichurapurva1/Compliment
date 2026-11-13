import Link from "next/link";
import { redirect } from "next/navigation";
import { Chips } from "@/components/public-profile-card";
import { LeadCard, type IntroState } from "@/components/lead-card";
import { IncomingIntro, Connection } from "@/components/intros";
import { env } from "@/lib/env";
import type { PublicProfileRow } from "@/lib/profile";
import { requireProfile } from "@/lib/supabase/server";
import { SEEKING, labelOf } from "@/lib/taxonomy";
import type { ScoreBreakdown } from "@/lib/matching";

export const metadata = { title: "Leads · Complement" };

interface Lead {
  other_id: string;
  score: number;
  breakdown: ScoreBreakdown;
  relationship: string[];
  reason: string;
  why_paragraph: string | null;
  tiebreak: number;
}
interface Intro {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  message: string;
  created_at: string;
}

export default async function LeadsPage() {
  const { supabase, user, profile } = await requireProfile();
  if (!profile.onboarded) redirect("/onboarding");

  const [{ data: leadRows }, { data: introRows }] = await Promise.all([
    supabase.from("leads").select("*").eq("owner_id", user.id).order("score", { ascending: false }).order("tiebreak", { ascending: false }),
    supabase.from("intros").select("*").order("created_at", { ascending: false }),
  ]);
  const leads = (leadRows ?? []) as Lead[];
  const intros = (introRows ?? []) as Intro[];

  const otherIds = [...new Set([...leads.map((l) => l.other_id), ...intros.map((i) => (i.requester_id === user.id ? i.recipient_id : i.requester_id))])];
  const { data: people } = otherIds.length
    ? await supabase.from("public_profiles").select("*").in("id", otherIds)
    : { data: [] };
  const byId = new Map((people as PublicProfileRow[]).map((p) => [p.id, p]));

  const introWith = new Map(intros.map((i) => [i.requester_id === user.id ? i.recipient_id : i.requester_id, i]));
  const incoming = intros.filter((i) => i.status === "pending" && i.recipient_id === user.id);
  const accepted = intros.filter((i) => i.status === "accepted");

  const contacts = await Promise.all(
    accepted.map(async (i) => {
      const otherId = i.requester_id === user.id ? i.recipient_id : i.requester_id;
      const { data } = await supabase.rpc("get_intro_contact", { p_other: otherId });
      return { intro: i, otherId, contact: (data as { full_name: string; contact_email: string; contact_linkedin: string }[] | null)?.[0] };
    }),
  );

  const introState = (otherId: string): IntroState => {
    const i = introWith.get(otherId);
    if (!i) return { kind: "none" };
    if (i.status === "accepted") return { kind: "accepted" };
    if (i.status === "pending" && i.requester_id === user.id) return { kind: "requested" };
    if (i.status === "pending") return { kind: "incoming", introId: i.id };
    return { kind: "none" };
  };

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-semibold">What I need right now</h1>
          <Link href="/profile" className="text-sm text-accent hover:underline">
            Edit
          </Link>
        </div>
        <div className="card grid gap-6 p-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">My priorities</p>
            <p className="text-sm leading-relaxed">{profile.priorities || <span className="text-muted">Add your current priorities on your profile.</span>}</p>
            <p className="mt-3 text-xs text-muted">
              Looking for: {profile.seeking.map((k) => labelOf(SEEKING, k).replace(/^(A|An) /, "")).join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">My weaknesses</p>
            {profile.weaknesses.length ? <Chips items={profile.weaknesses} tone="warm" /> : <p className="text-sm text-muted">None listed</p>}
            {profile.weaknesses_note && <p className="mt-2 text-xs text-muted">{profile.weaknesses_note}</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Skills I&apos;m seeking</p>
            {profile.needs.length ? <Chips items={profile.needs} tone="accent" /> : <p className="text-sm text-muted">None listed</p>}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {incoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Intro requests for you</h2>
          <div className="space-y-3">
            {incoming.map((i) => {
              const p = byId.get(i.requester_id);
              return p ? <IncomingIntro key={i.id} introId={i.id} person={p} message={i.message} /> : null;
            })}
          </div>
        </section>
      )}

      {contacts.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Connections</h2>
          <p className="mb-3 text-sm text-muted">You both said yes, so contact details are unlocked.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map(({ intro, otherId, contact }) => {
              const p = byId.get(otherId);
              return p && contact ? <Connection key={intro.id} person={p} contact={contact} /> : null;
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">
            Matched leads <span className="text-muted">({leads.length})</span>
          </h2>
          <p className="text-xs text-muted">Mutual matches in {profile.city || "your city"}{profile.remote_ok ? " and remote" : ""}</p>
        </div>
        {leads.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No matches yet. Matches appear when someone&apos;s strengths cover your needs <em>and</em> yours cover theirs.
            Try adding more skills you need, or turning on remote.
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((l) => {
              const p = byId.get(l.other_id);
              if (!p) return null;
              return (
                <LeadCard
                  key={l.other_id}
                  person={p}
                  score={Number(l.score)}
                  breakdown={l.breakdown}
                  relationships={l.relationship}
                  reason={l.reason}
                  why={l.why_paragraph}
                  intro={introState(l.other_id)}
                  claudeEnabled={env.claudeEnabled()}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
