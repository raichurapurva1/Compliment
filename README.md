# Complement

A private matching tool that connects builders with people who have the skills they lack, for
co-founding, paid collaboration, mentoring or advising. Launch city: Philadelphia.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, row-level security) · Claude API (optional)

## What's in the prototype

| Area | Status |
| --- | --- |
| Email + password sign-in | Working |
| LinkedIn / Google sign-in | Code is in place but switched off ([setup steps below](#later-linkedin-and-google-sign-in)) |
| Questionnaire onboarding (6 steps) | Working |
| Resume / LinkedIn PDF upload, parsed by Claude | Working when `ANTHROPIC_API_KEY` is set; hidden otherwise |
| My Profile dashboard: edit everything, choose Public / Private per section, live "what others see" preview | Working |
| Leads dashboard: "What I need right now", match score, plain-English reason, score breakdown | Working |
| Double opt-in intros, contact details unlocked only after both accept | Working |
| "Not interested" (hides the match for both people, permanently) | Working |
| "Why you two might work" paragraph by Claude | Working when `ANTHROPIC_API_KEY` is set |
| Matching algorithm as a separate, tested module | `src/lib/matching/` |
| Row-level security on every table + a test that proves it | `supabase/migrations/`, `tests/rls.test.ts` |
| Seed script with 20 fake Philadelphia profiles | `scripts/seed.ts` |
| Draft privacy policy | `/privacy` |

## Setup (about 15 minutes)

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Open **SQL Editor**, paste the whole of `supabase/migrations/20261113000000_init.sql`, and click **Run**.
   (If you use the Supabase CLI instead: `supabase link` then `supabase db push`.)
3. Open **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (change it to your real domain when you deploy)
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` (and later `https://YOUR-DOMAIN/auth/callback`)
4. Optional, for a quick friends-only pilot: **Authentication → Sign In / Providers → Email**, turn off
   **Confirm email** so people can sign in immediately. If you leave it on, people get a confirmation
   link that lands on `/auth/callback`.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API Keys** (or **API**):

- `NEXT_PUBLIC_SUPABASE_URL`: the project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the `anon` / publishable key (safe for the browser)
- `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` / secret key (server only, never commit it)
- `ANTHROPIC_API_KEY` (optional): from [console.anthropic.com](https://console.anthropic.com). Turns on resume parsing and "Why you two?".

### 3. Run it

```bash
npm install
npm run seed     # 20 fake Philadelphia profiles + matches
npm run dev      # http://localhost:3000
```

Sign up with your own email, finish the questionnaire, and you'll land on your leads.

To see the other side of an intro, sign in as a seed profile in a private window:
`maya.okafor@seed.complement.test` (any seed name, lowercased, dots for spaces) with password
`complement-demo-1`. Remove all seed accounts with `npm run seed -- --reset`.

### 4. Invite your five friends

Deploy (for example to Vercel: import the repo, add the same environment variables, deploy), add the
production `https://YOUR-DOMAIN/auth/callback` to Supabase's Redirect URLs, and set the Site URL to your
domain. Each friend signs up and gets their own private dashboards; every query is scoped to the
signed-in user by row-level security.

## Tests

```bash
npm test            # everything
npm run test:unit   # matching algorithm only (no database needed)
npm run test:rls    # privacy test against the Supabase in .env.local
```

The RLS test creates three throwaway accounts and checks, as each user, that they **cannot** read another
person's private profile row, see private fields through the public table, edit someone else's profile,
mark their own proof of work as verified, read or forge someone else's leads, request intros outside their
matches, or see contact details before both people accept. It deletes the accounts afterwards. It is
skipped automatically when `.env.local` has no Supabase settings.

## How matching works

The algorithm lives in `src/lib/matching/score.ts` as pure functions (no database), so it is easy to test
and tune. Every part of the score is symmetric, so **matches are always mutual**: if A is in B's leads, B is
in A's with the same score.

1. **Hard filters.** Same city, or both open to remote. Overlapping relationship type: both want a
   co-founder; or one wants a paid collaborator and the other is open to paid work (same for
   mentor ↔ mentoring and advisor ↔ advising). Never a pair that was declined or marked "not interested".
2. **Complementarity, 40%.** How much of B's needs (full weight) and admitted weaknesses (0.6 weight) A's
   strengths cover, and vice versa. The **lower** direction counts, so a match is only strong if both
   benefit. Pairs where neither side helps the other are dropped. Pure mentor/advisor matches only need
   the mentee's gaps covered.
3. **Overlap penalty, 10%.** Points for strengths that don't overlap (1 − Jaccard similarity).
4. **Intent and commitment fit, 25%.** Hours per week, equity vs cash (equity-vs-cash is fine for paid work,
   a mismatch for co-founders), and timeline.
5. **Working style, 15%.** Communication style, pace and risk tolerance.
6. **Proof of work, 10%.** A link counts half; a link the server could open counts fully.
7. **Tiebreaker.** Free-text similarity of what people wrote orders leads with equal scores. It is never part
   of the score. (It uses a simple word-overlap measure so no extra API is needed; swap in embeddings in
   `textsim.ts`.)
8. **Recompute.** Leads are recomputed for a user (and, because matches are mutual, for everyone they match)
   every time they save their profile or finish onboarding.

Leads under 45/100 are hidden. Each viewer gets their own plain-English reason, which only names the other
person's strengths or needs if that person made them public.

## Privacy model

- `profiles`: everything a user entered, readable and editable only by its owner. Users can't insert rows
  (a trigger creates one at sign-up) or set `proof_verified` (column-level grant).
- `public_profiles`: kept in sync by a trigger, containing only the sections the owner marked public; the
  rest is `NULL`. Contact fields don't exist in this table at all. Readable by signed-in members.
- `leads`: one row per viewer, written only by the server with the service-role key, readable only by its
  owner.
- `intros`: written only through `request_intro` / `respond_intro`. Contact details come only from
  `get_intro_contact()`, which returns nothing unless both people accepted.
- Uploaded resumes are sent to Claude once and never stored.

## Later: LinkedIn and Google sign-in

LinkedIn's OpenID Connect sign-in returns only name, email, photo and locale (no job history), so it is for
identity; the profile still comes from the questionnaire and the optional PDF.

**LinkedIn**

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app**. You need a
   LinkedIn Company Page to attach it to.
2. **Products** tab → request **Sign In with LinkedIn using OpenID Connect** (approved instantly).
3. **Auth** tab → **Authorized redirect URLs** → add exactly:
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   (the Supabase project URL plus `/auth/v1/callback`; it must match character for character).
4. Copy the **Client ID** and **Primary Client Secret**.
5. In Supabase: **Authentication → Sign In / Providers → LinkedIn (OIDC)** → enable and paste both.
6. Set `NEXT_PUBLIC_ENABLE_LINKEDIN=true` and restart. The app requests the `openid profile email` scopes and
   sends people back to `/auth/callback`, which must be in Supabase's Redirect URLs (step 1.3 above).

**Google**

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth
   client ID → Web application**.
2. **Authorized redirect URI:** `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Paste the client ID and secret into **Supabase → Authentication → Sign In / Providers → Google**.
4. Set `NEXT_PUBLIC_ENABLE_GOOGLE=true` and restart.

New users from either provider get a profile automatically, prefilled with their name and photo.

## Project layout

```
src/app/                 pages: / login onboarding profile leads privacy, plus actions.ts (server actions)
src/app/api/extract/     resume / LinkedIn PDF → Claude → suggested answers
src/app/auth/callback/   email confirmation and OAuth landing route
src/components/          profile form, lead card, intro cards
src/lib/matching/        the algorithm (score.ts), reasons (explain.ts), recompute.ts (writes leads)
src/lib/supabase/        server, browser, admin clients and session refresh
src/lib/claude.ts        Claude calls (resume extraction, "why you two")
supabase/migrations/     schema, RLS policies, triggers and RPC functions
scripts/seed.ts          20 fake Philadelphia profiles
tests/                   matching unit tests, RLS integration test
```

## What to improve next

1. **LinkedIn and Google sign-in** (steps above), then require LinkedIn so every member has a real identity.
2. **Notifications.** Email people when they get a new match or intro request (Supabase + Resend). Right now
   they have to log in to notice.
3. **Real proof-of-work verification.** Today a link is "checked" if it opens. Next: GitHub OAuth to confirm
   repo ownership, or a manual review queue.
4. **Background recompute.** Matching runs inside the save request, which is fine for dozens of users. Past a
   few hundred, move it to a queue or a Postgres function and only rescore people in the same city.
5. **Embeddings for the tiebreaker** (for example Voyage AI) instead of word overlap.
6. **Tune the weights with real feedback.** Log which leads people request intros to and which they pass on,
   then adjust the weights in `score.ts`.
7. **Invite-only access.** An invite code or allowlist so only people you invite can join the pilot.
8. **Account deletion and data export** buttons, and a lawyer's review of the privacy policy before
   opening beyond friends.
9. **Messaging after an intro**, so people don't have to switch to email.
10. **Abuse controls:** rate limits on intro requests, and a way to report or block someone.
