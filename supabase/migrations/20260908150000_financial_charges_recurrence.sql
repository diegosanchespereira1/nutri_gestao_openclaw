-- Cobrança recorrente: flag + data de término opcional (só quando recorrente).

alter table public.financial_charges
  add column if not exists is_recurring boolean not null default false;

alter table public.financial_charges
  add column if not exists recurrence_ends_on date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_charges_recurrence_end_check'
      and conrelid = 'public.financial_charges'::regclass
  ) then
    alter table public.financial_charges
      add constraint financial_charges_recurrence_end_check
      check (
        (
          not is_recurring
          and recurrence_ends_on is null
        )
        or (
          is_recurring
          and (
            recurrence_ends_on is null
            or recurrence_ends_on >= due_date
          )
        )
      );
  end if;
end $$;

create index if not exists financial_charges_owner_recurring_due_idx
  on public.financial_charges (owner_user_id, due_date)
  where is_recurring;
