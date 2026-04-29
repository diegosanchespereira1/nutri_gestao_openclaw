export type ChecklistValidityAlertStatus = "vencido" | "proximo";

export type ChecklistValidityAlert = {
  responseId: string;
  sessionId: string;
  clientId: string;
  clientName: string;
  checklistName: string;
  validUntil: string;
  status: ChecklistValidityAlertStatus;
  daysToExpire: number;
};
