-- Soft-delete de itens de checklist: excluir no editor arquiva (archived_at),
-- preservando FKs e o histórico de preenchimentos já aplicados.

ALTER TABLE public.checklist_template_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.checklist_custom_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.checklist_workspace_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.checklist_template_items.archived_at IS
  'Quando preenchido, o item foi removido do modelo ativo; histórico de fills continua válido.';

COMMENT ON COLUMN public.checklist_custom_items.archived_at IS
  'Quando preenchido, o item foi removido do modelo ativo; histórico de fills continua válido.';

COMMENT ON COLUMN public.checklist_workspace_items.archived_at IS
  'Quando preenchido, o item foi removido do modelo ativo; histórico de fills continua válido.';

CREATE INDEX IF NOT EXISTS checklist_template_items_section_active_idx
  ON public.checklist_template_items (section_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS checklist_custom_items_section_active_idx
  ON public.checklist_custom_items (custom_section_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS checklist_workspace_items_section_active_idx
  ON public.checklist_workspace_items (workspace_section_id, position)
  WHERE archived_at IS NULL;

-- Catálogo: contagens apenas de itens ativos (não arquivados).
CREATE OR REPLACE FUNCTION public.list_active_checklist_catalog_summary()
RETURNS TABLE (
  id uuid,
  name text,
  portaria_ref text,
  uf text,
  applies_to text[],
  description text,
  version integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  total_item_count bigint,
  required_item_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.portaria_ref,
    t.uf,
    t.applies_to,
    t.description,
    t.version,
    t.is_active,
    t.created_at,
    t.updated_at,
    COUNT(i.id) FILTER (
      WHERE i.archived_at IS NULL
        AND NOT COALESCE(i.is_structure_only, false)
    ) AS total_item_count,
    COUNT(i.id) FILTER (
      WHERE i.archived_at IS NULL
        AND i.is_required
        AND NOT COALESCE(i.is_structure_only, false)
    ) AS required_item_count
  FROM public.checklist_templates t
  LEFT JOIN public.checklist_template_sections s ON s.template_id = t.id
  LEFT JOIN public.checklist_template_items i ON i.section_id = s.id
  WHERE t.is_active = true
  GROUP BY t.id
  ORDER BY t.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_checklist_catalog_summary()
  TO authenticated, service_role;
