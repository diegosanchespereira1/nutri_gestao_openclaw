alter table public.profiles
  add column if not exists agenda_start_hour smallint not null default 6
  constraint profiles_agenda_start_hour_range check (agenda_start_hour >= 0 and agenda_start_hour <= 12);
