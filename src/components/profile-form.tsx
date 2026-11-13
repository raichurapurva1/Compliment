"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveProfile } from "@/app/actions";
import type { ProfileInput } from "@/lib/validation";
import {
  COMM_STYLE,
  COMPENSATION,
  OPEN_TO,
  PACE_LABELS,
  PUBLIC_FIELD_GROUPS,
  RISK_LABELS,
  SEEKING,
  SKILLS,
  TIMELINE,
  type PublicFieldGroup,
} from "@/lib/taxonomy";
import { ChipSelect, Segmented } from "./inputs";
import { ResumeUpload } from "./resume-upload";

type Mode = "onboarding" | "edit";

const STEPS = ["Resume", "About you", "Strengths", "Looking for", "How you work", "Privacy"] as const;

export function ProfileForm({
  initial,
  mode,
  claudeEnabled,
}: {
  initial: ProfileInput;
  mode: Mode;
  claudeEnabled: boolean;
}) {
  const [v, setV] = useState<ProfileInput>(initial);
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [filledFromResume, setFilledFromResume] = useState(false);

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };
  const isPublic = (g: PublicFieldGroup) => v.public_fields.includes(g);
  const togglePublic = (g: PublicFieldGroup) =>
    set("public_fields", isPublic(g) ? v.public_fields.filter((x) => x !== g) : [...v.public_fields, g]);

  const submit = (finishOnboarding: boolean) =>
    start(async () => {
      const r = await saveProfile(v, { finishOnboarding });
      if (r && !r.ok) setResult({ ok: false, text: r.error });
      else if (r?.ok) setResult({ ok: true, text: r.message ?? "Saved." });
    });

  const vis = (g: PublicFieldGroup) => <Visibility on={isPublic(g)} onToggle={() => togglePublic(g)} />;

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  const about = (
    <Section title="About you" subtitle="The basics, and the proof that you ship.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" hint="Always visible to members.">
          <input className="field" value={v.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field label="Role / headline" extra={vis("headline")}>
          <input
            className="field"
            placeholder="Founder, Loop Health"
            value={v.headline}
            onChange={(e) => set("headline", e.target.value)}
          />
        </Field>
        <Field label="City" extra={vis("location")}>
          <input className="field" value={v.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <div className="space-y-2 pt-6 text-sm">
          <Check checked={v.remote_ok} onChange={(x) => set("remote_ok", x)}>
            I&apos;m open to working with people remotely
          </Check>
          <Check checked={v.meet_in_person} onChange={(x) => set("meet_in_person", x)}>
            I&apos;m willing to meet in person
          </Check>
        </div>
      </div>
      <Field
        label="What I've built or achieved"
        hint="Products shipped, revenue, users, teams led. Specifics beat adjectives."
        extra={vis("achievements")}
      >
        <textarea
          className="field min-h-28"
          value={v.achievements}
          onChange={(e) => set("achievements", e.target.value)}
        />
      </Field>
      <Field
        label="Proof of work link"
        hint="Portfolio, GitHub, or a shipped product. Links that open get a verified badge and a visibility boost."
        extra={vis("proof")}
      >
        <input
          className="field"
          placeholder="https://"
          value={v.proof_url}
          onChange={(e) => set("proof_url", e.target.value)}
        />
      </Field>
    </Section>
  );

  const strengths = (
    <Section title="Strengths and weaknesses" subtitle="Be honest. Your gaps are how we find your matches.">
      <Field label={`My top strengths (${v.strengths.length}/5)`} extra={vis("strengths")}>
        <ChipSelect options={SKILLS} value={v.strengths} max={5} onChange={(x) => set("strengths", x)} />
        <textarea
          className="field mt-3 min-h-16"
          placeholder="Anything specific? e.g. 'Built ML pipelines at Comcast for 6 years'"
          value={v.strengths_note}
          onChange={(e) => set("strengths_note", e.target.value)}
        />
      </Field>
      <Field label="My honest weaknesses" hint="Private by default." extra={vis("weaknesses")}>
        <ChipSelect
          options={SKILLS}
          value={v.weaknesses}
          max={8}
          tone="warm"
          onChange={(x) => set("weaknesses", x)}
        />
        <textarea
          className="field mt-3 min-h-16"
          placeholder="e.g. 'I avoid sales calls and I'm slow on design decisions'"
          value={v.weaknesses_note}
          onChange={(e) => set("weaknesses_note", e.target.value)}
        />
      </Field>
    </Section>
  );

  const lookingFor = (
    <Section title="What I'm looking for" subtitle="Who you want to meet, and what you can offer others.">
      <Field label="I'm looking for" extra={vis("looking_for")}>
        <ChipSelect options={SEEKING} value={v.seeking} onChange={(x) => set("seeking", x as ProfileInput["seeking"])} />
      </Field>
      <Field label="I'm open to" hint="Others are matched with you when you're open to what they need.">
        <ChipSelect options={OPEN_TO} value={v.open_to} onChange={(x) => set("open_to", x as ProfileInput["open_to"])} />
      </Field>
      <Field label="Complementary skills I need">
        <ChipSelect options={SKILLS} value={v.needs} max={8} onChange={(x) => set("needs", x)} />
      </Field>
      <Field label="My current priorities" hint="What are you trying to get done in the next 3 months?" extra={vis("priorities")}>
        <textarea
          className="field min-h-20"
          value={v.priorities}
          onChange={(e) => set("priorities", e.target.value)}
        />
      </Field>
    </Section>
  );

  const howYouWork = (
    <Section title="How I work" subtitle="Used to find people you'll actually enjoy working with.">
      <div className="flex justify-end">{vis("commitment")}</div>
      <Field label={`Hours per week I can commit: ${v.hours_per_week}`}>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={v.hours_per_week}
          onChange={(e) => set("hours_per_week", Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </Field>
      <Field label="Equity or cash">
        <Segmented options={COMPENSATION} value={v.compensation} onChange={(x) => set("compensation", x as ProfileInput["compensation"])} />
      </Field>
      <Field label="Timeline">
        <Segmented options={TIMELINE} value={v.timeline} onChange={(x) => set("timeline", x as ProfileInput["timeline"])} />
      </Field>
      <div className="flex justify-end border-t border-line pt-4">{vis("work_style")}</div>
      <Field label="Communication">
        <Segmented options={COMM_STYLE} value={v.comm_style} onChange={(x) => set("comm_style", x as ProfileInput["comm_style"])} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Pace: ${PACE_LABELS[v.pace]}`}>
          <input
            type="range"
            min={1}
            max={5}
            value={v.pace}
            onChange={(e) => set("pace", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </Field>
        <Field label={`Risk tolerance: ${RISK_LABELS[v.risk_tolerance]}`}>
          <input
            type="range"
            min={1}
            max={5}
            value={v.risk_tolerance}
            onChange={(e) => set("risk_tolerance", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </Field>
      </div>
    </Section>
  );

  const privacy = (
    <Section
      title="Privacy and contact"
      subtitle="Contact details are only shared after you and a match both accept an intro."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email">
          <input className="field" value={v.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </Field>
        <Field label="LinkedIn URL">
          <input
            className="field"
            placeholder="https://www.linkedin.com/in/…"
            value={v.contact_linkedin}
            onChange={(e) => set("contact_linkedin", e.target.value)}
          />
        </Field>
      </div>
      <div>
        <p className="label">What other members can see</p>
        <p className="hint mb-3">Your name and photo are always shown. Everything else is your call.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PUBLIC_FIELD_GROUPS.map((g) => (
            <Check key={g.key} checked={isPublic(g.key)} onChange={() => togglePublic(g.key)}>
              {g.label}
            </Check>
          ))}
        </div>
      </div>
    </Section>
  );

  const feedback = result && (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-good-soft text-good" : "bg-red-50 text-red-700"}`}
      role="status"
    >
      {result.text}
    </p>
  );

  // -------------------------------------------------------------------------
  // Edit mode: everything on one page
  // -------------------------------------------------------------------------
  if (mode === "edit") {
    return (
      <div className="space-y-6">
        {about}
        {strengths}
        {lookingFor}
        {howYouWork}
        {privacy}
        <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex-1">{feedback}</div>
          <button className="btn-primary" disabled={pending} onClick={() => submit(false)}>
            {pending ? "Saving and rematching…" : "Save changes"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Onboarding: one step at a time
  // -------------------------------------------------------------------------
  const sections = [
    <Section key="resume" title="Start with your resume (optional)" subtitle="Save time: upload a resume or your LinkedIn profile as a PDF.">
      <ResumeUpload
        enabled={claudeEnabled}
        onExtracted={(x) => {
          setV((prev) => ({
            ...prev,
            full_name: prev.full_name || x.full_name,
            headline: x.headline || prev.headline,
            achievements: x.achievements || prev.achievements,
            strengths: x.strengths.length ? x.strengths : prev.strengths,
            strengths_note: x.strengths_note || prev.strengths_note,
            weaknesses: prev.weaknesses.length ? prev.weaknesses : x.likely_gaps,
            proof_url: x.proof_url || prev.proof_url,
            contact_linkedin: x.linkedin_url || prev.contact_linkedin,
          }));
          setFilledFromResume(true);
          setStep(1);
        }}
      />
      <p className="text-sm text-muted">
        On LinkedIn: open your profile, click <em>Resources</em> (or <em>More</em>), then <em>Save to PDF</em>.
      </p>
    </Section>,
    about,
    strengths,
    lookingFor,
    howYouWork,
    privacy,
  ];
  const last = step === sections.length - 1;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 font-medium ${
                i === step ? "bg-accent text-white" : i < step ? "bg-accent-soft text-accent" : "bg-white text-muted ring-1 ring-line"
              }`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>
      {filledFromResume && step > 0 && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          We filled in what we could from your resume. Please check every answer. You can change anything.
        </p>
      )}
      {sections[step]}
      {feedback}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        {last ? (
          <button className="btn-primary" disabled={pending} onClick={() => submit(true)}>
            {pending ? "Finding your matches…" : "Finish and see my matches"}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setStep(step + 1)}>
            {step === 0 ? "Skip / fill in by hand" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, extra, children }: { label: string; hint?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {extra}
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-[var(--color-accent)]"
      />
      {children}
    </label>
  );
}

function Visibility({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={on ? "Visible to members. Click to make private." : "Only you can see this. Click to make public."}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition ${
        on ? "bg-good-soft text-good ring-good/20" : "bg-paper text-muted ring-line"
      }`}
    >
      {on ? "Public" : "Private"}
    </button>
  );
}
