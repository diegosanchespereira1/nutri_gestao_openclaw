alter table public.profiles
  add column if not exists agenda_end_hour smallint not null default 22
  constraint profiles_agenda_end_hour_range check (agenda_end_hour >= 12 and agenda_end_hour <= 23);

-- Garante que o PostgREST reconhece as novas colunas imediatamente.
notify pgrst, 'reload schema';
