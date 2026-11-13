import type { CommStyle, Compensation, OpenToKey, SeekingKey, Timeline } from "../taxonomy";

/** Everything the matcher needs to know about one person. */
export interface MatchProfile {
  id: string;
  city: string;
  remoteOk: boolean;
  seeking: SeekingKey[];
  openTo: OpenToKey[];
  strengths: string[];
  weaknesses: string[];
  needs: string[];
  hoursPerWeek: number;
  compensation: Compensation;
  timeline: Timeline;
  commStyle: CommStyle;
  pace: number; // 1..5
  riskTolerance: number; // 1..5
  proofUrl: string;
  proofVerified: boolean;
  /** Free-text answers (achievements, priorities, notes). Only used as a tiebreaker. */
  freeText: string;
}

export type Relationship = "cofounder" | "paid" | "mentorship" | "advisory";

export interface ScoreBreakdown {
  /** Each component is 0..1 before weighting. */
  complementarity: number;
  /** A's strengths vs B's needs, and B's strengths vs A's needs (complementarity is the lower one). */
  coverageAtoB: number;
  coverageBtoA: number;
  /** 1 = strengths fully distinct, 0 = identical. */
  distinctness: number;
  intent: number;
  style: number;
  proof: number;
}

export type FilterReason = "location" | "relationship" | "declined" | "no_complement";

export type MatchResult =
  | { ok: false; reason: FilterReason }
  | {
      ok: true;
      /** 0..100 */
      score: number;
      breakdown: ScoreBreakdown;
      relationships: Relationship[];
      /** Free-text similarity, 0..1. Used only to order leads with equal scores. */
      tiebreak: number;
    };
