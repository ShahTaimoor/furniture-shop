create extension if not exists pgcrypto;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  address text not null,
  city text not null,
  phone text not null,
  notes text,
  products jsonb not null default '[]',
  user_id text,
  is_guest_order boolean not null default false,
  guest_name text,
  guest_email text,
  guest_phone text,
  payment_method text not null default 'COD'
    check (payment_method in ('COD','CARD','BANK_TRANSFER','MOBILE_WALLET','STRIPE','PAYPAL','EASYPAISA','JAZZCASH')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  payment_id text,
  coupon_id text,
  coupon_code text,
  discount_amount numeric not null default 0,
  shipping_address_id text,
  status text not null default 'pending',
  location jsonb,
  status_history jsonb not null default '[]',
  packer_name text default '',
  shipping_provider text,
  tracking_number text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_guest_email on orders(guest_email);
create index if not exists idx_orders_created_at on orders(created_at desc);

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row
  execute function set_updated_at();
