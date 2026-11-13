// The Complement matching algorithm.
//
// Pure functions, no I/O, so it can be unit tested and run anywhere (server, scripts, tests).
//
// Every part of the score is symmetric: score(A, B) === score(B, A). That is what makes
// matches mutual. If A shows up in B's leads, B shows up in A's leads with the same score.

import type { MatchProfile, MatchResult, Relationship, ScoreBreakdown } from "./types";
import { textSimilarity } from "./textsim";

export const WEIGHTS = {
  complementarity: 0.4,
  distinctness: 0.1, // the "overlap penalty": too-similar strengths lose these points
  intent: 0.25,
  style: 0.15,
  proof: 0.1,
} as const;

/** Leads below this score are not shown. */
export const MIN_SCORE = 45;

/** Weight of a need someone listed explicitly vs. a weakness they admitted. */
const NEED_WEIGHT = 1;
const WEAKNESS_WEIGHT = 0.6;
/** Covering this much weighted demand counts as full coverage (about three explicit needs). */
const COVERAGE_SATURATION = 3;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// ---------------------------------------------------------------------------
// 1. Hard filters
// ---------------------------------------------------------------------------

export function locationCompatible(a: MatchProfile, b: MatchProfile): boolean {
  if (norm(a.city) !== "" && norm(a.city) === norm(b.city)) return true;
  return a.remoteOk && b.remoteOk;
}

/** Relationship types both people want. Empty means there is no overlap. */
export function sharedRelationships(a: MatchProfile, b: MatchProfile): Relationship[] {
  const out: Relationship[] = [];
  const oneWay = (x: MatchProfile, y: MatchProfile, seek: string, offer: string) =>
    (x.seeking as string[]).includes(seek) && (y.openTo as string[]).includes(offer);
  const either = (seek: string, offer: string) => oneWay(a, b, seek, offer) || oneWay(b, a, seek, offer);

  if (a.seeking.includes("cofounder") && b.seeking.includes("cofounder")) out.push("cofounder");
  if (either("paid_collaborator", "paid_work")) out.push("paid");
  if (either("mentor", "mentoring")) out.push("mentorship");
  if (either("advisor", "advising")) out.push("advisory");
  return out;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

// ---------------------------------------------------------------------------
// 2. Complementarity: how well one person's strengths cover the other's gaps
// ---------------------------------------------------------------------------

/** Weighted demand: explicit needs count fully, admitted weaknesses count a bit less. */
export function demandOf(p: MatchProfile): Map<string, number> {
  const d = new Map<string, number>();
  for (const w of p.weaknesses) d.set(w, Math.max(d.get(w) ?? 0, WEAKNESS_WEIGHT));
  for (const n of p.needs) d.set(n, Math.max(d.get(n) ?? 0, NEED_WEIGHT));
  return d;
}

/** How much of `receiver`'s demand `giver`'s strengths cover, 0..1. */
export function coverage(giver: MatchProfile, receiver: MatchProfile): number {
  const demand = demandOf(receiver);
  if (demand.size === 0) return 0;
  let total = 0;
  let covered = 0;
  for (const [skill, weight] of demand) {
    total += weight;
    if (giver.strengths.includes(skill)) covered += weight;
  }
  return Math.min(1, covered / Math.min(total, COVERAGE_SATURATION));
}

/**
 * Use the weaker direction, so a match is only strong if both people benefit. The exception
 * is a pure mentorship or advisory match: there only the person asking for help needs their
 * gaps covered (a mentor doesn't need the mentee's skills).
 */
export function complementarityOf(
  a: MatchProfile,
  b: MatchProfile,
  rel: Relationship[],
  coverageAtoB: number,
  coverageBtoA: number,
): number {
  const mutual = rel.includes("cofounder") || rel.includes("paid");
  if (mutual) return Math.min(coverageAtoB, coverageBtoA);

  const seeksHelp = (p: MatchProfile) => p.seeking.includes("mentor") || p.seeking.includes("advisor");
  const aAsks = seeksHelp(a);
  const bAsks = seeksHelp(b);
  if (aAsks && !bAsks) return coverageBtoA;
  if (bAsks && !aAsks) return coverageAtoB;
  return Math.min(coverageAtoB, coverageBtoA);
}

// ---------------------------------------------------------------------------
// 3. Overlap penalty
// ---------------------------------------------------------------------------

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// ---------------------------------------------------------------------------
// 4. Intent and commitment fit
// ---------------------------------------------------------------------------

const TIMELINE_ORDER = ["now", "1-3m", "3-6m", "exploring"];

export function hoursFit(a: number, b: number): number {
  const hi = Math.max(a, b);
  if (hi === 0) return 1;
  return 1 - Math.abs(a - b) / hi;
}

export function compensationFit(a: MatchProfile, b: MatchProfile, rel: Relationship[]): number {
  if (a.compensation === b.compensation) return 1;
  if (a.compensation === "mix" || b.compensation === "mix") return 0.7;
  // One wants equity, the other cash. That is a real mismatch for co-founders, but
  // natural for paid work, where one side pays cash and the other wants to be paid.
  return rel.includes("paid") ? 0.8 : 0.2;
}

export function timelineFit(a: MatchProfile, b: MatchProfile): number {
  const d = Math.abs(TIMELINE_ORDER.indexOf(a.timeline) - TIMELINE_ORDER.indexOf(b.timeline));
  return 1 - d / (TIMELINE_ORDER.length - 1);
}

export function intentFit(a: MatchProfile, b: MatchProfile, rel: Relationship[]): number {
  return (
    0.4 * hoursFit(a.hoursPerWeek, b.hoursPerWeek) +
    0.35 * compensationFit(a, b, rel) +
    0.25 * timelineFit(a, b)
  );
}

// ---------------------------------------------------------------------------
// 5. Working style and values fit
// ---------------------------------------------------------------------------

export function styleFit(a: MatchProfile, b: MatchProfile): number {
  const comm =
    a.commStyle === b.commStyle ? 1 : a.commStyle === "mixed" || b.commStyle === "mixed" ? 0.7 : 0.3;
  const pace = 1 - Math.abs(a.pace - b.pace) / 4;
  const risk = 1 - Math.abs(a.riskTolerance - b.riskTolerance) / 4;
  return (comm + pace + risk) / 3;
}

// ---------------------------------------------------------------------------
// 6. Proof of work
// ---------------------------------------------------------------------------

export function proofScore(p: MatchProfile): number {
  if (p.proofVerified) return 1;
  return p.proofUrl.trim() ? 0.5 : 0;
}

// ---------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------

export interface ScoreOptions {
  /** Pairs (from pairKey) that must never match: declined intros or "not interested". */
  blockedPairs?: Set<string>;
}

export function scorePair(a: MatchProfile, b: MatchProfile, opts: ScoreOptions = {}): MatchResult {
  if (opts.blockedPairs?.has(pairKey(a.id, b.id))) return { ok: false, reason: "declined" };
  if (!locationCompatible(a, b)) return { ok: false, reason: "location" };
  const relationships = sharedRelationships(a, b);
  if (relationships.length === 0) return { ok: false, reason: "relationship" };

  const coverageAtoB = coverage(a, b);
  const coverageBtoA = coverage(b, a);
  const complementarity = complementarityOf(a, b, relationships, coverageAtoB, coverageBtoA);
  // Nobody's strengths help the other: not a lead, however well everything else fits.
  if (complementarity === 0) return { ok: false, reason: "no_complement" };

  const breakdown: ScoreBreakdown = {
    complementarity,
    coverageAtoB,
    coverageBtoA,
    distinctness: 1 - jaccard(a.strengths, b.strengths),
    intent: intentFit(a, b, relationships),
    style: styleFit(a, b),
    proof: (proofScore(a) + proofScore(b)) / 2,
  };

  const total =
    WEIGHTS.complementarity * breakdown.complementarity +
    WEIGHTS.distinctness * breakdown.distinctness +
    WEIGHTS.intent * breakdown.intent +
    WEIGHTS.style * breakdown.style +
    WEIGHTS.proof * breakdown.proof;

  return {
    ok: true,
    score: Math.round(total * 10000) / 100,
    breakdown,
    relationships,
    tiebreak: textSimilarity(a.freeText, b.freeText),
  };
}

export interface RankedLead {
  other: MatchProfile;
  score: number;
  breakdown: ScoreBreakdown;
  relationships: Relationship[];
  tiebreak: number;
}

/** All leads for `me`, best first. Ties on score are broken by free-text similarity. */
export function rankLeads(
  me: MatchProfile,
  others: MatchProfile[],
  opts: ScoreOptions & { minScore?: number } = {},
): RankedLead[] {
  const min = opts.minScore ?? MIN_SCORE;
  const out: RankedLead[] = [];
  for (const other of others) {
    if (other.id === me.id) continue;
    const r = scorePair(me, other, opts);
    if (r.ok && r.score >= min) out.push({ other, ...r });
  }
  return out.sort((x, y) => y.score - x.score || y.tiebreak - x.tiebreak);
}
