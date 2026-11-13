import type { MatchProfile } from "./matching/types";
import type { CommStyle, Compensation, OpenToKey, SeekingKey, Timeline } from "./taxonomy";

/** A row of public.profiles (the private, owner-only table). */
export interface ProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string;
  city: string;
  remote_ok: boolean;
  meet_in_person: boolean;
  achievements: string;
  strengths: string[];
  strengths_note: string;
  weaknesses: string[];
  weaknesses_note: string;
  priorities: string;
  seeking: SeekingKey[];
  open_to: OpenToKey[];
  needs: string[];
  hours_per_week: number;
  compensation: Compensation;
  timeline: Timeline;
  comm_style: CommStyle;
  pace: number;
  risk_tolerance: number;
  proof_url: string;
  proof_verified: boolean;
  contact_email: string;
  contact_linkedin: string;
  public_fields: string[];
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

/** A row of public.public_profiles. Fields the owner kept private are null. */
export type PublicProfileRow = {
  [K in keyof Omit<ProfileRow, "contact_email" | "contact_linkedin" | "public_fields" | "created_at">]:
    | ProfileRow[K]
    | null;
} & { id: string; full_name: string; onboarded: boolean };

/** Columns a user may edit on their own profile (matches the column grants in the migration). */
export const EDITABLE_COLUMNS = [
  "full_name", "avatar_url", "headline", "city", "remote_ok", "meet_in_person", "achievements",
  "strengths", "strengths_note", "weaknesses", "weaknesses_note", "priorities", "seeking", "open_to",
  "needs", "hours_per_week", "compensation", "timeline", "comm_style", "pace", "risk_tolerance",
  "proof_url", "contact_email", "contact_linkedin", "public_fields", "onboarded",
] as const;
export type EditableProfile = Pick<ProfileRow, (typeof EDITABLE_COLUMNS)[number]>;

export function toMatchProfile(p: ProfileRow): MatchProfile {
  return {
    id: p.id,
    city: p.city,
    remoteOk: p.remote_ok,
    seeking: p.seeking,
    openTo: p.open_to,
    strengths: p.strengths,
    weaknesses: p.weaknesses,
    needs: p.needs,
    hoursPerWeek: p.hours_per_week,
    compensation: p.compensation,
    timeline: p.timeline,
    commStyle: p.comm_style,
    pace: p.pace,
    riskTolerance: p.risk_tolerance,
    proofUrl: p.proof_url,
    proofVerified: p.proof_verified,
    freeText: [p.achievements, p.priorities, p.strengths_note, p.weaknesses_note].join("\n"),
  };
}

export const firstName = (fullName: string | null | undefined) => (fullName ?? "").trim().split(/\s+/)[0] ?? "";

export const initials = (fullName: string | null | undefined) =>
  (fullName ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** The editable subset of a profile, in the shape the profile form uses. */
export function toFormInput(p: ProfileRow, fallbackEmail = "") {
  return {
    full_name: p.full_name,
    headline: p.headline,
    city: p.city || "Philadelphia",
    remote_ok: p.remote_ok,
    meet_in_person: p.meet_in_person,
    achievements: p.achievements,
    strengths: p.strengths,
    strengths_note: p.strengths_note,
    weaknesses: p.weaknesses,
    weaknesses_note: p.weaknesses_note,
    priorities: p.priorities,
    seeking: p.seeking,
    open_to: p.open_to,
    needs: p.needs,
    hours_per_week: p.hours_per_week,
    compensation: p.compensation,
    timeline: p.timeline,
    comm_style: p.comm_style,
    pace: p.pace,
    risk_tolerance: p.risk_tolerance,
    proof_url: p.proof_url,
    contact_email: p.contact_email || fallbackEmail,
    contact_linkedin: p.contact_linkedin,
    public_fields: p.public_fields,
  } as import("./validation").ProfileInput;
}
