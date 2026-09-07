-- Gestor OS: schema e permissões do billing Asaas.
-- Idempotente: pode ser executado mais de uma vez no Supabase SQL Editor.

create table if not exists public.billing_plans (
  id varchar(64) primary key,
  slug varchar(64) not null unique,
  name varchar(120) not null,
  description text,
  monthly_amount numeric(12,2) not null,
  annual_amount numeric(12,2) not null,
  max_employees varchar(32),
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.billing_plans add column if not exists description text;
alter table public.billing_plans add column if not exists monthly_amount numeric(12,2);
alter table public.billing_plans add column if not exists annual_amount numeric(12,2);
alter table public.billing_plans add column if not exists max_employees varchar(32);
alter table public.billing_plans add column if not exists active boolean not null default true;
alter table public.billing_plans add column if not exists "createdAt" timestamptz not null default now();
alter table public.billing_plans add column if not exists "updatedAt" timestamptz not null default now();

insert into public.billing_plans (id, slug, name, description, monthly_amount, annual_amount, max_employees)
values
  ('plan-solo', 'solo', 'Solo', 'Para operações pequenas.', 79.00, 569.00, '2'),
  ('plan-profissional', 'profissional', 'Profissional', 'Para equipes em crescimento.', 179.00, 1289.00, '6'),
  ('plan-equipe', 'equipe', 'Equipe', 'Para operações maiores.', 349.00, 2513.00, '15')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_amount = excluded.monthly_amount,
  annual_amount = excluded.annual_amount,
  max_employees = excluded.max_employees,
  active = true,
  "updatedAt" = now();

create table if not exists public.company_subscriptions (
  id varchar(64) primary key,
  company_id varchar(64) not null unique references public.company_profiles(id) on delete cascade,
  plan_id varchar(64) references public.billing_plans(id),
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

alter table public.company_subscriptions add column if not exists plan_id varchar(64);
alter table public.company_subscriptions add column if not exists asaas_customer_id varchar(64);
alter table public.company_subscriptions add column if not exists asaas_subscription_id varchar(64);
alter table public.company_subscriptions add column if not exists billing_type varchar(32);
alter table public.company_subscriptions add column if not exists cycle varchar(32);
alter table public.company_subscriptions add column if not exists trial_started_at timestamptz;
alter table public.company_subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.company_subscriptions add column if not exists next_billing_at timestamptz;
alter table public.company_subscriptions add column if not exists amount numeric(12,2) default 179;
alter table public.company_subscriptions add column if not exists "createdAt" timestamptz not null default now();
alter table public.company_subscriptions add column if not exists "updatedAt" timestamptz not null default now();

create unique index if not exists company_subscriptions_company_id_idx
  on public.company_subscriptions(company_id);
create unique index if not exists company_subscriptions_asaas_subscription_id_idx
  on public.company_subscriptions(asaas_subscription_id)
  where asaas_subscription_id is not null;

create table if not exists public.subscription_payments (
  id varchar(64) primary key,
  subscription_id varchar(64) not null references public.company_subscriptions(id) on delete cascade,
  asaas_payment_id varchar(64) unique,
  billing_type varchar(32),
  description text,
  amount numeric(12,2) not null,
  status varchar(32) not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  external_id varchar(128),
  "createdAt" timestamptz not null default now()
);

alter table public.subscription_payments add column if not exists asaas_payment_id varchar(64);
alter table public.subscription_payments add column if not exists billing_type varchar(32);
alter table public.subscription_payments add column if not exists description text;
alter table public.subscription_payments add column if not exists amount numeric(12,2);
alter table public.subscription_payments add column if not exists status varchar(32) not null default 'pending';
alter table public.subscription_payments add column if not exists due_at timestamptz;
alter table public.subscription_payments add column if not exists paid_at timestamptz;
alter table public.subscription_payments add column if not exists external_id varchar(128);
alter table public.subscription_payments add column if not exists "createdAt" timestamptz not null default now();

create table if not exists public.asaas_webhook_events (
  id varchar(160) primary key,
  event varchar(100) not null,
  payload jsonb not null,
  processed_at timestamptz,
  "createdAt" timestamptz not null default now()
);

-- Mantém compatibilidade com uma instalação antiga que criou amount como varchar.
alter table public.billing_plans alter column active type boolean using lower(active::text) = 'true';
alter table public.company_subscriptions alter column amount type numeric(12,2) using nullif(amount::text, '')::numeric;
alter table public.subscription_payments alter column amount type numeric(12,2) using nullif(amount::text, '')::numeric;

alter table public.billing_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.asaas_webhook_events enable row level security;

drop policy if exists "billing plans are readable by authenticated users" on public.billing_plans;
create policy "billing plans are readable by authenticated users"
  on public.billing_plans for select to authenticated
  using (active = true);

drop policy if exists "owners can read their subscription" on public.company_subscriptions;
create policy "owners can read their subscription"
  on public.company_subscriptions for select to authenticated
  using (exists (
    select 1 from public.company_profiles company
    where company.id = company_subscriptions.company_id
      and company.user_id = auth.uid()::varchar
  ));

drop policy if exists "owners can read their payments" on public.subscription_payments;
create policy "owners can read their payments"
  on public.subscription_payments for select to authenticated
  using (exists (
    select 1
    from public.company_subscriptions subscription
    join public.company_profiles company on company.id = subscription.company_id
    where subscription.id = subscription_payments.subscription_id
      and company.user_id = auth.uid()::varchar
  ));

revoke all on public.asaas_webhook_events from anon, authenticated;
grant all on public.billing_plans to service_role;
grant all on public.company_subscriptions to service_role;
grant all on public.subscription_payments to service_role;
grant all on public.asaas_webhook_events to service_role;

-- Migração de empresas antigas: cria trial uma única vez com base na criação da empresa.
insert into public.company_subscriptions (
  id, company_id, plan, status, trial_started_at, trial_ends_at, amount
)
select
  'sub-' || company.id,
  company.id,
  'Profissional',
  case
    when company."createdAt" + interval '30 days' > now() then 'trialing'
    else 'expired'
  end,
  company."createdAt",
  company."createdAt" + interval '30 days',
  179
from public.company_profiles company
where not exists (
  select 1 from public.company_subscriptions subscription
  where subscription.company_id = company.id
)
on conflict (company_id) do nothing;