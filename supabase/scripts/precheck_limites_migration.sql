-- Pré-condições das migrações 20261001* (limites por tenant).
-- Rodar ANTES de aplicar, em DEV e depois em PRD. Nenhum comando altera dados.
--
--   psql "$SUPABASE_DB_URL" -f supabase/scripts/precheck_limites_migration.sql
--
-- Qualquer linha devolvida pelos blocos 1, 2 e 4 FAZ A MIGRAÇÃO FALHAR.
-- Índice único não se cria sobre dados duplicados.
--
-- O bloco 3 (documento de cliente) é INFORMATIVO, não bloqueia: não existe
-- índice único em clients.document_id de propósito — a mesma empresa pode ter
-- várias unidades sob um CNPJ só. Ver lib/clientes/duplicate-document.ts.

\echo '=== 1. Documento de tenant duplicado (profiles.document_id é único GLOBAL) ==='
select document_id, count(*) as ocorrencias, array_agg(user_id) as tenants
from public.profiles
where document_id is not null
group by document_id
having count(*) > 1;

\echo '=== 2. Documento de paciente duplicado DENTRO do mesmo tenant ==='
select user_id, document_id, count(*) as ocorrencias, array_agg(id) as pacientes
from public.patients
where document_id is not null
group by user_id, document_id
having count(*) > 1;

\echo '=== 3. Documento de cliente repetido no mesmo tenant (INFORMATIVO, não bloqueia) ==='
select owner_user_id, document_id, count(*) as ocorrencias, array_agg(id) as clientes
from public.clients
where document_id is not null
group by owner_user_id, document_id
having count(*) > 1;

\echo '=== 4. Membro de equipe ATIVO em mais de um workspace ==='
select member_user_id, count(*) as workspaces, array_agg(owner_user_id) as titulares
from public.team_members
where member_user_id is not null and is_active
group by member_user_id
having count(*) > 1;

\echo '=== 5. Panorama: tenants e uso atual (informativo) ==='
select
  (select count(*) from public.profiles)                                as tenants,
  (select count(*) from public.profiles where document_id is not null)  as tenants_com_documento,
  (select count(*) from public.clients)                                 as clientes,
  (select count(*) from public.patients)                                as pacientes,
  (select count(*) from public.team_members where is_active)            as membros_ativos;

\echo '=== 6. Tenants que JÁ passariam do limite padrão de 25 (informativo) ==='
select p.user_id, p.full_name,
       (select count(*) from public.clients c  where c.owner_user_id = p.user_id) as clientes,
       (select count(*) from public.patients pa where pa.user_id     = p.user_id) as pacientes
from public.profiles p
where (select count(*) from public.clients c  where c.owner_user_id = p.user_id) > 25
   or (select count(*) from public.patients pa where pa.user_id     = p.user_id) > 25
order by 3 desc, 4 desc;
