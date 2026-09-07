create table if not exists public.billing_idempotency (
  key text primary key,
  response jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists billing_idempotency_expires_at_idx
  on public.billing_idempotency (expires_at);

alter table public.billing_idempotency enable row level security;