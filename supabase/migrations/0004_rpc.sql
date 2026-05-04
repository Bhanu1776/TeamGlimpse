-- Postgres RPC functions for composite reads and atomic writes

-- ─── Helper: generate a random 6-char invite code ────────────────────────────
create or replace function public.generate_invite_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- ─── get_home_summary ────────────────────────────────────────────────────────
-- Returns HomeSummary JSON for the authenticated user and the given target date.
-- The client computes target_date (today or tomorrow based on evening cutoff).
create or replace function public.get_home_summary(p_target_date date)
returns jsonb language plpgsql security invoker stable as $$
declare
  v_uid         uuid := auth.uid();
  v_profile     record;
  v_status_row  record;
  v_rooms       jsonb;
  v_pinned      jsonb;
begin
  -- Current user profile
  select * into v_profile from public.profiles where id = v_uid;
  if not found then return null; end if;

  -- User's own status for target date
  select status, updated_at into v_status_row
  from public.daily_statuses
  where user_id = v_uid and status_date = p_target_date;

  -- Rooms with status counts
  select jsonb_agg(
    jsonb_build_object(
      'id',             r.id,
      'name',           r.name,
      'inviteCode',     r.invite_code,
      'memberCount',    (select count(*) from public.room_members where room_id = r.id),
      'goingCount',     coalesce((
        select count(*) from public.room_members rm2
        join public.daily_statuses ds on ds.user_id = rm2.user_id and ds.status_date = p_target_date
        where rm2.room_id = r.id and ds.status = 'going'
      ), 0),
      'wfhCount',       coalesce((
        select count(*) from public.room_members rm2
        join public.daily_statuses ds on ds.user_id = rm2.user_id and ds.status_date = p_target_date
        where rm2.room_id = r.id and ds.status = 'wfh'
      ), 0),
      'maybeCount',     coalesce((
        select count(*) from public.room_members rm2
        join public.daily_statuses ds on ds.user_id = rm2.user_id and ds.status_date = p_target_date
        where rm2.room_id = r.id and ds.status = 'maybe'
      ), 0),
      'notUpdatedCount', (
        select count(*) from public.room_members rm2
        left join public.daily_statuses ds on ds.user_id = rm2.user_id and ds.status_date = p_target_date
        where rm2.room_id = r.id and (ds.user_id is null or ds.status = 'undecided')
      )
    )
  ) into v_rooms
  from public.rooms r
  join public.room_members rm on rm.room_id = r.id
  where rm.user_id = v_uid;

  -- Pinned people with statuses + primary room context
  select jsonb_agg(
    jsonb_build_object(
      'userId',    p.id,
      'name',      coalesce(p.display_name, p.email),
      'avatarUrl', coalesce(p.avatar_url, ''),
      'status',    coalesce(ds.status::text, 'undecided'),
      'updatedAt', ds.updated_at,
      'roomId',    rm_primary.room_id,
      'roomName',  r_primary.name
    )
  ) into v_pinned
  from public.pinned_people pp
  join public.profiles p on p.id = pp.pinned_user_id
  left join public.daily_statuses ds
    on ds.user_id = pp.pinned_user_id and ds.status_date = p_target_date
  -- Pick the first shared room as "primary room" for this pinned person
  join lateral (
    select rm.room_id from public.room_members rm
    join public.room_members rm_me on rm_me.room_id = rm.room_id
    where rm.user_id = pp.pinned_user_id and rm_me.user_id = v_uid
    order by rm.room_id
    limit 1
  ) rm_primary on true
  join public.rooms r_primary on r_primary.id = rm_primary.room_id
  where pp.user_id = v_uid;

  return jsonb_build_object(
    'currentUser', jsonb_build_object(
      'id',                 v_profile.id,
      'name',               coalesce(v_profile.display_name, v_profile.email),
      'email',              v_profile.email,
      'avatarUrl',          coalesce(v_profile.avatar_url, ''),
      'onboardingComplete', v_profile.onboarding_complete
    ),
    'todayStatus',          coalesce(v_status_row.status::text, 'undecided'),
    'todayStatusUpdatedAt', v_status_row.updated_at,
    'pinnedPeople',         coalesce(v_pinned, '[]'::jsonb),
    'rooms',                coalesce(v_rooms, '[]'::jsonb),
    'targetDate',           p_target_date::text,
    'isForTomorrow',        p_target_date > current_date
  );
end;
$$;

-- ─── get_room_detail ─────────────────────────────────────────────────────────
-- Returns RoomDetail JSON for a room the caller belongs to.
create or replace function public.get_room_detail(p_room_id uuid, p_target_date date)
returns jsonb language plpgsql security invoker stable as $$
declare
  v_uid  uuid := auth.uid();
  v_room record;
  v_members jsonb;
begin
  -- Verify membership (RLS also enforces this, but fail fast)
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_uid
  ) then
    return null;
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then return null; end if;

  select jsonb_agg(
    jsonb_build_object(
      'userId',    p.id,
      'name',      coalesce(p.display_name, p.email),
      'email',     p.email,
      'avatarUrl', coalesce(p.avatar_url, ''),
      'status',    coalesce(ds.status::text, 'undecided'),
      'updatedAt', ds.updated_at
    )
    order by
      case coalesce(ds.status::text, 'undecided')
        when 'going'     then 1
        when 'wfh'       then 2
        when 'maybe'     then 3
        when 'undecided' then 4
      end,
      p.display_name
  ) into v_members
  from public.room_members rm
  join public.profiles p on p.id = rm.user_id
  left join public.daily_statuses ds
    on ds.user_id = rm.user_id and ds.status_date = p_target_date
  where rm.room_id = p_room_id;

  return jsonb_build_object(
    'id',           v_room.id,
    'name',         v_room.name,
    'inviteCode',   v_room.invite_code,
    'memberCount',  (select count(*) from public.room_members where room_id = p_room_id),
    'members',      coalesce(v_members, '[]'::jsonb),
    'targetDate',   p_target_date::text,
    'isForTomorrow', p_target_date > current_date
  );
end;
$$;

-- ─── create_room ─────────────────────────────────────────────────────────────
-- Atomically inserts a room and adds the caller as admin.
create or replace function public.create_room(p_name text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_code   text;
  v_room   record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Generate a unique invite code
  loop
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.rooms where invite_code = v_code);
  end loop;

  insert into public.rooms (name, invite_code, created_by)
  values (p_name, v_code, v_uid)
  returning * into v_room;

  insert into public.room_members (room_id, user_id, role)
  values (v_room.id, v_uid, 'admin');

  return jsonb_build_object(
    'id',          v_room.id,
    'name',        v_room.name,
    'inviteCode',  v_room.invite_code,
    'memberCount', 1
  );
end;
$$;

-- ─── accept_invite ───────────────────────────────────────────────────────────
-- Joins a room by invite code. Domain-checks the caller's email.
create or replace function public.accept_invite(p_code text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_domain     text;
  v_room       record;
  v_already    boolean;
  v_count      int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Check email domain allowlist
  select email_domain into v_domain from public.profiles where id = v_uid;
  if not exists (select 1 from public.allowed_email_domains where domain = v_domain) then
    raise exception 'Email domain % is not allowed', v_domain;
  end if;

  -- Find the room
  select * into v_room
  from public.rooms
  where upper(invite_code) = upper(p_code);
  if not found then return null; end if;

  -- Check if already a member
  v_already := exists (
    select 1 from public.room_members where room_id = v_room.id and user_id = v_uid
  );

  if not v_already then
    insert into public.room_members (room_id, user_id, role)
    values (v_room.id, v_uid, 'member')
    on conflict do nothing;
  end if;

  select count(*) into v_count from public.room_members where room_id = v_room.id;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id',          v_room.id,
      'name',        v_room.name,
      'inviteCode',  v_room.invite_code,
      'memberCount', v_count
    ),
    'alreadyMember', v_already
  );
end;
$$;
