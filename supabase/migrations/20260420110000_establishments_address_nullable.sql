-- Migração: address_line1 passa a ser nullable em establishments.
--
-- Com o novo fluxo de cadastro (estabelecimento criado automaticamente junto
-- com o cliente PJ), o endereço pode não ser preenchido de imediato.
-- A restrição NOT NULL é desnecessariamente restritiva para criação automática;
-- a validação de negócio (endereço obrigatório antes de visitas) é feita
-- na camada de aplicação, não no schema.
--
-- Impacto: nenhuma query existente quebra — o código já trata address_line1
-- como opcional na exibição (establishments-section.tsx, establishment-form).

alter table public.establishments
  alter column address_line1 drop not null;

comment on column public.establishments.address_line1
  is 'Linha 1 do endereço do estabelecimento. Nullable: pode ser preenchido após a criação automática com o cliente PJ.';
