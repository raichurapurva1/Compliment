"use client";

import { useState, useTransition } from "react";
import { respondIntro } from "@/app/actions";
import type { PublicProfileRow } from "@/lib/profile";
import { Avatar } from "./public-profile-card";

export function IncomingIntro({ introId, person, message }: { introId: string; person: PublicProfileRow; message: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const answer = (accept: boolean) =>
    start(async () => {
      const r = await respondIntro(introId, accept);
      if (!r.ok) setError(r.error);
    });

  return (
    <div className="card flex flex-wrap items-center gap-4 border-accent/30 p-4">
      <Avatar name={person.full_name} url={person.avatar_url} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{person.full_name}</span> would like an intro.
        </p>
        {message && <p className="mt-1 text-sm italic text-muted">&ldquo;{message}&rdquo;</p>}
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending} onClick={() => answer(true)}>
          Accept
        </button>
        <button className="btn-secondary" disabled={pending} onClick={() => answer(false)}>
          Decline
        </button>
      </div>
    </div>
  );
}

export function Connection({
  person,
  contact,
}: {
  person: PublicProfileRow;
  contact: { full_name: string; contact_email: string; contact_linkedin: string };
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <Avatar name={person.full_name} url={person.avatar_url} />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{contact.full_name}</p>
        {contact.contact_email && (
          <a href={`mailto:${contact.contact_email}`} className="block truncate text-accent hover:underline">
            {contact.contact_email}
          </a>
        )}
        {contact.contact_linkedin && (
          <a href={contact.contact_linkedin} target="_blank" rel="noreferrer" className="block truncate text-accent hover:underline">
            LinkedIn ↗
          </a>
        )}
      </div>
    </div>
  );
}
