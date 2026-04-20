-- Migração: backfill de estabelecimentos para clientes PJ sem estabelecimento.
--
-- Contexto: com o novo fluxo, o estabelecimento é criado automaticamente ao
-- cadastrar um cliente PJ. Clientes PJ criados antes dessa mudança nunca
-- tiveram um estabelecimento gerado — por isso não aparecem em checklists,
-- visitas ou qualquer tela que dependa da tabela establishments.
--
-- Esta migration cria um estabelecimento para cada cliente PJ que ainda não
-- possui um, usando:
--   name            → trade_name se preenchido, senão legal_name
--   establishment_type → derivado de business_segment (mesmo mapeamento do app)
--   address_line1   → NULL (nullable após migration 20260420110000)
--   demais campos   → NULL

insert into public.establishments (client_id, name, establishment_type)
select
  c.id as client_id,
  coalesce(nullif(trim(c.trade_name), ''), trim(c.legal_name)) as name,
  case c.business_segment
    when 'escola'     then 'escola'
    when 'hospital'   then 'hospital'
    when 'clinica'    then 'clinica'
    when 'lar_idosos' then 'lar_idosos'
    else 'empresa'
  end as establishment_type
from public.clients c
where c.kind = 'pj'
  and not exists (
    select 1
    from public.establishments e
    where e.client_id = c.id
  );
