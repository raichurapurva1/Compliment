import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SKILLS, SKILL_KEYS, labelOf, SEEKING, OPEN_TO } from "./taxonomy";
import type { ProfileRow, PublicProfileRow } from "./profile";

const MODEL = "claude-opus-5-5";
// If a request is declined by a safety classifier, retry it on Anthropic's recommended
// fallback model inside the same call instead of failing.
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

const client = () => new Anthropic();

// ---------------------------------------------------------------------------
// Resume / LinkedIn PDF parsing
// ---------------------------------------------------------------------------

const skillEnum = z.enum(SKILL_KEYS as [string, ...string[]]);

const ResumeExtraction = z.object({
  full_name: z.string().describe("The person's name, or empty if not found"),
  headline: z.string().describe("Current role and company in under 80 characters, e.g. 'Founder, Loop Health'"),
  achievements: z
    .string()
    .describe("2-4 sentences on the most impressive things they built, shipped or achieved, with numbers where the document gives them"),
  strengths: z.array(skillEnum).describe("Up to 5 skill areas this person is clearly strong in, strongest first"),
  strengths_note: z.string().describe("One sentence of specifics behind those strengths"),
  likely_gaps: z
    .array(skillEnum)
    .describe("Up to 4 skill areas the document shows little or no evidence of, that a builder like this often needs help with"),
  skills_mentioned: z.array(z.string()).describe("Specific tools, languages or skills named in the document"),
  proof_url: z.string().describe("A portfolio, GitHub, or product URL from the document, or empty"),
  linkedin_url: z.string().describe("Their LinkedIn URL if present, or empty"),
});
export type ResumeExtraction = z.infer<typeof ResumeExtraction>;

export async function extractFromResume(pdfBase64: string): Promise<ResumeExtraction> {
  const taxonomy = SKILLS.map((s) => `${s.key} = ${s.label}`).join("\n");
  const response = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(ResumeExtraction) },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          {
            type: "text",
            text:
              "This is a resume or a LinkedIn profile export. Fill in a profile for a matching app that " +
              "connects builders with people whose skills complement theirs. Only use what the document " +
              "supports; leave fields empty rather than guessing. Map skills onto this taxonomy (use the keys):\n" +
              taxonomy,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude could not read this document.");
  const out = response.parsed_output;
  if (!out) throw new Error("Claude returned an unexpected format. Please fill the form in by hand.");
  return { ...out, strengths: out.strengths.slice(0, 5), likely_gaps: out.likely_gaps.slice(0, 4) };
}

// ---------------------------------------------------------------------------
// "Why you two might work"
// ---------------------------------------------------------------------------

function describe(p: Partial<ProfileRow> | PublicProfileRow, label: string) {
  const skills = (xs: string[] | null | undefined) =>
    xs?.length ? xs.map((k) => labelOf(SKILLS, k)).join(", ") : "(not shared)";
  const text = (s: string | null | undefined) => (s && s.trim() ? s.trim() : "(not shared)");
  return [
    `## ${label}: ${p.full_name || "(no name)"}`,
    `Role: ${text(p.headline)}`,
    `What they've built: ${text(p.achievements)}`,
    `Strengths: ${skills(p.strengths)}. ${p.strengths_note ?? ""}`,
    `Weaknesses: ${skills(p.weaknesses)}. ${p.weaknesses_note ?? ""}`,
    `Current priorities: ${text(p.priorities)}`,
    `Looking for: ${(p.seeking ?? []).map((k) => labelOf(SEEKING, k)).join(", ") || "(not shared)"}`,
    `Open to: ${(p.open_to ?? []).map((k) => labelOf(OPEN_TO, k)).join(", ") || "(not shared)"}`,
    `Skills they need: ${skills(p.needs)}`,
  ].join("\n");
}

/**
 * One paragraph on why two people might work well together, written to `viewer`.
 * Uses the viewer's full profile but only the other person's public fields.
 */
export async function whyYouTwo(viewer: ProfileRow, other: PublicProfileRow): Promise<string> {
  const response = await client().beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    ...FALLBACK,
    output_config: { effort: "low" },
    system:
      "You write short, warm, specific notes for a private matchmaking app for builders. " +
      "Write one paragraph of 3-4 sentences, addressed to the reader as 'you', about why they and " +
      "the other person might work well together, grounded only in the profiles given. Name one " +
      "concrete thing they could build or tackle together, and one honest thing to talk through " +
      "early. Plain text only, no lists, no headings, no flattery.",
    messages: [
      {
        role: "user",
        content: `${describe(viewer, "Reader (you)")}\n\n${describe(other, "Other person")}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude could not write this one.");
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}
