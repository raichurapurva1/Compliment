// Proves the privacy model against a real Supabase database (local or hosted).
// Skipped automatically when .env.local has no Supabase settings.
//
// It creates three throwaway accounts, then checks as each user what the database lets
// them read and write. It cleans up after itself.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { recomputeForUser } from "../src/lib/matching/recompute";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const run = Math.random().toString(36).slice(2, 8);
const password = "rls-test-password-1";

let admin: SupabaseClient;
const users: Record<"a" | "b" | "c", { id: string; email: string; db: SupabaseClient }> = {} as never;

async function makeUser(tag: "a" | "b" | "c") {
  const email = `rls-${tag}-${run}@test.complement.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Tester ${tag.toUpperCase()}` } });
  if (error) throw error;
  const db = createClient(url!, anonKey!, opts);
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  users[tag] = { id: data.user.id, email, db };
}

describe.skipIf(!configured)("row-level security", () => {
  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, opts);
    await Promise.all([makeUser("a"), makeUser("b"), makeUser("c")]);

    // A: an engineer who keeps weaknesses private. B: a marketer. They complement each other.
    const a = await users.a.db.from("profiles").update({
      headline: "Engineer", strengths: ["engineering"], needs: ["sales"],
      weaknesses: ["sales"], weaknesses_note: "A's secret weakness",
      seeking: ["cofounder"], open_to: ["cofounder"], contact_email: "a-private@example.com",
      public_fields: ["headline", "strengths", "looking_for"], onboarded: true,
    }).eq("id", users.a.id).select();
    expect(a.error).toBeNull();
    expect(a.data).toHaveLength(1);

    const b = await users.b.db.from("profiles").update({
      headline: "Marketer", strengths: ["sales"], needs: ["engineering"], weaknesses: ["engineering"],
      seeking: ["cofounder"], open_to: ["cofounder"], contact_email: "b-private@example.com",
      public_fields: ["headline", "strengths"], onboarded: true,
    }).eq("id", users.b.id).select();
    expect(b.error).toBeNull();

    await recomputeForUser(admin, users.a.id);
  });

  afterAll(async () => {
    if (!admin) return;
    for (const u of Object.values(users)) await admin.auth.admin.deleteUser(u.id);
  });

  it("B cannot read A's private profile row", async () => {
    const { data, error } = await users.b.db.from("profiles").select("*").eq("id", users.a.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const all = await users.b.db.from("profiles").select("id");
    expect(all.data?.map((r) => r.id)).toEqual([users.b.id]);
  });

  it("B sees only the fields A made public", async () => {
    const { data } = await users.b.db.from("public_profiles").select("*").eq("id", users.a.id).single();
    expect(data).toBeTruthy();
    expect(data!.headline).toBe("Engineer");
    expect(data!.strengths).toEqual(["engineering"]);
    expect(data!.needs).toEqual(["sales"]);
    // Private fields come back empty.
    expect(data!.weaknesses).toBeNull();
    expect(data!.weaknesses_note).toBeNull();
    expect(data!.hours_per_week).toBeNull();
    expect(JSON.stringify(data)).not.toContain("secret");
    expect(JSON.stringify(data)).not.toContain("a-private@example.com");
  });

  it("contact details are not even a column of the public table", async () => {
    const { error } = await users.b.db.from("public_profiles").select("contact_email").eq("id", users.a.id);
    expect(error).not.toBeNull();
  });

  it("B cannot change A's profile", async () => {
    const { data } = await users.b.db.from("profiles").update({ headline: "hacked" }).eq("id", users.a.id).select();
    expect(data ?? []).toEqual([]);
    const check = await admin.from("profiles").select("headline").eq("id", users.a.id).single();
    expect(check.data!.headline).toBe("Engineer");
  });

  it("users cannot verify their own proof of work or create profile rows", async () => {
    const verify = await users.a.db.from("profiles").update({ proof_verified: true }).eq("id", users.a.id);
    expect(verify.error).not.toBeNull();
    const insert = await users.a.db.from("profiles").insert({ id: crypto.randomUUID() });
    expect(insert.error).not.toBeNull();
  });

  it("matches are mutual, and each user can read only their own leads", async () => {
    const aLeads = await users.a.db.from("leads").select("owner_id, other_id, score, reason");
    const bLeads = await users.b.db.from("leads").select("owner_id, other_id, score");
    expect(aLeads.data?.find((l) => l.other_id === users.b.id)).toBeTruthy();
    expect(bLeads.data?.find((l) => l.other_id === users.a.id)).toBeTruthy();
    expect(aLeads.data!.every((l) => l.owner_id === users.a.id)).toBe(true);
    expect(bLeads.data!.every((l) => l.owner_id === users.b.id)).toBe(true);
    // A's reason must not mention B's private weaknesses list.
    expect(aLeads.data!.find((l) => l.other_id === users.b.id)!.reason).not.toContain("Software engineering, which is on their list");

    const cLeads = await users.c.db.from("leads").select("*").eq("owner_id", users.a.id);
    expect(cLeads.data).toEqual([]);

    const forge = await users.c.db.from("leads").insert({ owner_id: users.c.id, other_id: users.a.id, score: 99 });
    expect(forge.error).not.toBeNull();
  });

  it("contact details unlock only after both people opt in", async () => {
    const before = await users.b.db.rpc("get_intro_contact", { p_other: users.a.id });
    expect(before.data).toEqual([]);

    // C is not matched with A, so C can't request an intro.
    const cReq = await users.c.db.rpc("request_intro", { p_other: users.a.id, p_message: "hi" });
    expect(cReq.error).not.toBeNull();

    const req = await users.b.db.rpc("request_intro", { p_other: users.a.id, p_message: "Let's talk" });
    expect(req.error).toBeNull();

    // One side said yes: still hidden from both.
    expect((await users.b.db.rpc("get_intro_contact", { p_other: users.a.id })).data).toEqual([]);
    expect((await users.a.db.rpc("get_intro_contact", { p_other: users.b.id })).data).toEqual([]);

    // B can't accept their own request on A's behalf.
    const selfAccept = await users.b.db.rpc("respond_intro", { p_intro: req.data.id, p_accept: true });
    expect(selfAccept.error).not.toBeNull();

    const accept = await users.a.db.rpc("respond_intro", { p_intro: req.data.id, p_accept: true });
    expect(accept.error).toBeNull();

    const after = await users.b.db.rpc("get_intro_contact", { p_other: users.a.id });
    expect(after.data).toEqual([{ full_name: "Tester A", contact_email: "a-private@example.com", contact_linkedin: "" }]);

    // A third person still sees nothing.
    expect((await users.c.db.rpc("get_intro_contact", { p_other: users.a.id })).data).toEqual([]);
    expect((await users.c.db.from("intros").select("*")).data).toEqual([]);
  });

  it("signed-out visitors can't read anything", async () => {
    const anon = createClient(url!, anonKey!, opts);
    const pub = await anon.from("public_profiles").select("*");
    expect(pub.data ?? []).toEqual([]);
    const priv = await anon.from("profiles").select("*");
    expect(priv.data ?? []).toEqual([]);
  });
});
