alter table public.company_profiles
  add column if not exists address_number varchar(16),
  add column if not exists address_complement varchar(120);
