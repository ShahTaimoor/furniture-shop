create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  name text,
  email text not null unique,
  phone text,
  password_hash text not null,
  role smallint not null default 0 check (role in (0, 1, 2)),
  address text,
  city text,
  is_active boolean not null default true,
  email_verified boolean not null default false,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row
  execute function set_updated_at();
