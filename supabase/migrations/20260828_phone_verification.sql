alter table public.company_profiles
  add column if not exists mobile_phone varchar(16),
  add column if not exists phone_verified_at timestamptz;

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id varchar(64) not null references public.company_profiles(id) on delete cascade,
  phone varchar(16) not null,
  code varchar(6) not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.phone_verifications enable row level security;
revoke all on public.phone_verifications from anon, authenticated;
grant all on public.phone_verifications to service_role;