-- Complement: initial schema
--
-- Privacy model
--   profiles         private, owner-only (RLS). Holds everything, including contact details.
--   public_profiles  a projection of profiles kept in sync by a trigger. It only ever contains
--                    the fields the owner marked public; everything else is NULL. Readable by
--                    any signed-in user.
--   leads            one row per (viewer, match). Written only by the server (service role).
--   intros           double opt-in intro requests. Written only through RPC functions.
--   passes           "not interested" marks; a passed pair is never matched again.
--
-- Contact details are only returned by get_intro_contact(), and only when both people accepted.

-- ---------------------------------------------------------------------------
-- profiles (private)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text        not null default '',
  avatar_url        text,
  headline          text        not null default '',
  city              text        not null default 'Philadelphia',
  remote_ok         boolean     not null default false,
  meet_in_person    boolean     not null default true,
  achievements      text        not null default '',
  strengths         text[]      not null default '{}',
  strengths_note    text        not null default '',
  weaknesses        text[]      not null default '{}',
  weaknesses_note   text        not null default '',
  priorities        text        not null default '',
  seeking           text[]      not null default '{}',
  open_to           text[]      not null default '{}',
  needs             text[]      not null default '{}',
  hours_per_week    integer     not null default 10,
  compensation      text        not null default 'mix',
  timeline          text        not null default 'now',
  comm_style        text        not null default 'mixed',
  pace              smallint    not null default 3,
  risk_tolerance    smallint    not null default 3,
  proof_url         text        not null default '',
  proof_verified    boolean     not null default false,
  contact_email     text        not null default '',
  contact_linkedin  text        not null default '',
  public_fields     text[]      not null default
    '{headline,location,achievements,strengths,looking_for,proof}',
  onboarded         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint strengths_max_5    check (cardinality(strengths) <= 5),
  constraint hours_range        check (hours_per_week between 0 and 80),
  constraint compensation_enum  check (compensation in ('equity', 'cash', 'mix')),
  constraint timeline_enum      check (timeline in ('now', '1-3m', '3-6m', 'exploring')),
  constraint comm_style_enum    check (comm_style in ('async', 'sync', 'mixed')),
  constraint pace_range         check (pace between 1 and 5),
  constraint risk_range         check (risk_tolerance between 1 and 5),
  constraint seeking_enum       check (seeking <@ array['cofounder', 'paid_collaborator', 'mentor', 'advisor']),
  constraint open_to_enum       check (open_to <@ array['cofounder', 'paid_work', 'mentoring', 'advising']),
  constraint public_fields_enum check (public_fields <@ array[
    'headline', 'location', 'achievements', 'strengths', 'weaknesses', 'priorities',
    'looking_for', 'commitment', 'work_style', 'proof'])
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: owner can update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: owner can delete" on public.profiles for delete to authenticated using (id = auth.uid());

-- Column-level privileges: users can't insert rows (a trigger creates them on sign-up)
-- and can't mark their own proof of work as verified.
revoke all on public.profiles from anon, authenticated;
grant select, delete on public.profiles to authenticated;
grant update (
  full_name, avatar_url, headline, city, remote_ok, meet_in_person, achievements,
  strengths, strengths_note, weaknesses, weaknesses_note, priorities, seeking, open_to,
  needs, hours_per_week, compensation, timeline, comm_style, pace, risk_tolerance,
  proof_url, contact_email, contact_linkedin, public_fields, onboarded
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- public_profiles (the public subset)
-- ---------------------------------------------------------------------------
create table public.public_profiles (
  id               uuid primary key references public.profiles (id) on delete cascade,
  full_name        text not null default '',
  avatar_url       text,
  onboarded        boolean not null default false,
  headline         text,
  city             text,
  remote_ok        boolean,
  meet_in_person   boolean,
  achievements     text,
  strengths        text[],
  strengths_note   text,
  weaknesses       text[],
  weaknesses_note  text,
  priorities       text,
  seeking          text[],
  open_to          text[],
  needs            text[],
  hours_per_week   integer,
  compensation     text,
  timeline         text,
  comm_style       text,
  pace             smallint,
  risk_tolerance   smallint,
  proof_url        text,
  proof_verified   boolean,
  updated_at       timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

create policy "public_profiles: signed-in users can read onboarded profiles"
  on public.public_profiles for select to authenticated
  using (onboarded or id = auth.uid());

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

create or replace function public.sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f text[] := new.public_fields;
begin
  insert into public.public_profiles as p (
    id, full_name, avatar_url, onboarded,
    headline, city, remote_ok, meet_in_person, achievements,
    strengths, strengths_note, weaknesses, weaknesses_note, priorities,
    seeking, open_to, needs, hours_per_week, compensation, timeline,
    comm_style, pace, risk_tolerance, proof_url, proof_verified, updated_at
  ) values (
    new.id, new.full_name, new.avatar_url, new.onboarded,
    case when 'headline'     = any(f) then new.headline end,
    case when 'location'     = any(f) then new.city end,
    case when 'location'     = any(f) then new.remote_ok end,
    case when 'location'     = any(f) then new.meet_in_person end,
    case when 'achievements' = any(f) then new.achievements end,
    case when 'strengths'    = any(f) then new.strengths end,
    case when 'strengths'    = any(f) then new.strengths_note end,
    case when 'weaknesses'   = any(f) then new.weaknesses end,
    case when 'weaknesses'   = any(f) then new.weaknesses_note end,
    case when 'priorities'   = any(f) then new.priorities end,
    case when 'looking_for'  = any(f) then new.seeking end,
    case when 'looking_for'  = any(f) then new.open_to end,
    case when 'looking_for'  = any(f) then new.needs end,
    case when 'commitment'   = any(f) then new.hours_per_week end,
    case when 'commitment'   = any(f) then new.compensation end,
    case when 'commitment'   = any(f) then new.timeline end,
    case when 'work_style'   = any(f) then new.comm_style end,
    case when 'work_style'   = any(f) then new.pace end,
    case when 'work_style'   = any(f) then new.risk_tolerance end,
    case when 'proof'        = any(f) then new.proof_url end,
    case when 'proof'        = any(f) then new.proof_verified end,
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name, avatar_url = excluded.avatar_url, onboarded = excluded.onboarded,
    headline = excluded.headline, city = excluded.city, remote_ok = excluded.remote_ok,
    meet_in_person = excluded.meet_in_person, achievements = excluded.achievements,
    strengths = excluded.strengths, strengths_note = excluded.strengths_note,
    weaknesses = excluded.weaknesses, weaknesses_note = excluded.weaknesses_note,
    priorities = excluded.priorities, seeking = excluded.seeking, open_to = excluded.open_to,
    needs = excluded.needs, hours_per_week = excluded.hours_per_week,
    compensation = excluded.compensation, timeline = excluded.timeline,
    comm_style = excluded.comm_style, pace = excluded.pace, risk_tolerance = excluded.risk_tolerance,
    proof_url = excluded.proof_url, proof_verified = excluded.proof_verified,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger profiles_sync_public after insert or update on public.profiles
  for each row execute function public.sync_public_profile();

-- Create a profile row whenever someone signs up. Works for email sign-up now and for
-- LinkedIn / Google later (their OIDC claims arrive in raw_user_meta_data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, contact_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- leads (computed matches, one row per viewer)
-- ---------------------------------------------------------------------------
create table public.leads (
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  other_id      uuid not null references public.profiles (id) on delete cascade,
  score         numeric(5, 2) not null,
  breakdown     jsonb not null default '{}',
  relationship  text[] not null default '{}',
  reason        text not null default '',
  why_paragraph text,
  tiebreak      real not null default 0,
  computed_at   timestamptz not null default now(),
  primary key (owner_id, other_id),
  check (owner_id <> other_id)
);

create index leads_owner_score on public.leads (owner_id, score desc);

alter table public.leads enable row level security;
create policy "leads: owner can read" on public.leads for select to authenticated using (owner_id = auth.uid());
revoke all on public.leads from anon, authenticated;
grant select on public.leads to authenticated;

-- ---------------------------------------------------------------------------
-- passes ("not interested")
-- ---------------------------------------------------------------------------
create table public.passes (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  other_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  check (user_id <> other_id)
);

alter table public.passes enable row level security;
create policy "passes: owner can read" on public.passes for select to authenticated using (user_id = auth.uid());
revoke all on public.passes from anon, authenticated;
grant select on public.passes to authenticated;

-- ---------------------------------------------------------------------------
-- intros (double opt-in)
-- ---------------------------------------------------------------------------
create table public.intros (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message       text not null default '' check (char_length(message) <= 1000),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> recipient_id)
);

create unique index intros_one_per_pair on public.intros (
  least(requester_id, recipient_id), greatest(requester_id, recipient_id)
);

alter table public.intros enable row level security;
create policy "intros: participants can read" on public.intros for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));
revoke all on public.intros from anon, authenticated;
grant select on public.intros to authenticated;

-- Request an intro. Only allowed for someone already in your leads. If the other person
-- already asked you, this counts as accepting (both opted in).
create or replace function public.request_intro(p_other uuid, p_message text default '')
returns public.intros
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.intros;
  result public.intros;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.leads where owner_id = me and other_id = p_other) then
    raise exception 'you can only request intros to people in your leads';
  end if;

  select * into existing from public.intros
   where least(requester_id, recipient_id) = least(me, p_other)
     and greatest(requester_id, recipient_id) = greatest(me, p_other);

  if found then
    if existing.status = 'pending' and existing.recipient_id = me then
      update public.intros set status = 'accepted', responded_at = now()
       where id = existing.id returning * into result;
      return result;
    end if;
    if existing.status = 'declined' then
      raise exception 'this intro is not available';
    end if;
    return existing;
  end if;

  insert into public.intros (requester_id, recipient_id, message)
  values (me, p_other, left(coalesce(p_message, ''), 1000))
  returning * into result;
  return result;
end;
$$;

-- Accept or decline an intro addressed to you. Declining removes the match for both people.
create or replace function public.respond_intro(p_intro uuid, p_accept boolean)
returns public.intros
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  result public.intros;
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.intros
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = p_intro and recipient_id = me and status = 'pending'
  returning * into result;
  if not found then raise exception 'intro not found or already answered'; end if;

  if not p_accept then
    delete from public.leads
     where (owner_id = result.requester_id and other_id = result.recipient_id)
        or (owner_id = result.recipient_id and other_id = result.requester_id);
  end if;
  return result;
end;
$$;

-- "Not interested": hides the match for both people and keeps it from coming back.
create or replace function public.pass_lead(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into public.passes (user_id, other_id) values (me, p_other) on conflict do nothing;
  delete from public.leads
   where (owner_id = me and other_id = p_other) or (owner_id = p_other and other_id = me);
end;
$$;

-- Contact details, only after both people said yes.
create or replace function public.get_intro_contact(p_other uuid)
returns table (full_name text, contact_email text, contact_linkedin text)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, p.contact_email, p.contact_linkedin
    from public.profiles p
   where p.id = p_other
     and auth.uid() is not null
     and exists (
       select 1 from public.intros i
        where i.status = 'accepted'
          and least(i.requester_id, i.recipient_id) = least(auth.uid(), p_other)
          and greatest(i.requester_id, i.recipient_id) = greatest(auth.uid(), p_other)
     );
$$;

revoke execute on function public.request_intro(uuid, text)  from public, anon;
revoke execute on function public.respond_intro(uuid, boolean) from public, anon;
revoke execute on function public.pass_lead(uuid)             from public, anon;
revoke execute on function public.get_intro_contact(uuid)     from public, anon;
grant  execute on function public.request_intro(uuid, text)  to authenticated;
grant  execute on function public.respond_intro(uuid, boolean) to authenticated;
grant  execute on function public.pass_lead(uuid)             to authenticated;
grant  execute on function public.get_intro_contact(uuid)     to authenticated;

-- Internal trigger functions should never be callable directly.
revoke execute on function public.sync_public_profile() from public, anon, authenticated;
revoke execute on function public.handle_new_user()     from public, anon, authenticated;

-- The server (service role) computes matches and writes leads.
grant all on public.profiles, public.public_profiles, public.leads, public.passes, public.intros to service_role;
