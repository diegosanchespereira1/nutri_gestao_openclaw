-- Diagnóstico do banco (Fase 2 da auditoria) — Supabase Cloud, produção.
-- Rodar no SQL Editor: https://supabase.com/dashboard/project/abwzwwazdeptvafwlhon/sql/new
-- IMPORTANTE: rode UM BLOCO POR VEZ (o editor só mostra o resultado do último
-- comando) e cole cada resultado na conversa (botão "Copy as Markdown" ajuda).

-- ═══ BLOCO 1: Top 15 queries por tempo total acumulado ═══════════════════════
select
  round(total_exec_time::numeric, 0) as total_ms,
  calls,
  round(mean_exec_time::numeric, 1) as media_ms,
  rows as linhas,
  left(regexp_replace(query, '\s+', ' ', 'g'), 160) as query
from pg_stat_statements
where query not ilike '%pg_stat%'
order by total_exec_time desc
limit 15;

-- ═══ BLOCO 2: Top 15 queries mais LENTAS por chamada (com uso relevante) ═════
select
  round(mean_exec_time::numeric, 1) as media_ms,
  calls,
  round(total_exec_time::numeric, 0) as total_ms,
  left(regexp_replace(query, '\s+', ' ', 'g'), 160) as query
from pg_stat_statements
where calls >= 20 and query not ilike '%pg_stat%'
order by mean_exec_time desc
limit 15;

-- ═══ BLOCO 3: Foreign keys SEM índice (joins e cascades lentos) ══════════════
select
  c.conrelid::regclass as tabela,
  c.conname as constraint_fk,
  a.attname as coluna
from pg_constraint c
join pg_attribute a
  on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid
      and i.indkey[0] = c.conkey[1]
  )
order by 1;

-- ═══ BLOCO 4: Tabelas mais lidas por SEQUENTIAL SCAN (candidatas a índice) ═══
select
  relname as tabela,
  seq_scan,
  idx_scan,
  n_live_tup as linhas_vivas,
  pg_size_pretty(pg_total_relation_size(relid)) as tamanho
from pg_stat_user_tables
where seq_scan > 0
order by seq_scan desc
limit 15;

-- ═══ BLOCO 5: Políticas RLS com auth.uid() SEM initplan (reavaliado por linha) ═
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and (
    (qual is not null and qual ~* 'auth\.uid\(\)' and qual !~* '\( ?SELECT auth\.uid\(\)')
    or
    (with_check is not null and with_check ~* 'auth\.uid\(\)' and with_check !~* '\( ?SELECT auth\.uid\(\)')
  )
order by tablename, policyname;

-- ═══ BLOCO 6: Índices nunca usados (custo de escrita sem benefício) ══════════
select
  s.relname as tabela,
  s.indexrelname as indice,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as tamanho
from pg_stat_user_indexes s
join pg_index i on i.indexrelid = s.indexrelid
where s.idx_scan = 0
  and not i.indisunique
  and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc
limit 15;

-- ═══ BLOCO 7: Saúde geral — cache hit e tamanho das maiores tabelas ══════════
select
  'cache_hit_ratio' as metrica,
  round(
    (sum(heap_blks_hit)::numeric / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100,
    2
  )::text || '%' as valor
from pg_statio_user_tables
union all
select
  'maior_tabela: ' || relname,
  pg_size_pretty(pg_total_relation_size(relid))
from pg_stat_user_tables
order by 1
limit 11;
