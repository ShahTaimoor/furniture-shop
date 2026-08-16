create extension if not exists pgcrypto;

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('fixed','percentage')),
  discount_value numeric not null,
  minimum_order_amount numeric default 0,
  maximum_discount_amount numeric,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  usage_limit integer,
  usage_count integer not null default 0,
  per_user_limit integer not null default 1,
  applicable_categories uuid[] default '{}',
  applicable_products uuid[] default '{}',
  excluded_categories uuid[] default '{}',
  excluded_products uuid[] default '{}',
  first_time_users_only boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','expired')),
  created_by text,
  used_by jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_status on coupons(status);
create index if not exists idx_coupons_valid_until on coupons(valid_until);

drop trigger if exists trg_coupons_updated_at on coupons;
create trigger trg_coupons_updated_at
  before update on coupons
  for each row
  execute function set_updated_at();
