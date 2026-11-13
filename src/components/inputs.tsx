"use client";

type Option = { readonly key: string; readonly label: string };

export function ChipSelect({
  options,
  value,
  onChange,
  max,
  tone = "accent",
}: {
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  tone?: "accent" | "warm";
}) {
  const full = max !== undefined && value.length >= max;
  const on = tone === "warm" ? "bg-warm-soft text-amber-800 ring-amber-300" : "bg-accent-soft text-accent ring-accent/40";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={selected}
            disabled={!selected && full}
            onClick={() => onChange(selected ? value.filter((x) => x !== o.key) : [...value, o.key])}
            className={`rounded-full px-3 py-1 text-sm ring-1 transition disabled:opacity-40 ${
              selected ? on : "bg-white text-ink ring-line hover:ring-accent/40"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly Option[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-paper p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            value === o.key ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
