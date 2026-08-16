create extension if not exists pgcrypto;

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_name text not null,
  url text not null,
  public_id text not null unique,
  size bigint not null,
  type text not null,
  folder text not null default 'media',
  uploaded_by text not null references users(id) on delete cascade,
  tags text[] not null default '{}',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_uploaded_by on media(uploaded_by);
create index if not exists idx_media_created_at on media(created_at desc);
create index if not exists idx_media_search on media using gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(original_name, '') || ' ' || coalesce(description, ''))
);

drop trigger if exists trg_media_updated_at on media;
create trigger trg_media_updated_at
  before update on media
  for each row
  execute function set_updated_at();
