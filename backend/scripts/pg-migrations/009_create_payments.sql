create extension if not exists pgcrypto;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id text not null,
  payment_method text not null check (payment_method in ('COD','CARD','BANK_TRANSFER','MOBILE_WALLET','STRIPE','PAYPAL','EASYPAISA','JAZZCASH')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','refunded','cancelled')),
  amount numeric not null,
  currency text not null default 'PKR',
  transaction_id text,
  gateway_reference text,
  gateway_name text,
  metadata jsonb not null default '{}',
  gateway_response jsonb not null default '{}',
  refund_amount numeric,
  refund_reason text,
  refunded_at timestamptz,
  refunded_by text,
  gateway_refund_id text,
  card_last4 text,
  card_brand text,
  wallet_provider text,
  wallet_account_number text,
  wallet_transaction_reference text,
  description text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_reason text,
  attempt_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_transaction_id on payments(transaction_id);
create index if not exists idx_payments_gateway_reference on payments(gateway_reference);
create index if not exists idx_payments_created_at on payments(created_at desc);

drop trigger if exists trg_payments_updated_at on payments;
create trigger trg_payments_updated_at
  before update on payments
  for each row
  execute function set_updated_at();
