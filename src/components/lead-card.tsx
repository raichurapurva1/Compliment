"use client";

import { useState, useTransition } from "react";
import { generateWhy, passLead, requestIntro, respondIntro } from "@/app/actions";
import type { ScoreBreakdown } from "@/lib/matching/types";
import { WEIGHTS } from "@/lib/matching/score";
import type { PublicProfileRow } from "@/lib/profile";
import { Avatar, Chips } from "./public-profile-card";

export type IntroState =
  | { kind: "none" }
  | { kind: "requested" }
  | { kind: "incoming"; introId: string }
  | { kind: "accepted" };

const RELATIONSHIP_LABEL: Record<string, string> = {
  cofounder: "Co-founder",
  paid: "Paid collaboration",
  mentorship: "Mentorship",
  advisory: "Advisory",
};

export function LeadCard(props: {
  person: PublicProfileRow;
  score: number;
  breakdown: ScoreBreakdown;
  relationships: string[];
  reason: string;
  why: string | null;
  intro: IntroState;
  claudeEnabled: boolean;
}) {
  const { person: p, breakdown: b } = props;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState("");
  const [why, setWhy] = useState(props.why);
  const [showDetails, setShowDetails] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong");
    });

  const parts: [string, number, number][] = [
    ["Complementary skills", b.complementarity, WEIGHTS.complementarity],
    ["Distinct strengths", b.distinctness, WEIGHTS.distinctness],
    ["Commitment fit", b.intent, WEIGHTS.intent],
    ["Working style", b.style, WEIGHTS.style],
    ["Proof of work", b.proof, WEIGHTS.proof],
  ];

  return (
    <article className="card p-5">
      <div className="flex gap-4">
        <Avatar name={p.full_name} url={p.avatar_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{p.full_name}</h3>
              <p className="text-sm text-muted">
                {[p.headline, p.city].filter(Boolean).join(" · ") || "Details kept private"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {props.relationships.map((r) => (
                  <span key={r} className="rounded-full bg-warm-soft px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {RELATIONSHIP_LABEL[r] ?? r}
                  </span>
                ))}
              </div>
            </div>
            <ScoreBadge score={props.score} />
          </div>

          <p className="mt-3 text-sm leading-relaxed">{props.reason}</p>

          {why && (
            <p className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-sm leading-relaxed text-ink">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-accent">Why you two might work</span>
              {why}
            </p>
          )}

          {(p.strengths?.length || p.needs?.length) ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {p.strengths && p.strengths.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted">Strong in</p>
                  <Chips items={p.strengths} tone="accent" />
                </div>
              )}
              {p.needs && p.needs.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted">Needs</p>
                  <Chips items={p.needs} />
                </div>
              )}
            </div>
          ) : null}

          {showDetails && (
            <div className="mt-4 space-y-2 rounded-xl bg-paper p-3">
              {parts.map(([label, value, weight]) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <span className="w-40 text-muted">
                    {label} <span className="opacity-60">({Math.round(weight * 100)}%)</span>
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums">{Math.round(value * 100)}</span>
                </div>
              ))}
              {p.achievements && <p className="pt-2 text-xs leading-relaxed text-muted">Built: {p.achievements}</p>}
              {p.proof_url && (
                <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-block pt-1 text-xs text-accent hover:underline">
                  Proof of work ↗ {p.proof_verified && "(link checked)"}
                </a>
              )}
            </div>
          )}

          {composing && (
            <div className="mt-4 space-y-2">
              <textarea
                className="field min-h-20"
                placeholder={`Optional note to ${p.full_name.split(" ")[0]}: what you'd like to explore together`}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="hint">They&apos;ll see your public profile and this note. Contact details unlock only if they accept.</p>
            </div>
          )}

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {props.intro.kind === "none" &&
              (composing ? (
                <>
                  <button className="btn-primary" disabled={pending} onClick={() =>
                      run(async () => {
                        const r = await requestIntro(p.id, note);
                        if (r.ok) setComposing(false);
                        return r;
                      })
                    }
                  >
                    {pending ? "Sending…" : "Send intro request"}
                  </button>
                  <button className="btn-ghost" onClick={() => setComposing(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => setComposing(true)}>
                  Request intro
                </button>
              ))}
            {props.intro.kind === "requested" && (
              <span className="rounded-lg bg-paper px-3 py-2 text-sm text-muted ring-1 ring-line">
                Intro requested · waiting for {p.full_name.split(" ")[0]}
              </span>
            )}
            {props.intro.kind === "incoming" && (
              <>
                <button
                  className="btn-primary"
                  disabled={pending}
                  onClick={() => run(() => respondIntro((props.intro as { introId: string }).introId, true))}
                >
                  Accept intro
                </button>
                <button
                  className="btn-secondary"
                  disabled={pending}
                  onClick={() => run(() => respondIntro((props.intro as { introId: string }).introId, false))}
                >
                  Decline
                </button>
              </>
            )}
            {props.intro.kind === "accepted" && (
              <span className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Connected · see Connections above</span>
            )}

            <button className="btn-ghost" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? "Hide details" : "Score details"}
            </button>
            {props.claudeEnabled && !why && (
              <button
                className="btn-ghost"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const r = await generateWhy(p.id);
                    if (r.ok && r.text) setWhy(r.text);
                    return r;
                  })
                }
              >
                {pending ? "Thinking…" : "Why you two?"}
              </button>
            )}
            {props.intro.kind === "none" && !composing && (
              <button
                className="btn-ghost ml-auto text-xs"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Hide ${p.full_name} from your leads? You won't be matched again.`)) run(() => passLead(p.id));
                }}
              >
                Not interested
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const s = Math.round(score);
  const tone = s >= 75 ? "text-good bg-good-soft" : s >= 55 ? "text-accent bg-accent-soft" : "text-muted bg-paper";
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-1.5 ${tone}`} title="Match score out of 100">
      <span className="text-xl font-semibold tabular-nums leading-none">{s}</span>
      <span className="text-[10px] uppercase tracking-wide">match</span>
    </div>
  );
}
