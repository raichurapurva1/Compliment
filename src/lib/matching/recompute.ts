// Recomputes leads and writes them to the database.
//
// Needs a Supabase client created with the service-role key (it reads every profile).
// Never import this from client code. It has no "server-only" guard so the seed script
// can use it too.

import type { SupabaseClient } from "@supabase/supabase-js";
import { toMatchProfile, firstName, type ProfileRow } from "../profile";
import { explainMatch } from "./explain";
import { pairKey, scorePair, MIN_SCORE } from "./score";

interface LeadRow {
  owner_id: string;
  other_id: string;
  score: number;
  breakdown: object;
  relationship: string[];
  reason: string;
  tiebreak: number;
  computed_at: string;
  why_paragraph?: string | null;
}

async function loadState(admin: SupabaseClient) {
  const [profiles, passes, declined] = await Promise.all([
    admin.from("profiles").select("*").eq("onboarded", true),
    admin.from("passes").select("user_id, other_id"),
    admin.from("intros").select("requester_id, recipient_id").eq("status", "declined"),
  ]);
  for (const r of [profiles, passes, declined]) if (r.error) throw r.error;

  const blocked = new Set<string>();
  for (const p of passes.data ?? []) blocked.add(pairKey(p.user_id, p.other_id));
  for (const i of declined.data ?? []) blocked.add(pairKey(i.requester_id, i.recipient_id));
  return { profiles: (profiles.data ?? []) as ProfileRow[], blocked };
}

function leadRowsFor(a: ProfileRow, b: ProfileRow, blocked: Set<string>): LeadRow[] | null {
  const A = toMatchProfile(a);
  const B = toMatchProfile(b);
  const r = scorePair(A, B, { blockedPairs: blocked });
  if (!r.ok || r.score < MIN_SCORE) return null;

  const now = new Date().toISOString();
  const swapped = {
    ...r.breakdown,
    coverageAtoB: r.breakdown.coverageBtoA,
    coverageBtoA: r.breakdown.coverageAtoB,
  };
  return [
    {
      owner_id: a.id,
      other_id: b.id,
      score: r.score,
      breakdown: r.breakdown,
      relationship: r.relationships,
      tiebreak: r.tiebreak,
      computed_at: now,
      reason: explainMatch({
        viewer: A, other: B, otherFirstName: firstName(b.full_name), otherPublic: b.public_fields,
        breakdown: r.breakdown, relationships: r.relationships,
      }),
    },
    {
      owner_id: b.id,
      other_id: a.id,
      score: r.score,
      breakdown: swapped,
      relationship: r.relationships,
      tiebreak: r.tiebreak,
      computed_at: now,
      reason: explainMatch({
        viewer: B, other: A, otherFirstName: firstName(a.full_name), otherPublic: a.public_fields,
        breakdown: swapped, relationships: r.relationships,
      }),
    },
  ];
}

async function write(admin: SupabaseClient, rows: LeadRow[], dropPairs: [string, string][]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin
      .from("leads")
      .upsert(rows.slice(i, i + 500), { onConflict: "owner_id,other_id", ignoreDuplicates: false });
    if (error) throw error;
  }
  for (const [x, y] of dropPairs) {
    const { error } = await admin
      .from("leads")
      .delete()
      .or(`and(owner_id.eq.${x},other_id.eq.${y}),and(owner_id.eq.${y},other_id.eq.${x})`);
    if (error) throw error;
  }
}

/**
 * Recompute every lead involving one user. Call after their profile changes or after they
 * finish onboarding. Because matches are mutual, this also updates everyone else's leads.
 */
export async function recomputeForUser(admin: SupabaseClient, userId: string) {
  const { profiles, blocked } = await loadState(admin);
  const me = profiles.find((p) => p.id === userId);

  if (!me) {
    // Not onboarded (or deleted): remove them from everyone's leads.
    const { error } = await admin.from("leads").delete().or(`owner_id.eq.${userId},other_id.eq.${userId}`);
    if (error) throw error;
    return { leads: 0 };
  }

  const rows: LeadRow[] = [];
  const drop: [string, string][] = [];
  for (const other of profiles) {
    if (other.id === me.id) continue;
    const r = leadRowsFor(me, other, blocked);
    if (r) rows.push(...r);
    else drop.push([me.id, other.id]);
  }
  // Leads are kept (not deleted and re-inserted), so a cached "why you two" paragraph
  // survives a recompute only if the profile didn't change. Clear it for this user's pairs.
  await write(admin, rows.map((r) => ({ ...r, why_paragraph: null })), drop);
  return { leads: rows.length / 2 };
}

/** Recompute every pair. Used by the seed script. */
export async function recomputeAll(admin: SupabaseClient) {
  const { profiles, blocked } = await loadState(admin);
  const { error } = await admin.from("leads").delete().neq("owner_id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;

  const rows: LeadRow[] = [];
  for (let i = 0; i < profiles.length; i++)
    for (let j = i + 1; j < profiles.length; j++) {
      const r = leadRowsFor(profiles[i], profiles[j], blocked);
      if (r) rows.push(...r);
    }
  await write(admin, rows, []);
  return { profiles: profiles.length, pairs: rows.length / 2 };
}
