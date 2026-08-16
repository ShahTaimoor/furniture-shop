create extension if not exists pgcrypto;

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  participants text[] not null,
  participant_hash text not null,
  is_group boolean not null default false,
  created_by text,
  metadata jsonb not null default '{}',
  last_message jsonb,
  unread_counts jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chats_participant_hash on chats(participant_hash);
create index if not exists idx_chats_participants on chats using gin(participants);
create index if not exists idx_chats_updated_at on chats(updated_at desc);

drop trigger if exists trg_chats_updated_at on chats;
create trigger trg_chats_updated_at
  before update on chats
  for each row
  execute function set_updated_at();

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id text not null,
  content text,
  message_type text not null default 'text' check (message_type in ('text','image','file')),
  attachments jsonb not null default '[]',
  seen_by text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_chat_created on messages(chat_id, created_at);
create index if not exists idx_messages_sender on messages(sender_id);

drop trigger if exists trg_messages_updated_at on messages;
create trigger trg_messages_updated_at
  before update on messages
  for each row
  execute function set_updated_at();
