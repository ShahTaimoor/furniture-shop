create extension if not exists pgcrypto;

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_carts_user_id on carts(user_id);

drop trigger if exists trg_carts_updated_at on carts;
create trigger trg_carts_updated_at
  before update on carts
  for each row
  execute function set_updated_at();
