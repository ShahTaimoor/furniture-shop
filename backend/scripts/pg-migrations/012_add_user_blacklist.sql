alter table users add column if not exists is_blacklisted boolean not null default false;
create index if not exists idx_users_is_blacklisted on users(is_blacklisted);
