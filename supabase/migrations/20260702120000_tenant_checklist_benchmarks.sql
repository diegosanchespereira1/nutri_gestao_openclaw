-- ─────────────────────────────────────────────────────────────────────────────
-- Benchmark de pontuação da carteira por tenant
-- Story: relatório de evolução de checklists (exportação PDF) — indicador de
-- benchmark comparando a média das avaliações de todos os clientes do tenant.
--
-- Tabela materializada com 1 linha por tenant (owner_user_id), recalculada por
-- trigger sempre que uma sessão de checklist é aprovada, reaberta ou tem o
-- score alterado. Leitura via RLS (owner + membros da equipe); escrita apenas
-- pela função SECURITY DEFINER do trigger.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.tenant_checklist_benchmarks (
  owner_user_id          uuid primary key references auth.users(id) on delete cascade,
  -- Média (0-100) de score_percentage das sessões aprovadas com score de todos
  -- os clientes do tenant.
  avg_score              numeric(5,2) not null default 0,
  -- Número de sessões aprovadas com score (denominador da média).
  scored_sessions_count  integer not null default 0,
  -- Número de clientes distintos com pelo menos uma sessão pontuada.
  clients_count          integer not null default 0,
  updated_at             timestamptz not null default now()
);

comment on table public.tenant_checklist_benchmarks is
  'Benchmark agregado de pontuação de checklists por tenant (média da carteira). Mantido por trigger em checklist_fill_sessions.';

alter table public.tenant_checklist_benchmarks enable row level security;

-- Leitura: owner do workspace e membros da equipe (mesmo padrão das demais tabelas).
drop policy if exists "tenant_benchmark_select" on public.tenant_checklist_benchmarks;
create policy "tenant_benchmark_select" on public.tenant_checklist_benchmarks
  for select
  using (owner_user_id = (select public.workspace_account_owner_id()));

-- Sem policies de insert/update/delete: escrita exclusivamente via função
-- SECURITY DEFINER abaixo (chamada pelo trigger).

-- ── Função de recálculo ──────────────────────────────────────────────────────

create or replace function public.recalc_tenant_checklist_benchmark(p_owner_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.tenant_checklist_benchmarks
    (owner_user_id, avg_score, scored_sessions_count, clients_count, updated_at)
  select
    p_owner_user_id,
    coalesce(round(avg(s.score_percentage)::numeric, 2), 0),
    count(s.id),
    count(distinct c.id),
    now()
  from public.clients c
  join public.establishments e on e.client_id = c.id
  join public.checklist_fill_sessions s
    on s.establishment_id = e.id
   and s.dossier_approved_at is not null
   and s.score_percentage is not null
  where c.owner_user_id = p_owner_user_id
  on conflict (owner_user_id) do update
    set avg_score             = excluded.avg_score,
        scored_sessions_count = excluded.scored_sessions_count,
        clients_count         = excluded.clients_count,
        updated_at            = excluded.updated_at;
$$;

-- Escrita restrita: apenas o trigger (roda como definer) usa a função.
revoke execute on function public.recalc_tenant_checklist_benchmark(uuid) from public;
revoke execute on function public.recalc_tenant_checklist_benchmark(uuid) from anon;
revoke execute on function public.recalc_tenant_checklist_benchmark(uuid) from authenticated;

-- ── Trigger em checklist_fill_sessions ───────────────────────────────────────

create or replace function public.tg_recalc_tenant_checklist_benchmark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_establishment uuid;
begin
  v_establishment := coalesce(new.establishment_id, old.establishment_id);

  select c.owner_user_id
    into v_owner
  from public.establishments e
  join public.clients c on c.id = e.client_id
  where e.id = v_establishment;

  if v_owner is not null then
    perform public.recalc_tenant_checklist_benchmark(v_owner);
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.tg_recalc_tenant_checklist_benchmark() from public;
revoke execute on function public.tg_recalc_tenant_checklist_benchmark() from anon;
revoke execute on function public.tg_recalc_tenant_checklist_benchmark() from authenticated;

drop trigger if exists trg_tenant_benchmark_recalc on public.checklist_fill_sessions;
create trigger trg_tenant_benchmark_recalc
  after insert or delete
     or update of dossier_approved_at, score_percentage
  on public.checklist_fill_sessions
  for each row
  execute function public.tg_recalc_tenant_checklist_benchmark();

-- ── Backfill: calcula o benchmark para todos os tenants existentes ──────────

do $$
declare
  r record;
begin
  for r in (
    select distinct c.owner_user_id
    from public.clients c
    join public.establishments e on e.client_id = c.id
    join public.checklist_fill_sessions s
      on s.establishment_id = e.id
     and s.dossier_approved_at is not null
     and s.score_percentage is not null
  ) loop
    perform public.recalc_tenant_checklist_benchmark(r.owner_user_id);
  end loop;
end;
$$;
