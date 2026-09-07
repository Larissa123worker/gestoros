-- Supabase setup for Gestor OS
-- Run this in the Supabase SQL Editor after creating your project.

-- Enable uuid extension
create extension if not exists "uuid-ossp";

alter table if exists public.company_profiles
  add column if not exists postal_code varchar(8);

-- Create storage bucket for evidences
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidences',
  'evidences',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Public uploads are allowed" on storage.objects
  for insert with check (bucket_id = 'evidences');

create policy "Public reads are allowed" on storage.objects
  for select using (bucket_id = 'evidences');

create policy "Public updates are allowed" on storage.objects
  for update using (bucket_id = 'evidences');

create policy "Public deletes are allowed" on storage.objects
  for delete using (bucket_id = 'evidences');

create table if not exists public.service_catalog (
  id varchar(64) primary key,
  company_id varchar(64) references public.company_profiles(id) on delete cascade,
  name text not null,
  description text,
  suggested_value varchar(64) default '0',
  estimated_duration varchar(64),
  active varchar(8) not null default 'true',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table if exists public.service_orders add column if not exists started_at timestamptz;
alter table if exists public.service_orders add column if not exists completed_at timestamptz;

create table if not exists public.company_subscriptions (
  id varchar(64) primary key,
  company_id varchar(64) not null unique references public.company_profiles(id) on delete cascade,
  plan_id varchar(64),
  asaas_customer_id varchar(64),
  asaas_subscription_id varchar(64),
  billing_type varchar(32),
  cycle varchar(32),
  plan varchar(64) not null default 'Profissional',
  status varchar(32) not null default 'trialing',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  next_billing_at timestamptz,
  amount numeric(12,2) default 179,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.subscription_payments (
  id varchar(64) primary key,
  subscription_id varchar(64) not null references public.company_subscriptions(id) on delete cascade,
  asaas_payment_id varchar(64) unique,
  billing_type varchar(32),
  description text,
  amount varchar(32) not null,
  status varchar(32) not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  external_id varchar(128),
  "createdAt" timestamptz not null default now()
);

alter table if exists public.company_subscriptions add column if not exists plan_id varchar(64);
alter table if exists public.company_subscriptions add column if not exists asaas_customer_id varchar(64);
alter table if exists public.company_subscriptions add column if not exists asaas_subscription_id varchar(64);
alter table if exists public.company_subscriptions add column if not exists billing_type varchar(32);
alter table if exists public.company_subscriptions add column if not exists cycle varchar(32);
alter table if exists public.company_subscriptions add column if not exists amount numeric(12,2) default 179;
alter table if exists public.subscription_payments add column if not exists asaas_payment_id varchar(64);
alter table if exists public.subscription_payments add column if not exists billing_type varchar(32);

create table if not exists public.billing_plans (
  id varchar(64) primary key,
  slug varchar(64) not null unique,
  name varchar(120) not null,
  description text,
  monthly_amount numeric(12,2) not null,
  annual_amount numeric(12,2) not null,
  max_employees varchar(32),
  active varchar(8) not null default 'true',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

insert into public.billing_plans (id, slug, name, description, monthly_amount, annual_amount, max_employees)
values
  ('plan-solo', 'solo', 'Solo', 'Para operações pequenas.', 79, 569, '2'),
  ('plan-profissional', 'profissional', 'Profissional', 'Para equipes em crescimento.', 179, 1289, '6'),
  ('plan-equipe', 'equipe', 'Equipe', 'Para operações maiores.', 349, 2513, '15')
on conflict (slug) do update set monthly_amount = excluded.monthly_amount, annual_amount = excluded.annual_amount;

create table if not exists public.asaas_webhook_events (
  id varchar(160) primary key,
  event varchar(100) not null,
  payload jsonb not null,
  processed_at timestamptz,
  "createdAt" timestamptz not null default now()
);
