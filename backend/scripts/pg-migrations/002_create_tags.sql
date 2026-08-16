create extension if not exists pgcrypto;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text default '',
  color text,
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tags_slug on tags(slug);
create index if not exists idx_tags_is_active on tags(is_active);

drop trigger if exists trg_tags_updated_at on tags;
create trigger trg_tags_updated_at
  before update on tags
  for each row
  execute function set_updated_at();
