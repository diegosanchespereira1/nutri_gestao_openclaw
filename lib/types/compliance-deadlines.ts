export type EstablishmentComplianceDeadlineRow = {
  id: string;
  establishment_id: string;
  title: string;
  portaria_ref: string | null;
  checklist_template_id: string | null;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Linha enriquecida para o dashboard. */
export type ComplianceDashboardAlert = EstablishmentComplianceDeadlineRow & {
  establishment_name: string;
  client_id: string;
};
