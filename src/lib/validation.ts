import { z } from "zod";
import { COMM_STYLE, COMPENSATION, OPEN_TO, PUBLIC_FIELD_GROUPS, SEEKING, SKILL_KEYS, TIMELINE } from "./taxonomy";

const keys = <T extends readonly { key: string }[]>(list: T) =>
  list.map((x) => x.key) as [T[number]["key"], ...T[number]["key"][]];

const skill = z.enum(SKILL_KEYS as [string, ...string[]]);
const text = (max: number) => z.string().trim().max(max);
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Must be a full link starting with https://");

/** Validates everything a user can save on their own profile. */
export const ProfileInput = z.object({
  full_name: text(120).min(1, "Please add your name"),
  headline: text(120),
  city: text(80).min(1, "Please add your city"),
  remote_ok: z.boolean(),
  meet_in_person: z.boolean(),
  achievements: text(2000),
  strengths: z.array(skill).max(5, "Pick up to 5 strengths"),
  strengths_note: text(600),
  weaknesses: z.array(skill).max(8),
  weaknesses_note: text(600),
  priorities: text(1000),
  seeking: z.array(z.enum(keys(SEEKING))).min(1, "Pick at least one thing you're looking for"),
  open_to: z.array(z.enum(keys(OPEN_TO))),
  needs: z.array(skill).max(8),
  hours_per_week: z.number().int().min(0).max(80),
  compensation: z.enum(keys(COMPENSATION)),
  timeline: z.enum(keys(TIMELINE)),
  comm_style: z.enum(keys(COMM_STYLE)),
  pace: z.number().int().min(1).max(5),
  risk_tolerance: z.number().int().min(1).max(5),
  proof_url: url,
  contact_email: z.string().trim().max(200).refine((v) => v === "" || /.+@.+\..+/.test(v), "Not a valid email"),
  contact_linkedin: url,
  public_fields: z.array(z.enum(keys(PUBLIC_FIELD_GROUPS))),
});
export type ProfileInput = z.infer<typeof ProfileInput>;
