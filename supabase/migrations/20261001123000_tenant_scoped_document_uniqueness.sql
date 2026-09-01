-- Unicidade de documento POR TENANT em clientes e pacientes, e um membro de
-- equipe em um único workspace.
-- Plano: docs/plano-limites-tenant-e-billing.md §4.4 (T1b)
--
-- ⚠️ Escopos diferentes, não confundir:
--    profiles.document_id  → único GLOBAL   (o tenant; ver 20261001120000)
--    clients.document_id   → único POR TENANT
--    patients.document_id  → único POR TENANT
--
-- Índice único global em patients/clients quebraria o multi-tenant: a mesma pessoa
-- pode legitimamente ser paciente de dois profissionais, e a mesma empresa cliente
-- de duas consultorias. Pior: o erro de duplicidade revelaria a um tenant que
-- aquele documento já existe em outro — vazamento por canal lateral.
--
-- PRÉ-CONDIÇÃO — rodar antes e limpar o que aparecer:
--   select user_id, document_id, count(*) from public.patients
--    where document_id is not null group by 1,2 having count(*) > 1;
--   select member_user_id, count(*) from public.team_members
--    where member_user_id is not null and is_active group by 1 having count(*) > 1;

create unique index if not exists patients_user_document_uidx
  on public.patients (user_id, document_id)
  where document_id is not null;

-- clients.document_id: SEM índice único, de propósito. A mesma empresa pode ter
-- várias unidades sob um único CNPJ (ex.: 3 plantas da mesma indústria). O
-- formulário avisa sobre repetição em vez de bloquear — lib/clientes/duplicate-document.ts.

-- ─────────────────────────────────────────────────────────────────────────────
-- Um membro ATIVO pertence a exatamente um workspace.
--
-- `public.workspace_account_owner_id()` resolve o tenant da sessão com
-- `select tm.owner_user_id ... where member_user_id = auth.uid() and is_active limit 1`.
-- Sem esta restrição, um usuário ativo em dois workspaces faz o `limit 1` escolher
-- um tenant ARBITRÁRIO — e a sessão passa a ver os dados do workspace errado.
--
-- Vínculo INATIVO em outro workspace continua permitido: é o caso do profissional
-- que saiu de uma clínica e entrou noutra.
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists team_members_member_user_id_uidx
  on public.team_members (member_user_id)
  where member_user_id is not null and is_active;
