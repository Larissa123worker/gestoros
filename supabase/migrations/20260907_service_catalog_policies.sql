-- Allow company owners to manage their own service catalog.
alter table public.service_catalog enable row level security;

drop policy if exists "owners can read their service catalog" on public.service_catalog;
create policy "owners can read their service catalog"
  on public.service_catalog for select to authenticated
  using (exists (
    select 1
    from public.company_profiles company
    where company.id = service_catalog.company_id
      and company.user_id = auth.uid()::varchar
  ));

drop policy if exists "owners can create their service catalog" on public.service_catalog;
create policy "owners can create their service catalog"
  on public.service_catalog for insert to authenticated
  with check (exists (
    select 1
    from public.company_profiles company
    where company.id = service_catalog.company_id
      and company.user_id = auth.uid()::varchar
  ));

drop policy if exists "owners can update their service catalog" on public.service_catalog;
create policy "owners can update their service catalog"
  on public.service_catalog for update to authenticated
  using (exists (
    select 1
    from public.company_profiles company
    where company.id = service_catalog.company_id
      and company.user_id = auth.uid()::varchar
  ))
  with check (exists (
    select 1
    from public.company_profiles company
    where company.id = service_catalog.company_id
      and company.user_id = auth.uid()::varchar
  ));

drop policy if exists "owners can delete their service catalog" on public.service_catalog;
create policy "owners can delete their service catalog"
  on public.service_catalog for delete to authenticated
  using (exists (
    select 1
    from public.company_profiles company
    where company.id = service_catalog.company_id
      and company.user_id = auth.uid()::varchar
  ));
