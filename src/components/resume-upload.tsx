"use client";

import { useState } from "react";
import type { ResumeExtraction } from "@/lib/claude";

export function ResumeUpload({
  enabled,
  onExtracted,
}: {
  enabled: boolean;
  onExtracted: (x: ResumeExtraction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-paper p-6 text-sm text-muted">
        Resume parsing is turned off on this server (no <code>ANTHROPIC_API_KEY</code>). You can skip this step and
        fill in the questionnaire by hand.
      </div>
    );
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/extract", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onExtracted(json.extracted as ResumeExtraction);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
          busy ? "border-accent bg-accent-soft" : "border-line bg-paper hover:border-accent/50"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <span className="text-sm font-medium">
          {busy ? "Claude is reading your PDF… (about 20 seconds)" : "Choose a PDF (resume or LinkedIn export)"}
        </span>
        <span className="text-xs text-muted">Used once to suggest answers. We don&apos;t store the file.</span>
      </label>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
