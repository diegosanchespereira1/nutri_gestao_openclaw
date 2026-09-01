-- Documento fiscal do tenant — CPF ou CNPJ.
-- Plano: docs/plano-limites-tenant-e-billing.md §4.1
--
-- Profissional autônomo sem CNPJ é caso válido, por isso os dois tipos são aceitos.
-- Guardamos SÓ DÍGITOS; a máscara é responsabilidade da UI (lib/format/br-document.ts).
-- A validação de dígito verificador continua no TypeScript (lib/validators/br-document.ts);
-- o check aqui cobre apenas o formato, para não reimplementar módulo 11 em PL/pgSQL.

alter table public.profiles
  add column if not exists document_kind text,
  add column if not exists document_id   text;

-- Coerência: ou os dois nulos, ou os dois preenchidos com o tamanho certo.
alter table public.profiles
  drop constraint if exists profiles_document_pair_check;

alter table public.profiles
  add constraint profiles_document_pair_check check (
    (document_kind is null and document_id is null)
    or (document_kind = 'cpf'  and document_id ~ '^[0-9]{11}$')
    or (document_kind = 'cnpj' and document_id ~ '^[0-9]{14}$')
  );

-- Nullable de propósito: os tenants que já existem não têm documento.
-- A obrigatoriedade é aplicada nos fluxos de cadastro (Server Actions), não por NOT NULL.

-- O documento do TENANT é único na plataforma — ao contrário do documento de
-- cliente e de paciente, que são únicos apenas dentro do tenant (ver 20261001123000).
create unique index if not exists profiles_document_id_uidx
  on public.profiles (document_id)
  where document_id is not null;

comment on column public.profiles.document_kind is
  'cpf | cnpj — tipo do documento fiscal do tenant.';
comment on column public.profiles.document_id is
  'Apenas dígitos. Único na plataforma. Validação de DV é feita na aplicação.';
