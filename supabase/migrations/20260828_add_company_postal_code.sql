alter table public.company_profiles
  add column if not exists postal_code varchar(8);
