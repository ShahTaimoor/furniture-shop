create extension if not exists pgcrypto;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  photos jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending','approved','rejected','flagged')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  flagged_reason text,
  helpful_count integer not null default 0,
  helpful_by text[] default '{}',
  is_edited boolean not null default false,
  admin_response_message text,
  admin_response_by text,
  admin_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_reviews_product_id on reviews(product_id);
create index if not exists idx_reviews_user_id on reviews(user_id);
create index if not exists idx_reviews_status on reviews(status);

drop trigger if exists trg_reviews_updated_at on reviews;
create trigger trg_reviews_updated_at
  before update on reviews
  for each row
  execute function set_updated_at();
