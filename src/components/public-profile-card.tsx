import { initials, type PublicProfileRow } from "@/lib/profile";
import { COMPENSATION, OPEN_TO, PACE_LABELS, SEEKING, TIMELINE, labelOf, skillLabel } from "@/lib/taxonomy";

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "accent" | "warm" }) {
  const cls =
    tone === "accent"
      ? "bg-accent-soft text-accent"
      : tone === "warm"
        ? "bg-warm-soft text-amber-800"
        : "bg-paper text-ink ring-1 ring-line";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs ${cls}`}>
          {skillLabel(k)}
        </span>
      ))}
    </div>
  );
}

/** Renders whatever the public_profiles row contains. Private fields arrive as null. */
export function PublicProfileCard({ p }: { p: PublicProfileRow }) {
  return (
    <div className="card space-y-4 p-5 text-sm">
      <div className="flex items-center gap-3">
        <Avatar name={p.full_name} url={p.avatar_url} size={44} />
        <div>
          <p className="font-semibold">{p.full_name || "Your name"}</p>
          {p.headline && <p className="text-muted">{p.headline}</p>}
          {p.city && <p className="text-xs text-muted">{p.city}{p.remote_ok ? " · remote OK" : ""}</p>}
        </div>
      </div>
      {p.achievements && <Block title="Built">{p.achievements}</Block>}
      {p.strengths && p.strengths.length > 0 && (
        <Block title="Strengths">
          <Chips items={p.strengths} tone="accent" />
        </Block>
      )}
      {p.weaknesses && p.weaknesses.length > 0 && (
        <Block title="Weaknesses">
          <Chips items={p.weaknesses} tone="warm" />
        </Block>
      )}
      {p.needs && (
        <Block title="Looking for">
          <p>
            {[...(p.seeking ?? []).map((k) => labelOf(SEEKING, k))].join(", ") || "—"}
            {p.open_to && p.open_to.length > 0 && (
              <span className="text-muted"> · open to {p.open_to.map((k) => labelOf(OPEN_TO, k).toLowerCase()).join(", ")}</span>
            )}
          </p>
          {p.needs.length > 0 && (
            <div className="mt-2">
              <Chips items={p.needs} />
            </div>
          )}
        </Block>
      )}
      {p.priorities && <Block title="Priorities">{p.priorities}</Block>}
      {p.hours_per_week !== null && (
        <Block title="Commitment">
          {p.hours_per_week} h/week · {labelOf(COMPENSATION, p.compensation ?? "")} · {labelOf(TIMELINE, p.timeline ?? "")}
        </Block>
      )}
      {p.pace !== null && <Block title="Pace">{PACE_LABELS[p.pace]}</Block>}
      {p.proof_url && (
        <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          Proof of work ↗{p.proof_verified && <span className="rounded bg-good-soft px-1.5 text-xs text-good">link checked</span>}
        </a>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
