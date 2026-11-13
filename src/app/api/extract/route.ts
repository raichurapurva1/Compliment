import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { extractFromResume } from "@/lib/claude";
import { env } from "@/lib/env";

export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

// Parses an uploaded resume or LinkedIn "Save to PDF" export with Claude and returns
// suggested profile fields. The file is not stored anywhere.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  if (!env.claudeEnabled()) {
    return NextResponse.json(
      { error: "Resume parsing is off. Add ANTHROPIC_API_KEY to .env.local to turn it on." },
      { status: 501 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Please upload a PDF." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "PDF must be under 10 MB." }, { status: 400 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extracted = await extractFromResume(base64);
    return NextResponse.json({ extracted });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The Anthropic API key was rejected." }, { status: 502 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Claude is busy right now. Try again in a minute." }, { status: 503 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude error: ${e.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read that PDF." }, { status: 500 });
  }
}
