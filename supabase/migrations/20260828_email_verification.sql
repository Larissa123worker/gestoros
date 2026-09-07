create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email varchar(320) not null,
  code varchar(6) not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_verifications enable row level security;
revoke all on public.email_verifications from anon, authenticated;
grant all on public.email_verifications to service_role;