create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories(id) on delete cascade,
  picture_secure_url text,
  picture_public_id text,
  picture_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_parent_id on categories(parent_id);
create index if not exists idx_categories_slug on categories(slug);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at
  before update on categories
  for each row
  execute function set_updated_at();
