-- Story 2.1 — Sistema de pontuação por checklist.
--
-- Adiciona peso (weight) a cada item de checklist (global e personalizado)
-- e colunas de score calculado na sessão de preenchimento.
--
-- Fórmula:
--   score_percentage = SUM(peso WHERE outcome='conforme')
--                      ─────────────────────────────────── × 100
--                      SUM(peso WHERE outcome != 'na')
--
-- Itens 'na' são excluídos completamente do cálculo (nem numerador nem denominador).
-- O score é calculado e persistido no momento da aprovação do dossiê.

-- ── 1. Peso nos itens globais ──────────────────────────────────────────────
alter table public.checklist_template_items
  add column if not exists peso numeric(5, 2) not null default 1
    check (peso > 0);

comment on column public.checklist_template_items.peso is
  'Peso do item no cálculo de pontuação (padrão = 1). Itens mais críticos podem ter peso maior.';

-- ── 2. Peso nos itens personalizados ──────────────────────────────────────
alter table public.checklist_custom_items
  add column if not exists peso numeric(5, 2) not null default 1
    check (peso > 0);

comment on column public.checklist_custom_items.peso is
  'Peso do item no cálculo de pontuação (padrão = 1). Espelha a lógica dos itens globais.';

-- ── 3. Colunas de score na sessão ─────────────────────────────────────────
alter table public.checklist_fill_sessions
  add column if not exists score_percentage    numeric(5, 2),
  add column if not exists score_points_earned numeric(10, 2),
  add column if not exists score_points_total  numeric(10, 2);

comment on column public.checklist_fill_sessions.score_percentage is
  'Percentual de conformidade (0.00 a 100.00). Calculado e persistido ao aprovar o dossiê.';

comment on column public.checklist_fill_sessions.score_points_earned is
  'Soma dos pesos dos itens em conformidade (outcome=''conforme'').';

comment on column public.checklist_fill_sessions.score_points_total is
  'Soma dos pesos dos itens aplicáveis (outcome != ''na''). Denominator do score.';

-- ── 4. Função de cálculo e persistência do score ──────────────────────────
--
-- Chamada dentro de approveChecklistFillDossierAction (TypeScript) logo antes
-- de setar dossier_approved_at. Calcula com base nas respostas já salvas.
-- Suporta tanto templates globais quanto personalizados.

create or replace function public.calculate_and_store_session_score(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_earned  numeric(10, 2);
  v_total   numeric(10, 2);
  v_pct     numeric(5, 2);
  v_is_custom boolean;
begin
  -- Detectar se a sessão usa template personalizado
  select (custom_template_id is not null)
    into v_is_custom
    from public.checklist_fill_sessions
   where id = p_session_id;

  if not found then
    return;
  end if;

  if v_is_custom then
    -- Templates personalizados: join com checklist_custom_items
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_custom_items i on i.id = r.custom_item_id
     where r.session_id = p_session_id
       and r.custom_item_id is not null;
  else
    -- Templates globais: join com checklist_template_items
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_template_items i on i.id = r.template_item_id
     where r.session_id = p_session_id
       and r.template_item_id is not null;
  end if;

  -- Calcular percentual (null se não houver itens aplicáveis)
  if v_total > 0 then
    v_pct := round((v_earned / v_total) * 100, 2);
  else
    v_pct := null;
  end if;

  update public.checklist_fill_sessions
     set score_percentage    = v_pct,
         score_points_earned = v_earned,
         score_points_total  = v_total
   where id = p_session_id;
end;
$$;

comment on function public.calculate_and_store_session_score(uuid) is
  'Calcula e persiste o score de conformidade de uma sessão de checklist. '
  'Deve ser chamada antes de definir dossier_approved_at.';
