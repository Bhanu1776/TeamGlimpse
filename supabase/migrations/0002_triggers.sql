-- Triggers: auto-create profiles on signup, enforce email domain, bump updated_at

-- ─── updated_at on daily_statuses ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_statuses_set_updated_at
  before update on public.daily_statuses
  for each row execute function public.set_updated_at();

-- ─── auto-profile on auth.users insert ───────────────────────────────────────
-- Rejects sign-ups from domains not in allowed_email_domains.
-- Creates a profiles row + default notification_preferences row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_domain text;
begin
  v_domain := split_part(new.email, '@', 2);

  if not exists (select 1 from public.allowed_email_domains where domain = v_domain) then
    raise exception 'Email domain % is not allowed', v_domain;
  end if;

  insert into public.profiles (id, display_name, email, avatar_url, onboarding_complete)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    false
  );

  insert into public.notification_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
