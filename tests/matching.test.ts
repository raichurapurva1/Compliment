import { describe, expect, it } from "vitest";
import {
  coverage,
  explainMatch,
  pairKey,
  rankLeads,
  scorePair,
  sharedRelationships,
  type MatchProfile,
} from "../src/lib/matching";

const base: MatchProfile = {
  id: "x",
  city: "Philadelphia",
  remoteOk: false,
  seeking: ["cofounder"],
  openTo: ["cofounder"],
  strengths: [],
  weaknesses: [],
  needs: [],
  hoursPerWeek: 20,
  compensation: "equity",
  timeline: "now",
  commStyle: "mixed",
  pace: 3,
  riskTolerance: 3,
  proofUrl: "",
  proofVerified: false,
  freeText: "",
};
const make = (over: Partial<MatchProfile>): MatchProfile => ({ ...base, ...over });

const engineer = make({
  id: "eng",
  strengths: ["engineering", "ai_ml", "data"],
  needs: ["sales", "growth_marketing"],
  weaknesses: ["content"],
  freeText: "Built an AI scheduling tool for clinics",
});
const marketer = make({
  id: "mkt",
  strengths: ["sales", "growth_marketing", "content"],
  needs: ["engineering"],
  weaknesses: ["data"],
  freeText: "Grew a DTC brand to 50k customers",
});

describe("hard filters", () => {
  it("rejects different cities unless both are remote-OK", () => {
    const nyc = make({ ...marketer, city: "New York" });
    expect(scorePair(engineer, nyc)).toEqual({ ok: false, reason: "location" });
    expect(scorePair({ ...engineer, remoteOk: true }, { ...nyc, remoteOk: true }).ok).toBe(true);
    expect(scorePair({ ...engineer, remoteOk: true }, nyc).ok).toBe(false);
  });

  it("treats city names case- and whitespace-insensitively", () => {
    expect(scorePair(engineer, { ...marketer, city: "  philadelphia " }).ok).toBe(true);
  });

  it("requires overlapping relationship types", () => {
    const wantsMentor = make({ ...marketer, seeking: ["mentor"], openTo: [] });
    expect(scorePair(engineer, wantsMentor)).toEqual({ ok: false, reason: "relationship" });
    const mentor = make({ ...engineer, seeking: [], openTo: ["mentoring"] });
    expect(scorePair(mentor, wantsMentor).ok).toBe(true);
  });

  it("matches someone seeking a paid collaborator with someone open to paid work", () => {
    const client = make({ id: "c", seeking: ["paid_collaborator"], openTo: [] });
    const freelancer = make({ id: "f", seeking: [], openTo: ["paid_work"] });
    expect(sharedRelationships(client, freelancer)).toEqual(["paid"]);
    expect(sharedRelationships(freelancer, client)).toEqual(["paid"]);
    const notOpen = make({ id: "n", seeking: [], openTo: ["advising"] });
    expect(sharedRelationships(client, notOpen)).toEqual([]);
  });

  it("never matches a declined pair", () => {
    const blocked = new Set([pairKey("mkt", "eng")]);
    expect(scorePair(engineer, marketer, { blockedPairs: blocked })).toEqual({ ok: false, reason: "declined" });
  });
});

describe("scoring", () => {
  it("is symmetric, so matches are always mutual", () => {
    const a = scorePair(engineer, marketer);
    const b = scorePair(marketer, engineer);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.score).toBe(b.score);
      expect(a.breakdown.complementarity).toBe(b.breakdown.complementarity);
    }
  });

  it("uses the weaker direction for complementarity", () => {
    // The marketer covers what the engineer needs, but the engineer covers only one of
    // the marketer's three needs. The pair is only as strong as the weaker direction.
    const lopsided = make({ ...marketer, id: "lop", needs: ["legal", "finance", "data"], weaknesses: [] });
    const r = scorePair(engineer, lopsided);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.breakdown.coverageBtoA).toBe(1);
      expect(r.breakdown.coverageAtoB).toBeCloseTo(1 / 3);
      expect(r.breakdown.complementarity).toBeCloseTo(1 / 3);
    }
  });

  it("drops co-founder pairs where only one side benefits", () => {
    const oneSided = make({ ...marketer, id: "one", needs: ["legal", "finance", "operations"], weaknesses: [] });
    expect(scorePair(engineer, oneSided)).toEqual({ ok: false, reason: "no_complement" });
  });

  it("drops near-clones: identical strengths cover nothing for each other", () => {
    expect(scorePair(engineer, make({ ...engineer, id: "clone" }))).toEqual({ ok: false, reason: "no_complement" });
  });

  it("penalizes overlapping strengths", () => {
    const partlySame = make({ ...marketer, id: "ps", strengths: ["sales", "growth_marketing", "engineering"] });
    const distinct = scorePair(engineer, marketer);
    const overlap = scorePair(engineer, partlySame);
    expect(distinct.ok && overlap.ok).toBe(true);
    if (distinct.ok && overlap.ok) {
      expect(distinct.breakdown.distinctness).toBe(1);
      expect(overlap.breakdown.distinctness).toBeCloseTo(0.8);
    }
  });

  it("only needs the mentee's gaps covered in a pure mentorship match", () => {
    const mentee = make({ id: "mentee", seeking: ["mentor"], openTo: [], needs: ["fundraising", "sales"] });
    const mentor = make({ id: "mentor", seeking: [], openTo: ["mentoring"], strengths: ["fundraising", "sales"], needs: [] });
    const r = scorePair(mentor, mentee);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.relationships).toEqual(["mentorship"]);
      expect(r.breakdown.complementarity).toBeCloseTo(1);
    }
  });

  it("weights explicit needs above admitted weaknesses", () => {
    const needsSales = make({ id: "n", needs: ["sales"] });
    const weakInSales = make({ id: "w", weaknesses: ["sales"], needs: ["legal"] });
    const seller = make({ id: "s", strengths: ["sales"] });
    expect(coverage(seller, needsSales)).toBeGreaterThan(coverage(seller, weakInSales));
  });

  it("rewards commitment fit and verified proof of work", () => {
    const farApart = make({ ...marketer, id: "far", hoursPerWeek: 2, timeline: "exploring", compensation: "cash" });
    const close = scorePair(engineer, marketer);
    const far = scorePair(engineer, farApart);
    if (close.ok && far.ok) expect(close.breakdown.intent).toBeGreaterThan(far.breakdown.intent);

    const verified = scorePair(engineer, { ...marketer, proofUrl: "https://x.com", proofVerified: true });
    if (close.ok && verified.ok) expect(verified.score).toBeGreaterThan(close.score);
  });

  it("keeps the score between 0 and 100", () => {
    const best = make({
      id: "b1", strengths: ["sales"], needs: ["engineering"], proofUrl: "u", proofVerified: true,
    });
    const best2 = make({
      id: "b2", strengths: ["engineering"], needs: ["sales"], proofUrl: "u", proofVerified: true,
    });
    const r = scorePair(best, best2);
    expect(r.ok && r.score).toBe(100);
  });
});

describe("ranking", () => {
  it("orders leads best first and drops weak ones", () => {
    const clone = make({ ...engineer, id: "clone" });
    const weak = make({ ...marketer, id: "weak", commStyle: "sync", pace: 5, riskTolerance: 5, hoursPerWeek: 1, compensation: "cash", timeline: "exploring", needs: ["engineering", "legal", "finance", "hardware"] });
    const good = make({ ...marketer, id: "good", strengths: ["sales", "growth_marketing"] });
    const leads = rankLeads(engineer, [engineer, clone, weak, good, marketer]);
    expect(leads.map((l) => l.other.id)).toEqual(["mkt", "good"]);
  });

  it("breaks score ties with free-text similarity", () => {
    const a = make({ ...marketer, id: "a", freeText: "Interested in healthcare clinics and scheduling" });
    const b = make({ ...marketer, id: "b", freeText: "Love sailing and pottery" });
    const leads = rankLeads(engineer, [b, a], { minScore: 0 });
    expect(leads[0].score).toBe(leads[1].score);
    expect(leads[0].other.id).toBe("a");
  });
});

describe("explanations", () => {
  const r = scorePair(engineer, marketer);
  if (!r.ok) throw new Error("expected a match");

  it("names the other person's strengths when they are public", () => {
    const text = explainMatch({
      viewer: engineer, other: marketer, otherFirstName: "Maya",
      otherPublic: ["strengths", "looking_for"], breakdown: r.breakdown, relationships: r.relationships,
    });
    expect(text).toContain("Maya's strengths in Sales, Growth marketing and Content creation");
    expect(text).toContain("You bring Software engineering");
    expect(text).toContain("co-founder");
  });

  it("does not leak private strengths or needs", () => {
    const text = explainMatch({
      viewer: engineer, other: marketer, otherFirstName: "Maya",
      otherPublic: [], breakdown: r.breakdown, relationships: r.relationships,
    });
    expect(text).not.toMatch(/Sales|Growth marketing|Software engineering|Data/);
    expect(text).toContain("strong in 3 of the areas");
  });
});
