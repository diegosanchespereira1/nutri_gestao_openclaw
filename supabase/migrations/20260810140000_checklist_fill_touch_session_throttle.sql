-- Evita contenção em checklist_fill_sessions: cada INSERT/UPDATE/DELETE em
-- checklist_fill_item_responses disparava UPDATE na mesma linha de sessão.
-- Com autosave em paralelo, vários UPDATEs na sessão serializavam e degradavam
-- o Postgres (incl. GoTrue / login). Só actualiza updated_at da sessão se a
-- última actualização foi há mais de 5s.

create or replace function public.checklist_fill_touch_session_from_response ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if tg_op = 'DELETE' then
    sid := old.session_id;
  else
    sid := new.session_id;
  end if;

  update public.checklist_fill_sessions s
  set updated_at = now()
  where s.id = sid
    and (
      s.updated_at is null
      or s.updated_at < now() - interval '5 seconds'
    );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
