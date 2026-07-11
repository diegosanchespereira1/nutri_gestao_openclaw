-- Garante, no nível de banco, que o profissional nunca tem duas matérias-primas
-- com o mesmo nome (ignorando maiúsculas/minúsculas e espaços nas pontas).
-- Complementa a checagem em nível de aplicação feita pelo upload em massa
-- (lib/actions/import-raw-materials.ts) — mesmo em caso de corrida entre duas
-- requisições concorrentes, o banco recusa o duplicado.
--
-- ATENÇÃO ao aplicar em ambiente com dados já existentes: se já houver duas
-- linhas com o mesmo nome (case-insensitive) para o mesmo owner_user_id, a
-- criação do índice único abaixo falha. Rode antes, se necessário:
--
--   select owner_user_id, lower(btrim(name)), count(*)
--   from public.professional_raw_materials
--   group by 1, 2
--   having count(*) > 1;
--
-- e renomeie/mescle os duplicados manualmente antes de reaplicar esta migration.

drop index if exists public.professional_raw_materials_owner_name_idx;

create unique index if not exists professional_raw_materials_owner_name_uniq
  on public.professional_raw_materials (owner_user_id, lower(btrim(name)));
