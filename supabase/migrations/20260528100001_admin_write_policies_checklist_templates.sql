-- Permite que admin e super_admin escrevam nas tabelas de templates globais de checklist.
-- Leitura já está coberta pelas políticas _select_authenticated existentes.

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- checklist_templates
CREATE POLICY "admin_can_insert_templates"
  ON public.checklist_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_update_templates"
  ON public.checklist_templates FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_delete_templates"
  ON public.checklist_templates FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

GRANT INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;

-- checklist_template_sections
CREATE POLICY "admin_can_insert_template_sections"
  ON public.checklist_template_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_update_template_sections"
  ON public.checklist_template_sections FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_delete_template_sections"
  ON public.checklist_template_sections FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

GRANT INSERT, UPDATE, DELETE ON public.checklist_template_sections TO authenticated;

-- checklist_template_items
CREATE POLICY "admin_can_insert_template_items"
  ON public.checklist_template_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_update_template_items"
  ON public.checklist_template_items FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_can_delete_template_items"
  ON public.checklist_template_items FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

GRANT INSERT, UPDATE, DELETE ON public.checklist_template_items TO authenticated;
