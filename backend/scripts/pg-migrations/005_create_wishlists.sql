create extension if not exists pgcrypto;

create table if not exists wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_wishlists_user_id on wishlists(user_id);

drop trigger if exists trg_wishlists_updated_at on wishlists;
create trigger trg_wishlists_updated_at
  before update on wishlists
  for each row
  execute function set_updated_at();
