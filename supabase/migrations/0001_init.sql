-- Core schema: enums, tables, indexes
-- Apply to Supabase: paste into SQL Editor or use `supabase db push`

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.daily_status as enum ('going', 'wfh', 'maybe', 'undecided');

-- ─── profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  email            text not null,
  email_domain     text generated always as (split_part(email, '@', 2)) stored,
  avatar_url       text,
  onboarding_complete boolean not null default false,
  created_at       timestamptz not null default now()
);
create index profiles_email_domain_idx on public.profiles (email_domain);

-- ─── allowed_email_domains ───────────────────────────────────────────────────
create table public.allowed_email_domains (
  domain    text primary key,
  added_at  timestamptz not null default now()
);

-- ─── rooms ──────────────────────────────────────────────────────────────────
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── room_members ────────────────────────────────────────────────────────────
create table public.room_members (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_id_idx on public.room_members (user_id);

-- ─── daily_statuses ──────────────────────────────────────────────────────────
create table public.daily_statuses (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status_date date not null,
  status      public.daily_status not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, status_date)
);
create index daily_statuses_date_user_idx on public.daily_statuses (status_date, user_id);

-- ─── pinned_people ───────────────────────────────────────────────────────────
create table public.pinned_people (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  pinned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, pinned_user_id)
);
create index pinned_people_user_id_idx on public.pinned_people (user_id);

-- ─── notification_preferences ────────────────────────────────────────────────
create table public.notification_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  enabled             boolean not null default true,
  reminder_time       time not null default '09:00',
  evening_cutoff_hour smallint not null default 18 check (evening_cutoff_hour between 0 and 23),
  tz                  text not null default 'Asia/Kolkata'
);

-- ─── push_subscriptions ──────────────────────────────────────────────────────
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth_key     text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ─── notification_deliveries ─────────────────────────────────────────────────
create table public.notification_deliveries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  target_date date not null,
  sent_at     timestamptz not null default now(),
  status      text not null,
  error       text,
  unique (user_id, kind, target_date)
);
