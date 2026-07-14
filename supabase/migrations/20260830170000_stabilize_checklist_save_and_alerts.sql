-- Estabilização do hot path de checklists:
-- 1) touch_session com SKIP LOCKED + flag de skip em batch
-- 2) RPC save_checklist_fill_responses_batch (1 transação)
-- 3) get_checklist_validity_alerts mais barata
-- 4) policies RLS InitPlan + SELECT unificada + drop índice duplicado

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Trigger touch_session: throttle + SKIP LOCKED + skip em batch
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.checklist_fill_touch_session_from_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  -- Batch RPC define checklist_fill.skip_touch=1 e actualiza a sessão uma vez no fim.
  IF coalesce(current_setting('checklist_fill.skip_touch', true), '') = '1' THEN
    IF tg_op = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF tg_op = 'DELETE' THEN
    sid := OLD.session_id;
  ELSE
    sid := NEW.session_id;
  END IF;

  UPDATE public.checklist_fill_sessions s
  SET updated_at = now()
  FROM (
    SELECT ss.id
    FROM public.checklist_fill_sessions ss
    WHERE ss.id = sid
      AND (
        ss.updated_at IS NULL
        OR ss.updated_at < now() - interval '5 seconds'
      )
    FOR UPDATE SKIP LOCKED
  ) locked
  WHERE s.id = locked.id;

  IF tg_op = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.checklist_fill_touch_session_from_response() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.checklist_fill_touch_session_from_response() FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) RPC batch save
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.save_checklist_fill_responses_batch(
  p_session_id uuid,
  p_item_source text,
  p_persist_mode text,
  p_entries jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sess record;
  v_entry jsonb;
  v_item_id uuid;
  v_outcome text;
  v_note text;
  v_annotation text;
  v_valid_until date;
  v_existing record;
  v_new_note text;
  v_new_annotation text;
  v_new_valid_until date;
  v_mode text;
  v_affected int := 0;
  v_expected_origin text;
BEGIN
  IF p_entries IS NULL
     OR jsonb_typeof(p_entries) <> 'array'
     OR jsonb_array_length(p_entries) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'affected', 0);
  END IF;

  IF p_item_source NOT IN ('global', 'custom', 'workspace') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tipo de item inválido.');
  END IF;

  v_mode := coalesce(nullif(trim(p_persist_mode), ''), 'full');
  IF v_mode NOT IN ('full', 'merge') THEN
    v_mode := 'full';
  END IF;

  SELECT
    s.id,
    s.template_id,
    s.custom_template_id,
    s.workspace_template_id,
    s.dossier_approved_at,
    s.establishment_id
  INTO v_sess
  FROM public.checklist_fill_sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rascunho não encontrado.');
  END IF;

  IF v_sess.dossier_approved_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error',
      'Dossiê já aprovado: não é possível alterar respostas (registro imutável, FR70).'
    );
  END IF;

  v_expected_origin := CASE
    WHEN v_sess.workspace_template_id IS NOT NULL THEN 'workspace'
    WHEN v_sess.custom_template_id IS NOT NULL THEN 'custom'
    ELSE 'global'
  END;

  IF v_expected_origin <> p_item_source THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tipo de item incompatível com a sessão.');
  END IF;

  PERFORM set_config('checklist_fill.skip_touch', '1', true);

  FOR v_entry IN
    SELECT value FROM jsonb_array_elements(p_entries)
  LOOP
    BEGIN
      v_item_id := (v_entry->>'item_id')::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;

    IF v_item_id IS NULL THEN
      CONTINUE;
    END IF;

    v_outcome := nullif(trim(coalesce(v_entry->>'outcome', '')), '');
    v_note := nullif(trim(coalesce(v_entry->>'note', '')), '');
    v_annotation := left(nullif(trim(coalesce(v_entry->>'annotation', '')), ''), 4000);
    BEGIN
      v_valid_until := nullif(trim(coalesce(v_entry->>'valid_until', '')), '')::date;
    EXCEPTION WHEN others THEN
      v_valid_until := NULL;
    END;

    IF v_outcome IS NULL THEN
      IF p_item_source = 'global' THEN
        DELETE FROM public.checklist_fill_item_responses
        WHERE session_id = p_session_id AND template_item_id = v_item_id;
      ELSIF p_item_source = 'custom' THEN
        DELETE FROM public.checklist_fill_item_responses
        WHERE session_id = p_session_id AND custom_item_id = v_item_id;
      ELSE
        DELETE FROM public.checklist_fill_item_responses
        WHERE session_id = p_session_id AND workspace_item_id = v_item_id;
      END IF;
      IF FOUND THEN
        v_affected := v_affected + 1;
      END IF;
      CONTINUE;
    END IF;

    IF v_outcome NOT IN ('c', 'nc', 'na') THEN
      CONTINUE;
    END IF;

    IF p_item_source = 'global' THEN
      SELECT id, note, item_annotation, valid_until
      INTO v_existing
      FROM public.checklist_fill_item_responses
      WHERE session_id = p_session_id AND template_item_id = v_item_id;
    ELSIF p_item_source = 'custom' THEN
      SELECT id, note, item_annotation, valid_until
      INTO v_existing
      FROM public.checklist_fill_item_responses
      WHERE session_id = p_session_id AND custom_item_id = v_item_id;
    ELSE
      SELECT id, note, item_annotation, valid_until
      INTO v_existing
      FROM public.checklist_fill_item_responses
      WHERE session_id = p_session_id AND workspace_item_id = v_item_id;
    END IF;

    IF FOUND THEN
      IF v_mode = 'full' THEN
        v_new_note := v_note;
        v_new_annotation := v_annotation;
        v_new_valid_until := coalesce(v_valid_until, v_existing.valid_until);
      ELSE
        IF v_outcome <> 'nc' THEN
          v_new_note := NULL;
        ELSIF v_note IS NOT NULL THEN
          v_new_note := v_note;
        ELSE
          v_new_note := nullif(trim(coalesce(v_existing.note, '')), '');
        END IF;

        IF v_annotation IS NOT NULL THEN
          v_new_annotation := v_annotation;
        ELSE
          v_new_annotation := nullif(trim(coalesce(v_existing.item_annotation, '')), '');
        END IF;

        v_new_valid_until := coalesce(v_valid_until, v_existing.valid_until);
      END IF;

      UPDATE public.checklist_fill_item_responses
      SET
        outcome = v_outcome,
        note = v_new_note,
        item_annotation = v_new_annotation,
        valid_until = v_new_valid_until
      WHERE id = v_existing.id;
      v_affected := v_affected + 1;
    ELSE
      IF v_mode = 'full' THEN
        v_new_note := v_note;
        v_new_annotation := v_annotation;
        v_new_valid_until := v_valid_until;
      ELSE
        IF v_outcome <> 'nc' THEN
          v_new_note := NULL;
        ELSE
          v_new_note := v_note;
        END IF;
        v_new_annotation := v_annotation;
        v_new_valid_until := v_valid_until;
      END IF;

      BEGIN
        INSERT INTO public.checklist_fill_item_responses (
          session_id,
          template_item_id,
          custom_item_id,
          workspace_item_id,
          outcome,
          note,
          item_annotation,
          valid_until
        ) VALUES (
          p_session_id,
          CASE WHEN p_item_source = 'global' THEN v_item_id ELSE NULL END,
          CASE WHEN p_item_source = 'custom' THEN v_item_id ELSE NULL END,
          CASE WHEN p_item_source = 'workspace' THEN v_item_id ELSE NULL END,
          v_outcome,
          v_new_note,
          v_new_annotation,
          v_new_valid_until
        );
      EXCEPTION
        WHEN unique_violation THEN
          IF p_item_source = 'global' THEN
            UPDATE public.checklist_fill_item_responses
            SET
              outcome = v_outcome,
              note = v_new_note,
              item_annotation = v_new_annotation,
              valid_until = v_new_valid_until
            WHERE session_id = p_session_id AND template_item_id = v_item_id;
          ELSIF p_item_source = 'custom' THEN
            UPDATE public.checklist_fill_item_responses
            SET
              outcome = v_outcome,
              note = v_new_note,
              item_annotation = v_new_annotation,
              valid_until = v_new_valid_until
            WHERE session_id = p_session_id AND custom_item_id = v_item_id;
          ELSE
            UPDATE public.checklist_fill_item_responses
            SET
              outcome = v_outcome,
              note = v_new_note,
              item_annotation = v_new_annotation,
              valid_until = v_new_valid_until
            WHERE session_id = p_session_id AND workspace_item_id = v_item_id;
          END IF;
      END;
      v_affected := v_affected + 1;
    END IF;
  END LOOP;

  UPDATE public.checklist_fill_sessions
  SET updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'affected', v_affected);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Não foi possível salvar.',
      'detail', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_checklist_fill_responses_batch(uuid, text, text, jsonb)
  TO authenticated;
REVOKE ALL ON FUNCTION public.save_checklist_fill_responses_batch(uuid, text, text, jsonb)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_checklist_fill_responses_batch(uuid, text, text, jsonb)
  FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Alertas de validade: predicados sem cast inútil + índice parcial
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS checklist_fill_sessions_establishment_approved_idx
  ON public.checklist_fill_sessions (establishment_id)
  WHERE dossier_approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS checklist_fill_item_responses_session_valid_until_idx
  ON public.checklist_fill_item_responses (session_id, valid_until)
  WHERE valid_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_checklist_validity_alerts(
  p_owner_user_id uuid,
  p_horizon date,
  p_past_cap date,
  p_limit int DEFAULT 48,
  p_client_id uuid DEFAULT NULL,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  response_id uuid,
  session_id uuid,
  client_id uuid,
  client_name text,
  checklist_name text,
  valid_until date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH owned_establishments AS (
    SELECT
      e.id AS establishment_id,
      c.id AS client_id,
      COALESCE(NULLIF(TRIM(c.trade_name), ''), c.legal_name) AS client_name
    FROM public.clients c
    INNER JOIN public.establishments e ON e.client_id = c.id
    WHERE c.owner_user_id = p_owner_user_id
      AND (p_client_id IS NULL OR c.id = p_client_id)
  ),
  approved_sessions AS (
    SELECT
      s.id AS session_id,
      s.establishment_id,
      s.template_id,
      s.custom_template_id,
      oe.client_id,
      oe.client_name
    FROM owned_establishments oe
    INNER JOIN public.checklist_fill_sessions s
      ON s.establishment_id = oe.establishment_id
     AND s.dossier_approved_at IS NOT NULL
  ),
  candidates AS (
    SELECT
      r.id AS response_id,
      ash.session_id,
      ash.client_id,
      ash.client_name,
      COALESCE(ct.name, ctt.name, 'Checklist') AS checklist_name,
      r.valid_until,
      CONCAT(
        ash.client_id::text, '|', ash.establishment_id::text, '|',
        CASE
          WHEN ash.template_id IS NOT NULL THEN 'template:' || ash.template_id::text
          WHEN ash.custom_template_id IS NOT NULL THEN 'custom:' || ash.custom_template_id::text
          ELSE 'session:' || ash.session_id::text
        END
      ) AS scope_key
    FROM approved_sessions ash
    INNER JOIN public.checklist_fill_item_responses r
      ON r.session_id = ash.session_id
     AND r.valid_until IS NOT NULL
     AND r.valid_until >= p_past_cap
     AND r.valid_until <= p_horizon
    LEFT JOIN public.checklist_templates ct ON ct.id = ash.template_id
    LEFT JOIN public.checklist_custom_templates ctt ON ctt.id = ash.custom_template_id
  ),
  latest AS (
    SELECT DISTINCT ON (scope_key)
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until
    FROM candidates
    ORDER BY scope_key, valid_until DESC
  ),
  ranked AS (
    SELECT
      response_id,
      session_id,
      client_id,
      client_name,
      checklist_name,
      valid_until,
      CASE WHEN valid_until < p_today THEN 0 ELSE 1 END AS bucket
    FROM latest
  ),
  vencidos AS (
    SELECT response_id, session_id, client_id, client_name, checklist_name, valid_until
    FROM ranked
    WHERE bucket = 0
    ORDER BY valid_until ASC
    LIMIT GREATEST(1, (p_limit + 1) / 2)
  ),
  proximos AS (
    SELECT response_id, session_id, client_id, client_name, checklist_name, valid_until
    FROM ranked
    WHERE bucket = 1
    ORDER BY valid_until ASC
    LIMIT GREATEST(1, p_limit / 2)
  ),
  combined AS (
    SELECT * FROM vencidos
    UNION ALL
    SELECT * FROM proximos
  )
  SELECT
    response_id,
    session_id,
    client_id,
    client_name,
    checklist_name,
    valid_until
  FROM combined
  ORDER BY
    CASE WHEN valid_until < p_today THEN 0 ELSE 1 END,
    valid_until ASC
  LIMIT GREATEST(1, p_limit);
$$;

GRANT EXECUTE ON FUNCTION public.get_checklist_validity_alerts(uuid, date, date, int, uuid, date)
  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS: SELECT unificada em sessions + Auth InitPlan em PDF settings
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "checklist_fill_sessions_select_own"
  ON public.checklist_fill_sessions;
DROP POLICY IF EXISTS "checklist_fill_sessions_select_establishment_owner"
  ON public.checklist_fill_sessions;

CREATE POLICY "checklist_fill_sessions_select_workspace"
  ON public.checklist_fill_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT public.workspace_member_user_ids())
    OR EXISTS (
      SELECT 1
      FROM public.establishments est
      JOIN public.clients cl ON cl.id = est.client_id
      WHERE est.id = checklist_fill_sessions.establishment_id
        AND cl.owner_user_id = (SELECT public.workspace_account_owner_id())
    )
  );

DROP POLICY IF EXISTS "owner_select_pdf_settings" ON public.checklist_pdf_settings;
DROP POLICY IF EXISTS "team_select_pdf_settings" ON public.checklist_pdf_settings;
DROP POLICY IF EXISTS "owner_upsert_pdf_settings" ON public.checklist_pdf_settings;
DROP POLICY IF EXISTS "owner_update_pdf_settings" ON public.checklist_pdf_settings;

CREATE POLICY "select_pdf_settings"
  ON public.checklist_pdf_settings
  FOR SELECT
  TO authenticated
  USING (
    workspace_owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.team_members
      WHERE team_members.owner_user_id = checklist_pdf_settings.workspace_owner_id
        AND team_members.member_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "owner_upsert_pdf_settings"
  ON public.checklist_pdf_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_owner_id = (SELECT auth.uid()));

CREATE POLICY "owner_update_pdf_settings"
  ON public.checklist_pdf_settings
  FOR UPDATE
  TO authenticated
  USING (workspace_owner_id = (SELECT auth.uid()))
  WITH CHECK (workspace_owner_id = (SELECT auth.uid()));

-- Índice duplicado (mesmo predicado em area_id)
DROP INDEX IF EXISTS public.checklist_fill_sessions_area_id_idx;

NOTIFY pgrst, 'reload schema';
