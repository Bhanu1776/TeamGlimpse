-- Row-level security policies for all tables

-- ─── Shared-room helper ──────────────────────────────────────────────────────
-- SECURITY DEFINER so it bypasses RLS on room_members during policy evaluation,
-- preventing infinite recursion.
create or replace function public.shares_room_with(other uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from room_members a
    join room_members b on a.room_id = b.room_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select"
  on public.profiles for select
  using (id = auth.uid() or public.shares_room_with(id));

create policy "profiles_update"
  on public.profiles for update
  using (id = auth.uid());

-- ─── allowed_email_domains — no client access ─────────────────────────────────
alter table public.allowed_email_domains enable row level security;
-- no policies = deny all for anon/authenticated; service role bypasses RLS

-- ─── rooms ──────────────────────────────────────────────────────────────────
alter table public.rooms enable row level security;

create policy "rooms_select"
  on public.rooms for select
  using (
    exists (
      select 1 from public.room_members
      where room_id = rooms.id and user_id = auth.uid()
    )
  );

-- Insert and update only via RPCs (create_room / rotate_invite_code)
-- which run as security definer — no direct client insert policy.

-- ─── room_members ────────────────────────────────────────────────────────────
alter table public.room_members enable row level security;

-- Non-recursive form: check if caller is in the same room via subquery
create policy "room_members_select"
  on public.room_members for select
  using (
    user_id = auth.uid()
    or room_id in (
      select rm.room_id from public.room_members rm where rm.user_id = auth.uid()
    )
  );

create policy "room_members_delete"
  on public.room_members for delete
  using (user_id = auth.uid());

-- Insert only via accept_invite / create_room RPCs (security definer)

-- ─── daily_statuses ──────────────────────────────────────────────────────────
alter table public.daily_statuses enable row level security;

create policy "daily_statuses_select"
  on public.daily_statuses for select
  using (user_id = auth.uid() or public.shares_room_with(user_id));

create policy "daily_statuses_insert"
  on public.daily_statuses for insert
  with check (user_id = auth.uid());

create policy "daily_statuses_update"
  on public.daily_statuses for update
  using (user_id = auth.uid());

-- ─── pinned_people ───────────────────────────────────────────────────────────
alter table public.pinned_people enable row level security;

create policy "pinned_people_select"
  on public.pinned_people for select
  using (user_id = auth.uid());

create policy "pinned_people_insert"
  on public.pinned_people for insert
  with check (
    user_id = auth.uid()
    and public.shares_room_with(pinned_user_id)
  );

create policy "pinned_people_delete"
  on public.pinned_people for delete
  using (user_id = auth.uid());

-- ─── notification_preferences ────────────────────────────────────────────────
alter table public.notification_preferences enable row level security;

create policy "notif_prefs_all"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── push_subscriptions ──────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;

create policy "push_subs_all"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── notification_deliveries — service role only ──────────────────────────────
alter table public.notification_deliveries enable row level security;
-- no policies = deny all for anon/authenticated
