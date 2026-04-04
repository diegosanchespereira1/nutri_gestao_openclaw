-- Story 4.7: registo de dossiê aprovado (FR23) e imutabilidade das respostas (FR70, MVP).

alter table public.checklist_fill_sessions
  add column if not exists dossier_approved_at timestamptz;

comment on column public.checklist_fill_sessions.dossier_approved_at is
  'Quando preenchido, o dossiê foi aprovado; respostas e fotos deixam de ser alteráveis (MVP).';

create or replace function public.checklist_fill_block_mutations_if_dossier_approved ()
returns trigger
language plpgsql
as $$
declare
  sid uuid;
begin
  sid := coalesce(NEW.session_id, OLD.session_id);
  if exists (
    select 1
    from public.checklist_fill_sessions s
    where
      s.id = sid
      and s.dossier_approved_at is not null
  ) then
    raise exception 'Dossiê aprovado: não é permitido alterar respostas desta sessão.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists checklist_fill_item_responses_block_if_approved_ins
  on public.checklist_fill_item_responses;
drop trigger if exists checklist_fill_item_responses_block_if_approved_upd
  on public.checklist_fill_item_responses;
drop trigger if exists checklist_fill_item_responses_block_if_approved_del
  on public.checklist_fill_item_responses;

create trigger checklist_fill_item_responses_block_if_approved_ins
  before insert on public.checklist_fill_item_responses
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();

create trigger checklist_fill_item_responses_block_if_approved_upd
  before update on public.checklist_fill_item_responses
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();

create trigger checklist_fill_item_responses_block_if_approved_del
  before delete on public.checklist_fill_item_responses
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();

drop trigger if exists checklist_fill_item_photos_block_if_approved_ins
  on public.checklist_fill_item_photos;
drop trigger if exists checklist_fill_item_photos_block_if_approved_upd
  on public.checklist_fill_item_photos;
drop trigger if exists checklist_fill_item_photos_block_if_approved_del
  on public.checklist_fill_item_photos;

create trigger checklist_fill_item_photos_block_if_approved_ins
  before insert on public.checklist_fill_item_photos
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();

create trigger checklist_fill_item_photos_block_if_approved_upd
  before update on public.checklist_fill_item_photos
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();

create trigger checklist_fill_item_photos_block_if_approved_del
  before delete on public.checklist_fill_item_photos
  for each row
  execute function public.checklist_fill_block_mutations_if_dossier_approved ();
