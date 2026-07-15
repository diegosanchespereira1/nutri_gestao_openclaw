-- Sessões de checklist preenchidas podem ser editadas mesmo com dossiê aprovado.
-- Histórico de preenchimentos não deve ser apagado ao excluir/editar o modelo original:
-- FKs de respostas/fotos passam de CASCADE para RESTRICT; nome do modelo fica em snapshot.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Remover imutabilidade (triggers FR70)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS checklist_fill_item_responses_block_if_approved_ins
  ON public.checklist_fill_item_responses;
DROP TRIGGER IF EXISTS checklist_fill_item_responses_block_if_approved_upd
  ON public.checklist_fill_item_responses;
DROP TRIGGER IF EXISTS checklist_fill_item_responses_block_if_approved_del
  ON public.checklist_fill_item_responses;

DROP TRIGGER IF EXISTS checklist_fill_item_photos_block_if_approved_ins
  ON public.checklist_fill_item_photos;
DROP TRIGGER IF EXISTS checklist_fill_item_photos_block_if_approved_upd
  ON public.checklist_fill_item_photos;
DROP TRIGGER IF EXISTS checklist_fill_item_photos_block_if_approved_del
  ON public.checklist_fill_item_photos;

DROP FUNCTION IF EXISTS public.checklist_fill_block_mutations_if_dossier_approved();

COMMENT ON COLUMN public.checklist_fill_sessions.dossier_approved_at IS
  'Quando preenchido, o dossiê foi aprovado (PDF/assinaturas). Respostas e fotos continuam editáveis.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Snapshot do nome do modelo na sessão (histórico independente do catálogo)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.checklist_fill_sessions
  ADD COLUMN IF NOT EXISTS template_name_snapshot text;

COMMENT ON COLUMN public.checklist_fill_sessions.template_name_snapshot IS
  'Nome do modelo no momento da criação da sessão; usado no histórico se o modelo for arquivado/excluído.';

-- Backfill a partir dos templates ainda existentes
UPDATE public.checklist_fill_sessions s
SET template_name_snapshot = t.name
FROM public.checklist_templates t
WHERE s.template_id = t.id
  AND (s.template_name_snapshot IS NULL OR btrim(s.template_name_snapshot) = '');

UPDATE public.checklist_fill_sessions s
SET template_name_snapshot = ct.name
FROM public.checklist_custom_templates ct
WHERE s.custom_template_id = ct.id
  AND (s.template_name_snapshot IS NULL OR btrim(s.template_name_snapshot) = '');

UPDATE public.checklist_fill_sessions s
SET template_name_snapshot = wt.name
FROM public.checklist_workspace_templates wt
WHERE s.workspace_template_id = wt.id
  AND (s.template_name_snapshot IS NULL OR btrim(s.template_name_snapshot) = '');

UPDATE public.checklist_fill_sessions
SET template_name_snapshot = 'Checklist'
WHERE template_name_snapshot IS NULL OR btrim(template_name_snapshot) = '';

CREATE OR REPLACE FUNCTION public.checklist_fill_sessions_set_template_name_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.template_name_snapshot IS NOT NULL AND btrim(NEW.template_name_snapshot) <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.workspace_template_id IS NOT NULL THEN
    SELECT name INTO v_name
    FROM public.checklist_workspace_templates
    WHERE id = NEW.workspace_template_id;
  ELSIF NEW.custom_template_id IS NOT NULL THEN
    SELECT name INTO v_name
    FROM public.checklist_custom_templates
    WHERE id = NEW.custom_template_id;
  ELSIF NEW.template_id IS NOT NULL THEN
    SELECT name INTO v_name
    FROM public.checklist_templates
    WHERE id = NEW.template_id;
  END IF;

  NEW.template_name_snapshot := coalesce(nullif(btrim(v_name), ''), 'Checklist');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checklist_fill_sessions_set_template_name_snapshot_bi
  ON public.checklist_fill_sessions;

CREATE TRIGGER checklist_fill_sessions_set_template_name_snapshot_bi
  BEFORE INSERT ON public.checklist_fill_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.checklist_fill_sessions_set_template_name_snapshot();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Proteger respostas/fotos: não cascatear exclusão de itens do modelo
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_template_item_id_fkey;
ALTER TABLE public.checklist_fill_item_responses
  ADD CONSTRAINT checklist_fill_item_responses_template_item_id_fkey
  FOREIGN KEY (template_item_id)
  REFERENCES public.checklist_template_items (id)
  ON DELETE RESTRICT;

ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_custom_item_id_fkey;
ALTER TABLE public.checklist_fill_item_responses
  ADD CONSTRAINT checklist_fill_item_responses_custom_item_id_fkey
  FOREIGN KEY (custom_item_id)
  REFERENCES public.checklist_custom_items (id)
  ON DELETE RESTRICT;

ALTER TABLE public.checklist_fill_item_responses
  DROP CONSTRAINT IF EXISTS checklist_fill_item_responses_workspace_item_id_fkey;
ALTER TABLE public.checklist_fill_item_responses
  ADD CONSTRAINT checklist_fill_item_responses_workspace_item_id_fkey
  FOREIGN KEY (workspace_item_id)
  REFERENCES public.checklist_workspace_items (id)
  ON DELETE RESTRICT;

ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_template_item_id_fkey;
ALTER TABLE public.checklist_fill_item_photos
  ADD CONSTRAINT checklist_fill_item_photos_template_item_id_fkey
  FOREIGN KEY (template_item_id)
  REFERENCES public.checklist_template_items (id)
  ON DELETE RESTRICT;

ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_custom_item_id_fkey;
ALTER TABLE public.checklist_fill_item_photos
  ADD CONSTRAINT checklist_fill_item_photos_custom_item_id_fkey
  FOREIGN KEY (custom_item_id)
  REFERENCES public.checklist_custom_items (id)
  ON DELETE RESTRICT;

ALTER TABLE public.checklist_fill_item_photos
  DROP CONSTRAINT IF EXISTS checklist_fill_item_photos_workspace_item_id_fkey;
ALTER TABLE public.checklist_fill_item_photos
  ADD CONSTRAINT checklist_fill_item_photos_workspace_item_id_fkey
  FOREIGN KEY (workspace_item_id)
  REFERENCES public.checklist_workspace_items (id)
  ON DELETE RESTRICT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RPC batch: permitir edição com dossiê aprovado; recalcular score + invalidar hash
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
  v_was_approved boolean := false;
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

  -- Dossiê aprovado NÃO bloqueia edição; só marca para refresh de score/hash.
  v_was_approved := v_sess.dossier_approved_at IS NOT NULL;

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

    -- Aceita 'conforme' (app) e 'c' (legado); persiste sempre 'conforme'.
    IF v_outcome = 'c' THEN
      v_outcome := 'conforme';
    END IF;

    IF v_outcome NOT IN ('conforme', 'nc', 'na') THEN
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
  SET
    updated_at = now(),
    document_hash = CASE WHEN v_was_approved AND v_affected > 0 THEN NULL ELSE document_hash END
  WHERE id = p_session_id;

  IF v_was_approved AND v_affected > 0 THEN
    PERFORM public.calculate_and_store_session_score(p_session_id);

    UPDATE public.checklist_fill_pdf_exports
    SET superseded_at = now()
    WHERE session_id = p_session_id
      AND status = 'ready'
      AND superseded_at IS NULL;
  END IF;

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
