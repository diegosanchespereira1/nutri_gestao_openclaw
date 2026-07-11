-- Auditoria somente leitura — roda antes da migração de client_id em
-- professional_raw_materials (ver _bmad-output/planning-artifacts/
-- plano-isolamento-cliente-receitas-materias-primas.md).
--
-- Objetivo: identificar matérias-primas hoje usadas (via technical_recipe_lines)
-- por receitas de MAIS DE UM cliente. Depois da migração, cada matéria-prima só
-- pode pertencer a um client_id — esses casos precisam ser resolvidos (duplicar
-- o item, um por cliente, e repontar as linhas de receita) antes da migração de
-- fechamento (client_id NOT NULL).
--
-- Não faz nenhuma escrita. Rode no SQL Editor do Supabase (produção ou local)
-- e compartilhe o resultado antes de seguir para a fase de reatribuição.

-- 1) Matérias-primas usadas por receitas de mais de um cliente, com o cliente
--    mais frequente (sugestão de atribuição) e a lista completa de clientes
--    afetados.
with raw_material_clients as (
  select
    rm.id as raw_material_id,
    rm.name as raw_material_name,
    rm.owner_user_id,
    r.client_id,
    c.legal_name as client_legal_name,
    c.trade_name as client_trade_name,
    count(distinct r.id) as recipe_count
  from public.professional_raw_materials rm
  join public.technical_recipe_lines l on l.raw_material_id = rm.id
  join public.technical_recipes r on r.id = l.recipe_id
  join public.clients c on c.id = r.client_id
  group by rm.id, rm.name, rm.owner_user_id, r.client_id, c.legal_name, c.trade_name
),
raw_material_client_counts as (
  select
    raw_material_id,
    raw_material_name,
    owner_user_id,
    count(distinct client_id) as distinct_clients,
    sum(recipe_count) as total_recipes
  from raw_material_clients
  group by raw_material_id, raw_material_name, owner_user_id
)
select
  rmc.raw_material_id,
  rmc.raw_material_name,
  rmc.owner_user_id,
  rmc.distinct_clients,
  rmc.total_recipes,
  (
    select rmcl.client_id
    from raw_material_clients rmcl
    where rmcl.raw_material_id = rmc.raw_material_id
    order by rmcl.recipe_count desc, rmcl.client_id
    limit 1
  ) as suggested_client_id,
  (
    select coalesce(rmcl.client_trade_name, rmcl.client_legal_name)
    from raw_material_clients rmcl
    where rmcl.raw_material_id = rmc.raw_material_id
    order by rmcl.recipe_count desc, rmcl.client_id
    limit 1
  ) as suggested_client_name,
  (
    select jsonb_agg(
      jsonb_build_object(
        'client_id', rmcl.client_id,
        'client_name', coalesce(rmcl.client_trade_name, rmcl.client_legal_name),
        'recipe_count', rmcl.recipe_count
      )
      order by rmcl.recipe_count desc
    )
    from raw_material_clients rmcl
    where rmcl.raw_material_id = rmc.raw_material_id
  ) as clients_detail
from raw_material_client_counts rmc
where rmc.distinct_clients > 1
order by rmc.distinct_clients desc, rmc.total_recipes desc;

-- 2) Resumo: quantas matérias-primas por tenant (owner_user_id) caem no caso
--    acima, e quantas ficariam sem nenhum uso em receita (candidatas a ficar
--    "sem cliente" até o usuário decidir, sem risco de quebrar receita nenhuma).
select
  rm.owner_user_id,
  count(*) filter (where usage.recipe_count is null or usage.recipe_count = 0) as sem_uso_em_receita,
  count(*) filter (where usage.distinct_clients = 1) as uso_em_1_cliente_ok,
  count(*) filter (where usage.distinct_clients > 1) as uso_em_multiplos_clientes_precisa_decisao,
  count(*) as total_materias_primas
from public.professional_raw_materials rm
left join (
  select
    l.raw_material_id,
    count(distinct r.client_id) as distinct_clients,
    count(distinct r.id) as recipe_count
  from public.technical_recipe_lines l
  join public.technical_recipes r on r.id = l.recipe_id
  group by l.raw_material_id
) usage on usage.raw_material_id = rm.id
group by rm.owner_user_id
order by uso_em_multiplos_clientes_precisa_decisao desc;
