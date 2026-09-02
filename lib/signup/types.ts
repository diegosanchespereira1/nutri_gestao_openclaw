export type SignupPersonKind = "pf" | "pj";

export type SignupBillingInterval = "month" | "year";

export type SignupIntentStatus =
  | "dados"
  | "plano"
  | "checkout"
  | "abandonado"
  | "pago"
  | "conta_criada";

export type SignupCheckoutKind = "free" | "stripe" | "sales";

export type SignupLeadInput = {
  personKind: SignupPersonKind;
  fullName: string;
  legalName: string;
  responsibleName: string;
  email: string;
  phone: string;
  document: string;
  password: string;
  confirmPassword: string;
};

export type SignupLeadParsed = {
  personKind: SignupPersonKind;
  fullName: string | null;
  legalName: string | null;
  responsibleName: string | null;
  email: string;
  phone: string;
  documentKind: "cpf" | "cnpj";
  documentId: string;
  password: string;
};

export type PublicSignupPlan = {
  slug: string;
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  priceAnnualCents: number | null;
  maxClients: number;
  maxEstablishments: number;
  maxTeamMembers: number;
  maxPatients: number;
  featurePortalExterno: boolean;
  featurePdfExport: boolean;
  featureCsvImport: boolean;
  checkoutKind: SignupCheckoutKind;
  annualAvailable: boolean;
  /** Só dígitos com DDI; usado no CTA Enterprise. */
  salesWhatsapp: string | null;
};

export type SignupIntentRow = {
  id: string;
  status: SignupIntentStatus;
  person_kind: SignupPersonKind;
  full_name: string | null;
  legal_name: string | null;
  responsible_name: string | null;
  email: string;
  phone: string;
  document_kind: "cpf" | "cnpj";
  document_id: string;
  password_cipher: string | null;
  plan_slug: string | null;
  billing_interval: SignupBillingInterval | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  checkout_expires_at: string | null;
  abandoned_at: string | null;
  notified_at: string | null;
  paid_at: string | null;
  created_user_id: string | null;
  confirmation_email_sent_at: string | null;
  last_error: string | null;
  created_at: string;
};
