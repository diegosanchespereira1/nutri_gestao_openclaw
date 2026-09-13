-- Snapshot por sessão: histórico do cliente independente do catálogo.
-- Permite exclusão real de modelos sem apagar preenchimentos.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Tabelas de snapshot
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.checklist_fill_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE
    REFERENCES public.checklist_fill_sessions (id) ON DELETE CASCADE,
  template_origin text NOT NULL
    CHECK (template_origin IN ('system', 'custom', 'workspace')),
  source_template_id uuid,
  name text NOT NULL,
  portaria_ref text,
  uf text,
  version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.checklist_fill_snapshots IS
  'Cópia congelada do modelo no início do preenchimento. Independente do catálogo.';

CREATE TABLE IF NOT EXISTS public.checklist_fill_snapshot_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL
    REFERENCES public.checklist_fill_snapshots (id) ON DELETE CASCADE,
  source_section_id uuid,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS checklist_fill_snapshot_sections_snapshot_idx
  ON public.checklist_fill_snapshot_sections (snapshot_id, position);

CREATE TABLE IF NOT EXISTS public.checklist_fill_snapshot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL
    REFERENCES public.checklist_fill_snapshots (id) ON DELETE CASCADE,
  snapshot_section_id uuid NOT NULL
    REFERENCES public.checklist_fill_snapshot_sections (id) ON DELETE CASCADE,
  source_item_id uuid NOT NULL,
  description text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_structure_only boolean NOT NULL DEFAULT false,
  peso numeric(5, 2) NOT NULL DEFAULT 1 CHECK (peso > 0),
  position integer NOT NULL DEFAULT 0,
  archived_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS checklist_fill_snapshot_items_source_uidx
  ON public.checklist_fill_snapshot_items (snapshot_id, source_item_id);

CREATE INDEX IF NOT EXISTS checklist_fill_snapshot_items_section_idx
  ON public.checklist_fill_snapshot_items (snapshot_section_id, position);

COMMENT ON COLUMN public.checklist_fill_snapshot_items.source_item_id IS
  'UUID do item no catálogo no momento do snapshot; respostas/fotos continuam a usar este id sem FK.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) RLS (via sessão do workspace)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.checklist_fill_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_fill_snapshot_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_fill_snapshot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_fill_snapshots_select"
  ON public.checklist_fill_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_fill_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id IN (SELECT public.workspace_member_user_ids())
          OR EXISTS (
            SELECT 1
            FROM public.establishments est
            JOIN public.clients cl ON cl.id = est.client_id
            WHERE est.id = s.establishment_id
              AND cl.owner_user_id = (SELECT public.workspace_account_owner_id())
          )
        )
    )
  );

CREATE POLICY "checklist_fill_snapshot_sections_select"
  ON public.checklist_fill_snapshot_sections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_fill_snapshots snap
      JOIN public.checklist_fill_sessions s ON s.id = snap.session_id
      WHERE snap.id = snapshot_id
        AND (
          s.user_id IN (SELECT public.workspace_member_user_ids())
          OR EXISTS (
            SELECT 1
            FROM public.establishments est
            JOIN public.clients cl ON cl.id = est.client_id
            WHERE est.id = s.establishment_id
              AND cl.owner_user_id = (SELECT public.workspace_account_owner_id())
          )
        )
    )
  );

CREATE POLICY "checklist_fill_snapshot_items_select"
  ON public.checklist_fill_snapshot_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.checklist_fill_snapshots snap
      JOIN public.checklist_fill_sessions s ON s.id = snap.session_id
      WHERE snap.id = snapshot_id
        AND (
          s.user_id IN (SELECT public.workspace_member_user_ids())
          OR EXISTS (
            SELECT 1
            FROM public.establishments est
            JOIN public.clients cl ON cl.id = est.client_id
            WHERE est.id = s.establishment_id
              AND cl.owner_user_id = (SELECT public.workspace_account_owner_id())
          )
        )
    )
  );

GRANT SELECT ON public.checklist_fill_snapshots TO authenticated;
GRANT SELECT ON public.checklist_fill_snapshot_sections TO authenticated;
GRANT SELECT ON public.checklist_fill_snapshot_items TO authenticated;
GRANT ALL ON public.checklist_fill_snapshots TO service_role;
GRANT ALL ON public.checklist_fill_snapshot_sections TO service_role;
GRANT ALL ON public.checklist_fill_snapshot_items TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Função: criar / garantir snapshot da sessão
--    p_mode = 'create'  → só itens ativos (novo preenchimento)
--    p_mode = 'backfill' → itens visíveis no histórico + órfãos com resposta
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_checklist_fill_session_snapshot(
  p_session_id uuid,
  p_mode text DEFAULT 'create'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sess record;
  v_snap_id uuid;
  v_origin text;
  v_name text;
  v_portaria text;
  v_uf text;
  v_version integer;
  v_source_id uuid;
  v_sec record;
  v_sec_id uuid;
  v_item record;
  v_mode text := coalesce(nullif(trim(p_mode), ''), 'create');
BEGIN
  IF v_mode NOT IN ('create', 'backfill') THEN
    v_mode := 'create';
  END IF;

  SELECT id INTO v_snap_id
  FROM public.checklist_fill_snapshots
  WHERE session_id = p_session_id;

  IF v_snap_id IS NOT NULL THEN
    RETURN v_snap_id;
  END IF;

  SELECT
    s.id,
    s.created_at,
    s.template_id,
    s.custom_template_id,
    s.workspace_template_id,
    s.template_name_snapshot
  INTO v_sess
  FROM public.checklist_fill_sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_sess.workspace_template_id IS NOT NULL THEN
    v_origin := 'workspace';
    v_source_id := v_sess.workspace_template_id;
    SELECT name, NULL::text, NULL::text, version
      INTO v_name, v_portaria, v_uf, v_version
    FROM public.checklist_workspace_templates
    WHERE id = v_source_id;
  ELSIF v_sess.custom_template_id IS NOT NULL THEN
    v_origin := 'custom';
    v_source_id := v_sess.custom_template_id;
    SELECT ct.name, src.portaria_ref, src.uf, 1
      INTO v_name, v_portaria, v_uf, v_version
    FROM public.checklist_custom_templates ct
    LEFT JOIN public.checklist_templates src ON src.id = ct.source_template_id
    WHERE ct.id = v_source_id;
  ELSE
    v_origin := 'system';
    v_source_id := v_sess.template_id;
    SELECT name, portaria_ref, uf, version
      INTO v_name, v_portaria, v_uf, v_version
    FROM public.checklist_templates
    WHERE id = v_source_id;
  END IF;

  v_name := coalesce(
    nullif(btrim(v_name), ''),
    nullif(btrim(v_sess.template_name_snapshot), ''),
    'Checklist'
  );

  INSERT INTO public.checklist_fill_snapshots (
    session_id,
    template_origin,
    source_template_id,
    name,
    portaria_ref,
    uf,
    version
  ) VALUES (
    p_session_id,
    v_origin,
    v_source_id,
    v_name,
    v_portaria,
    v_uf,
    v_version
  )
  RETURNING id INTO v_snap_id;

  -- ── Seções + itens do catálogo (se ainda existirem) ──────────────────────
  IF v_origin = 'workspace' AND v_source_id IS NOT NULL THEN
    FOR v_sec IN
      SELECT id, title, position
      FROM public.checklist_workspace_sections
      WHERE workspace_template_id = v_source_id
      ORDER BY position, id
    LOOP
      INSERT INTO public.checklist_fill_snapshot_sections (
        snapshot_id, source_section_id, title, position
      ) VALUES (
        v_snap_id, v_sec.id, v_sec.title, v_sec.position
      )
      RETURNING id INTO v_sec_id;

      FOR v_item IN
        SELECT
          i.id,
          i.description,
          i.is_required,
          coalesce(i.is_structure_only, false) AS is_structure_only,
          coalesce(i.peso, 1) AS peso,
          i.position,
          i.archived_at
        FROM public.checklist_workspace_items i
        WHERE i.workspace_section_id = v_sec.id
          AND (
            v_mode = 'backfill'
            OR i.archived_at IS NULL
          )
          AND (
            v_mode = 'create'
            OR i.archived_at IS NULL
            OR i.archived_at >= v_sess.created_at
            OR EXISTS (
              SELECT 1
              FROM public.checklist_fill_item_responses r
              WHERE r.session_id = p_session_id
                AND r.workspace_item_id = i.id
            )
          )
        ORDER BY i.position, i.id
      LOOP
        INSERT INTO public.checklist_fill_snapshot_items (
          snapshot_id,
          snapshot_section_id,
          source_item_id,
          description,
          is_required,
          is_structure_only,
          peso,
          position,
          archived_at
        ) VALUES (
          v_snap_id,
          v_sec_id,
          v_item.id,
          v_item.description,
          v_item.is_required,
          v_item.is_structure_only,
          v_item.peso,
          v_item.position,
          v_item.archived_at
        )
        ON CONFLICT (snapshot_id, source_item_id) DO NOTHING;
      END LOOP;
    END LOOP;

  ELSIF v_origin = 'custom' AND v_source_id IS NOT NULL THEN
    FOR v_sec IN
      SELECT id, title, position
      FROM public.checklist_custom_sections
      WHERE custom_template_id = v_source_id
      ORDER BY position, id
    LOOP
      INSERT INTO public.checklist_fill_snapshot_sections (
        snapshot_id, source_section_id, title, position
      ) VALUES (
        v_snap_id, v_sec.id, v_sec.title, v_sec.position
      )
      RETURNING id INTO v_sec_id;

      FOR v_item IN
        SELECT
          i.id,
          i.description,
          i.is_required,
          coalesce(i.is_structure_only, false) AS is_structure_only,
          coalesce(i.peso, 1) AS peso,
          i.position,
          i.archived_at
        FROM public.checklist_custom_items i
        WHERE i.custom_section_id = v_sec.id
          AND (
            v_mode = 'backfill'
            OR i.archived_at IS NULL
          )
          AND (
            v_mode = 'create'
            OR i.archived_at IS NULL
            OR i.archived_at >= v_sess.created_at
            OR EXISTS (
              SELECT 1
              FROM public.checklist_fill_item_responses r
              WHERE r.session_id = p_session_id
                AND r.custom_item_id = i.id
            )
          )
        ORDER BY i.position, i.id
      LOOP
        INSERT INTO public.checklist_fill_snapshot_items (
          snapshot_id,
          snapshot_section_id,
          source_item_id,
          description,
          is_required,
          is_structure_only,
          peso,
          position,
          archived_at
        ) VALUES (
          v_snap_id,
          v_sec_id,
          v_item.id,
          v_item.description,
          v_item.is_required,
          v_item.is_structure_only,
          v_item.peso,
          v_item.position,
          v_item.archived_at
        )
        ON CONFLICT (snapshot_id, source_item_id) DO NOTHING;
      END LOOP;
    END LOOP;

  ELSIF v_origin = 'system' AND v_source_id IS NOT NULL THEN
    FOR v_sec IN
      SELECT id, title, position
      FROM public.checklist_template_sections
      WHERE template_id = v_source_id
      ORDER BY position, id
    LOOP
      INSERT INTO public.checklist_fill_snapshot_sections (
        snapshot_id, source_section_id, title, position
      ) VALUES (
        v_snap_id, v_sec.id, v_sec.title, v_sec.position
      )
      RETURNING id INTO v_sec_id;

      FOR v_item IN
        SELECT
          i.id,
          i.description,
          i.is_required,
          coalesce(i.is_structure_only, false) AS is_structure_only,
          coalesce(i.peso, 1) AS peso,
          i.position,
          i.archived_at
        FROM public.checklist_template_items i
        WHERE i.section_id = v_sec.id
          AND (
            v_mode = 'backfill'
            OR i.archived_at IS NULL
          )
          AND (
            v_mode = 'create'
            OR i.archived_at IS NULL
            OR i.archived_at >= v_sess.created_at
            OR EXISTS (
              SELECT 1
              FROM public.checklist_fill_item_responses r
              WHERE r.session_id = p_session_id
                AND r.template_item_id = i.id
            )
          )
        ORDER BY i.position, i.id
      LOOP
        INSERT INTO public.checklist_fill_snapshot_items (
          snapshot_id,
          snapshot_section_id,
          source_item_id,
          description,
          is_required,
          is_structure_only,
          peso,
          position,
          archived_at
        ) VALUES (
          v_snap_id,
          v_sec_id,
          v_item.id,
          v_item.description,
          v_item.is_required,
          v_item.is_structure_only,
          v_item.peso,
          v_item.position,
          v_item.archived_at
        )
        ON CONFLICT (snapshot_id, source_item_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;

  -- ── Itens órfãos (resposta sem item no catálogo) ─────────────────────────
  IF v_mode = 'backfill' THEN
    -- Secção sintética se necessário
    SELECT id INTO v_sec_id
    FROM public.checklist_fill_snapshot_sections
    WHERE snapshot_id = v_snap_id
      AND source_section_id IS NULL
      AND title = 'Itens preservados'
    LIMIT 1;

    IF v_sec_id IS NULL
       AND EXISTS (
         SELECT 1
         FROM public.checklist_fill_item_responses r
         WHERE r.session_id = p_session_id
           AND NOT EXISTS (
             SELECT 1
             FROM public.checklist_fill_snapshot_items si
             WHERE si.snapshot_id = v_snap_id
               AND si.source_item_id = coalesce(
                 r.template_item_id,
                 r.custom_item_id,
                 r.workspace_item_id
               )
           )
       )
    THEN
      INSERT INTO public.checklist_fill_snapshot_sections (
        snapshot_id, source_section_id, title, position
      ) VALUES (
        v_snap_id,
        NULL,
        'Itens preservados',
        9999
      )
      RETURNING id INTO v_sec_id;
    END IF;

    IF v_sec_id IS NOT NULL THEN
      INSERT INTO public.checklist_fill_snapshot_items (
        snapshot_id,
        snapshot_section_id,
        source_item_id,
        description,
        is_required,
        is_structure_only,
        peso,
        position,
        archived_at
      )
      SELECT
        v_snap_id,
        v_sec_id,
        coalesce(r.template_item_id, r.custom_item_id, r.workspace_item_id),
        'Item removido do modelo',
        false,
        false,
        1,
        0,
        now()
      FROM public.checklist_fill_item_responses r
      WHERE r.session_id = p_session_id
        AND coalesce(r.template_item_id, r.custom_item_id, r.workspace_item_id) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.checklist_fill_snapshot_items si
          WHERE si.snapshot_id = v_snap_id
            AND si.source_item_id = coalesce(
              r.template_item_id,
              r.custom_item_id,
              r.workspace_item_id
            )
        )
      ON CONFLICT (snapshot_id, source_item_id) DO NOTHING;
    END IF;
  END IF;

  -- Sessão sem nenhuma seção (modelo já apagado e sem respostas): cabeçalho basta
  IF NOT EXISTS (
    SELECT 1 FROM public.checklist_fill_snapshot_sections WHERE snapshot_id = v_snap_id
  ) THEN
    INSERT INTO public.checklist_fill_snapshot_sections (
      snapshot_id, source_section_id, title, position
    ) VALUES (
      v_snap_id, NULL, 'Geral', 0
    );
  END IF;

  RETURN v_snap_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_checklist_fill_session_snapshot(uuid, text) IS
  'Cria o snapshot da sessão se ainda não existir. create=itens ativos; backfill=histórico.';

GRANT EXECUTE ON FUNCTION public.ensure_checklist_fill_session_snapshot(uuid, text)
  TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Trigger: snapshot automático em novos preenchimentos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.checklist_fill_sessions_create_snapshot_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_checklist_fill_session_snapshot(NEW.id, 'create');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checklist_fill_sessions_create_snapshot_ai
  ON public.checklist_fill_sessions;

CREATE TRIGGER checklist_fill_sessions_create_snapshot_ai
  AFTER INSERT ON public.checklist_fill_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.checklist_fill_sessions_create_snapshot_ai();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Backfill de sessões existentes
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id
    FROM public.checklist_fill_sessions
    WHERE id NOT IN (SELECT session_id FROM public.checklist_fill_snapshots)
    ORDER BY created_at
  LOOP
    PERFORM public.ensure_checklist_fill_session_snapshot(r.id, 'backfill');
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Remover FKs RESTRICT/CASCADE dos itens nas respostas/fotos
--    (mantém as colunas como UUID de linhagem = source_item_id do snapshot)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_template_item_id_fkey;
ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_custom_item_id_fkey;
ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_workspace_item_id_fkey;

ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_template_item_id_fkey;
ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_custom_item_id_fkey;
ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_workspace_item_id_fkey;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Sessão: FKs de template passam a SET NULL (modelo pode ser apagado)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.checklist_fill_sessions
  DROP CONSTRAINT IF EXISTS checklist_fill_sessions_template_id_fkey;
ALTER TABLE public.checklist_fill_sessions
  DROP CONSTRAINT IF EXISTS checklist_fill_sessions_custom_template_id_fkey;
ALTER TABLE public.checklist_fill_sessions
  DROP CONSTRAINT IF EXISTS checklist_fill_sessions_workspace_template_id_fkey;

ALTER TABLE public.checklist_fill_sessions
  ADD CONSTRAINT checklist_fill_sessions_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.checklist_templates (id)
  ON DELETE SET NULL;

ALTER TABLE public.checklist_fill_sessions
  ADD CONSTRAINT checklist_fill_sessions_custom_template_id_fkey
  FOREIGN KEY (custom_template_id)
  REFERENCES public.checklist_custom_templates (id)
  ON DELETE SET NULL;

ALTER TABLE public.checklist_fill_sessions
  ADD CONSTRAINT checklist_fill_sessions_workspace_template_id_fkey
  FOREIGN KEY (workspace_template_id)
  REFERENCES public.checklist_workspace_templates (id)
  ON DELETE SET NULL;

-- Permite sessão sem FK de catálogo (histórico só via snapshot)
ALTER TABLE public.checklist_fill_sessions
  DROP CONSTRAINT IF EXISTS checklist_fill_sessions_one_template;

ALTER TABLE public.checklist_fill_sessions
  ADD CONSTRAINT checklist_fill_sessions_one_template CHECK (
    (
      template_id IS NOT NULL
      AND custom_template_id IS NULL
      AND workspace_template_id IS NULL
    )
    OR (
      template_id IS NULL
      AND custom_template_id IS NOT NULL
      AND workspace_template_id IS NULL
    )
    OR (
      template_id IS NULL
      AND custom_template_id IS NULL
      AND workspace_template_id IS NOT NULL
    )
    OR (
      template_id IS NULL
      AND custom_template_id IS NULL
      AND workspace_template_id IS NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Score usa pesos do snapshot (fallback ao catálogo se snapshot incompleto)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_and_store_session_score(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earned numeric(10, 2);
  v_total  numeric(10, 2);
  v_pct    numeric(5, 2);
  v_origin text;
  v_has_snap boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.checklist_fill_snapshots WHERE session_id = p_session_id
  ) INTO v_has_snap;

  IF v_has_snap THEN
    SELECT
      coalesce(sum(CASE WHEN r.outcome = 'conforme' THEN si.peso ELSE 0 END), 0),
      coalesce(sum(CASE WHEN r.outcome != 'na' THEN si.peso ELSE 0 END), 0)
    INTO v_earned, v_total
    FROM public.checklist_fill_item_responses r
    JOIN public.checklist_fill_snapshots snap ON snap.session_id = r.session_id
    JOIN public.checklist_fill_snapshot_items si
      ON si.snapshot_id = snap.id
     AND si.source_item_id = coalesce(
       r.template_item_id,
       r.custom_item_id,
       r.workspace_item_id
     )
    WHERE r.session_id = p_session_id
      AND coalesce(si.is_structure_only, false) = false;
  ELSE
    SELECT CASE
             WHEN custom_template_id IS NOT NULL THEN 'custom'
             WHEN workspace_template_id IS NOT NULL THEN 'workspace'
             ELSE 'global'
           END
      INTO v_origin
    FROM public.checklist_fill_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
      RETURN;
    END IF;

    IF v_origin = 'custom' THEN
      SELECT
        coalesce(sum(CASE WHEN r.outcome = 'conforme' THEN i.peso ELSE 0 END), 0),
        coalesce(sum(CASE WHEN r.outcome != 'na' THEN i.peso ELSE 0 END), 0)
      INTO v_earned, v_total
      FROM public.checklist_fill_item_responses r
      JOIN public.checklist_custom_items i ON i.id = r.custom_item_id
      WHERE r.session_id = p_session_id
        AND r.custom_item_id IS NOT NULL
        AND coalesce(i.is_structure_only, false) = false;
    ELSIF v_origin = 'workspace' THEN
      SELECT
        coalesce(sum(CASE WHEN r.outcome = 'conforme' THEN i.peso ELSE 0 END), 0),
        coalesce(sum(CASE WHEN r.outcome != 'na' THEN i.peso ELSE 0 END), 0)
      INTO v_earned, v_total
      FROM public.checklist_fill_item_responses r
      JOIN public.checklist_workspace_items i ON i.id = r.workspace_item_id
      WHERE r.session_id = p_session_id
        AND r.workspace_item_id IS NOT NULL
        AND coalesce(i.is_structure_only, false) = false;
    ELSE
      SELECT
        coalesce(sum(CASE WHEN r.outcome = 'conforme' THEN i.peso ELSE 0 END), 0),
        coalesce(sum(CASE WHEN r.outcome != 'na' THEN i.peso ELSE 0 END), 0)
      INTO v_earned, v_total
      FROM public.checklist_fill_item_responses r
      JOIN public.checklist_template_items i ON i.id = r.template_item_id
      WHERE r.session_id = p_session_id
        AND r.template_item_id IS NOT NULL
        AND coalesce(i.is_structure_only, false) = false;
    END IF;
  END IF;

  IF v_total > 0 THEN
    v_pct := round((v_earned / v_total) * 100, 2);
  ELSE
    v_pct := NULL;
  END IF;

  UPDATE public.checklist_fill_sessions
  SET
    score_percentage = v_pct,
    score_points_earned = v_earned,
    score_points_total = v_total
  WHERE id = p_session_id;
END;
$$;
