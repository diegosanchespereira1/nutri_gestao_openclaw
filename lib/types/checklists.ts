import type { EstablishmentType } from "@/lib/types/establishments";

export type ChecklistTemplateRow = {
  id: string;
  name: string;
  portaria_ref: string;
  uf: string;
  applies_to: EstablishmentType[];
  description: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChecklistTemplateSectionRow = {
  id: string;
  template_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ChecklistTemplateItemRow = {
  id: string;
  section_id: string;
  description: string;
  is_required: boolean;
  position: number;
  created_at: string;
};

export type ChecklistTemplateItemView = ChecklistTemplateItemRow;

export type ChecklistTemplateSectionWithItems = ChecklistTemplateSectionRow & {
  items: ChecklistTemplateItemView[];
};

export type ChecklistTemplateWithSections = ChecklistTemplateRow & {
  sections: ChecklistTemplateSectionWithItems[];
  required_item_count: number;
  total_item_count: number;
};
