create extension if not exists pgcrypto;

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text,
  image_secure_url text not null,
  image_public_id text not null,
  redirect_link text,
  placement text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_placement on banners(placement);
create index if not exists idx_banners_status on banners(status);

drop trigger if exists trg_banners_updated_at on banners;
create trigger trg_banners_updated_at
  before update on banners
  for each row
  execute function set_updated_at();
