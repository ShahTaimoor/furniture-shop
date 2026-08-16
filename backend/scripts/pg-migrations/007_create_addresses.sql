create extension if not exists pgcrypto;

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null default 'home' check (type in ('home','work','other')),
  full_name text not null,
  phone text not null,
  alt_phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'Pakistan',
  delivery_instructions text,
  is_default boolean not null default false,
  landmark text,
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user_id on addresses(user_id);
create index if not exists idx_addresses_user_active on addresses(user_id, is_active);
create index if not exists idx_addresses_user_default on addresses(user_id, is_default);

drop trigger if exists trg_addresses_updated_at on addresses;
create trigger trg_addresses_updated_at
  before update on addresses
  for each row
  execute function set_updated_at();
