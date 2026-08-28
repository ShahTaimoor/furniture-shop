create table if not exists settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on settings;
create trigger trg_settings_updated_at
  before update on settings
  for each row
  execute function set_updated_at();

insert into settings (key, value)
values ('currency', 'none')
on conflict (key) do nothing;
