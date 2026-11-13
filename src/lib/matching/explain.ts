// Plain-English reasons for a match, written for one viewer.
//
// A reason must never leak the other person's private fields, so it only names their
// strengths, needs or weaknesses when they made those public. Otherwise it says how many
// skills line up without naming them.

import { skillLabel } from "../taxonomy";
import { demandOf } from "./score";
import type { MatchProfile, Relationship, ScoreBreakdown } from "./types";

export interface ExplainInput {
  viewer: MatchProfile;
  other: MatchProfile;
  otherFirstName: string;
  /** Field groups the other person made public. */
  otherPublic: string[];
  breakdown: ScoreBreakdown;
  relationships: Relationship[];
}

const list = (items: string[]) => {
  const labels = items.map(skillLabel);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

const RELATIONSHIP_TEXT: Record<Relationship, string> = {
  cofounder: "You're both looking for a co-founder.",
  paid: "One of you wants paid help and the other is open to paid work.",
  mentorship: "One of you is looking for a mentor and the other is open to mentoring.",
  advisory: "One of you wants an advisor and the other is open to advising.",
};

export function explainMatch({ viewer, other, otherFirstName, otherPublic, breakdown, relationships }: ExplainInput): string {
  const name = otherFirstName || "They";
  const parts: string[] = [];

  const viewerDemand = demandOf(viewer);
  const theyCover = other.strengths.filter((s) => viewerDemand.has(s));
  if (theyCover.length > 0) {
    parts.push(
      otherPublic.includes("strengths")
        ? `${name}'s strength${theyCover.length > 1 ? "s" : ""} in ${list(theyCover)} cover${theyCover.length > 1 ? "" : "s"} what you need.`
        : `${name} is strong in ${theyCover.length} of the areas you need help with.`,
    );
  }

  const visibleOtherDemand = new Set<string>([
    ...(otherPublic.includes("looking_for") ? other.needs : []),
    ...(otherPublic.includes("weaknesses") ? other.weaknesses : []),
  ]);
  const youCoverVisible = viewer.strengths.filter((s) => visibleOtherDemand.has(s));
  if (youCoverVisible.length > 0) {
    parts.push(`You bring ${list(youCoverVisible)}, which is on their list.`);
  } else if (breakdown.coverageBtoA > 0) {
    parts.push("Your strengths also fill gaps they've told us about.");
  }

  if (relationships.length > 0) parts.push(RELATIONSHIP_TEXT[relationships[0]]);
  if (breakdown.intent >= 0.8) parts.push("Your time commitment and timelines line up well.");
  if (breakdown.style >= 0.8) parts.push("You have similar working styles.");
  if (breakdown.distinctness < 0.5) parts.push("Heads up: your strengths overlap a lot.");
  if (otherPublic.includes("proof") && other.proofUrl) {
    parts.push(other.proofVerified ? "They've shared proof of work we could open." : "They've shared proof of work.");
  }

  return parts.join(" ") || "You meet each other's basic criteria.";
}
