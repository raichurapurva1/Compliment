// Fixed vocabularies shared by the questionnaire, the matcher and the database checks.

export const SKILLS = [
  { key: "engineering", label: "Software engineering" },
  { key: "ai_ml", label: "AI / ML" },
  { key: "data", label: "Data & analytics" },
  { key: "product", label: "Product management" },
  { key: "design", label: "Product & UX design" },
  { key: "brand", label: "Brand & visual design" },
  { key: "growth_marketing", label: "Growth marketing" },
  { key: "content", label: "Content creation" },
  { key: "community", label: "Community building" },
  { key: "sales", label: "Sales" },
  { key: "partnerships", label: "Partnerships & BD" },
  { key: "fundraising", label: "Fundraising" },
  { key: "finance", label: "Finance & accounting" },
  { key: "operations", label: "Operations" },
  { key: "legal", label: "Legal & compliance" },
  { key: "recruiting", label: "Hiring & recruiting" },
  { key: "customer_success", label: "Customer success" },
  { key: "hardware", label: "Hardware & manufacturing" },
] as const;

export type SkillKey = (typeof SKILLS)[number]["key"];
export const SKILL_KEYS = SKILLS.map((s) => s.key) as SkillKey[];
const SKILL_LABELS = Object.fromEntries(SKILLS.map((s) => [s.key, s.label])) as Record<string, string>;
export const skillLabel = (key: string) => SKILL_LABELS[key] ?? key;

export const SEEKING = [
  { key: "cofounder", label: "A co-founder" },
  { key: "paid_collaborator", label: "A paid collaborator" },
  { key: "mentor", label: "A mentor" },
  { key: "advisor", label: "An advisor" },
] as const;
export type SeekingKey = (typeof SEEKING)[number]["key"];

export const OPEN_TO = [
  { key: "cofounder", label: "Being a co-founder" },
  { key: "paid_work", label: "Paid project work" },
  { key: "mentoring", label: "Mentoring someone" },
  { key: "advising", label: "Advising a team" },
] as const;
export type OpenToKey = (typeof OPEN_TO)[number]["key"];

export const COMPENSATION = [
  { key: "equity", label: "Equity" },
  { key: "cash", label: "Cash" },
  { key: "mix", label: "A mix / flexible" },
] as const;
export type Compensation = (typeof COMPENSATION)[number]["key"];

export const TIMELINE = [
  { key: "now", label: "Ready now" },
  { key: "1-3m", label: "In 1–3 months" },
  { key: "3-6m", label: "In 3–6 months" },
  { key: "exploring", label: "Just exploring" },
] as const;
export type Timeline = (typeof TIMELINE)[number]["key"];

export const COMM_STYLE = [
  { key: "async", label: "Mostly async (docs, messages)" },
  { key: "sync", label: "Mostly live (calls, in person)" },
  { key: "mixed", label: "A mix" },
] as const;
export type CommStyle = (typeof COMM_STYLE)[number]["key"];

export const PACE_LABELS = ["", "Slow & steady", "Steady", "Balanced", "Fast", "All-out sprint"];
export const RISK_LABELS = ["", "Very cautious", "Cautious", "Balanced", "Bold", "Very bold"];

// Fields a user can choose to show to other people. Name and photo are always shown;
// contact details are never shown until an intro is accepted by both sides.
export const PUBLIC_FIELD_GROUPS = [
  { key: "headline", label: "Role / headline" },
  { key: "location", label: "Location & meeting preference" },
  { key: "achievements", label: "What I've built" },
  { key: "strengths", label: "Strengths" },
  { key: "weaknesses", label: "Weaknesses" },
  { key: "priorities", label: "Current priorities" },
  { key: "looking_for", label: "What I'm looking for & skills I need" },
  { key: "commitment", label: "Hours, equity/cash, timeline" },
  { key: "work_style", label: "Working style" },
  { key: "proof", label: "Proof of work link" },
] as const;
export type PublicFieldGroup = (typeof PUBLIC_FIELD_GROUPS)[number]["key"];

export const labelOf = <T extends readonly { key: string; label: string }[]>(list: T, key: string) =>
  list.find((x) => x.key === key)?.label ?? key;
