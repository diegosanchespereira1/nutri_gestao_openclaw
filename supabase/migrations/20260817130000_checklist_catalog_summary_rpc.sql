-- Catálogo ativo em 1 query (metadados + contagens), evita varrer itens no app.

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
      WHERE NOT COALESCE(i.is_structure_only, false)
    ) AS total_item_count,
    COUNT(i.id) FILTER (
      WHERE i.is_required AND NOT COALESCE(i.is_structure_only, false)
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
