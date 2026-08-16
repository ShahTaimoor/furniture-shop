create extension if not exists pgcrypto;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  type text not null check (type in (
    'order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled',
    'payment_success', 'payment_failed', 'promotional', 'system',
    'review_approved', 'review_rejected', 'stock_alert', 'price_drop', 'new_product'
  )),
  title text not null,
  message text not null,
  related_entity_type text check (related_entity_type in ('order', 'product', 'payment', 'review')),
  related_entity_id uuid,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  is_read boolean not null default false,
  read_at timestamptz,
  channels jsonb not null default '{"email": {"sent": false}, "sms": {"sent": false}, "push": {"sent": false}, "inApp": {"sent": true}}',
  action jsonb,
  data jsonb not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read_created on notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_user_type on notifications(user_id, type);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
create index if not exists idx_notifications_related_entity on notifications(related_entity_type, related_entity_id);

drop trigger if exists trg_notifications_updated_at on notifications;
create trigger trg_notifications_updated_at
  before update on notifications
  for each row
  execute function set_updated_at();
