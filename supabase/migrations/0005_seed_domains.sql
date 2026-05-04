-- Seed allowed email domains.
-- Replace 'example.com' with your actual test domain before applying.
insert into public.allowed_email_domains (domain) values
  ('setu.co'),
  ('example.com')   -- replace with your test domain
on conflict do nothing;
